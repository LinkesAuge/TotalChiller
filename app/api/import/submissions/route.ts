import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { standardLimiter } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/api/require-auth";
import { apiError } from "@/lib/api/validation";
import { captureApiError } from "@/lib/api/logger";
import { SubmissionsQuerySchema } from "@/lib/api/import-schemas";

/**
 * GET /api/import/submissions — List submissions for a clan.
 * Supports filtering by status/type and cursor-free page-based pagination.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { supabase } = auth;

    const raw = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = SubmissionsQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return apiError("Invalid query parameters.", 400);
    }
    const { clan_id, status, type, page, per_page: perPage } = parsed.data;

    let query = supabase
      .from("data_submissions")
      .select("*", { count: "exact" })
      .eq("clan_id", clan_id)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }
    if (type) {
      query = query.eq("submission_type", type);
    }

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    query = query.range(from, to);

    const { data: submissions, error: queryError, count } = await query;

    if (queryError) {
      captureApiError("GET /api/import/submissions", queryError);
      return apiError("Failed to load submissions.", 500);
    }

    const userIds = [...new Set((submissions ?? []).map((s) => s.submitted_by))];
    let profileMap: Record<string, { id: string; display_name: string | null }> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", userIds);
      if (profiles) {
        for (const p of profiles) {
          profileMap[p.id] = p;
        }
      }
    }

    const linkedEventIds = [...new Set((submissions ?? []).map((s) => s.linked_event_id).filter(Boolean))] as string[];
    let eventDateMap: Record<string, { starts_at: string; ends_at: string }> = {};
    if (linkedEventIds.length > 0) {
      const { data: events } = await supabase.from("events").select("id, starts_at, ends_at").in("id", linkedEventIds);
      if (events) {
        for (const e of events) {
          eventDateMap[e.id] = { starts_at: e.starts_at, ends_at: e.ends_at };
        }
      }
    }

    const enriched = (submissions ?? []).map((s) => ({
      ...s,
      profiles: profileMap[s.submitted_by] ?? null,
      event_starts_at: s.linked_event_id ? (eventDateMap[s.linked_event_id]?.starts_at ?? null) : null,
      event_ends_at: s.linked_event_id ? (eventDateMap[s.linked_event_id]?.ends_at ?? null) : null,
    }));

    return NextResponse.json({
      data: {
        submissions: enriched,
        total: count ?? 0,
        page,
        perPage,
      },
    });
  } catch (err) {
    captureApiError("GET /api/import/submissions", err);
    return apiError("Internal server error.", 500);
  }
}
