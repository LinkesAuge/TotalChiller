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
      .select("*, profiles!submitted_by(id, display_name)", { count: "exact" })
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

    return NextResponse.json({
      data: {
        submissions: submissions ?? [],
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
