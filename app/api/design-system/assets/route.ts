import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { captureApiError } from "@/lib/api/logger";
import { apiError, escapeLikePattern } from "@/lib/api/validation";
import { requireAdmin } from "@/lib/api/require-admin";
import { requireAuth } from "@/lib/api/require-auth";
import createSupabaseServiceRoleClient from "@/lib/supabase/service-role-client";
import { standardLimiter, relaxedLimiter } from "@/lib/rate-limit";

/* ------------------------------------------------------------------ */
/*  Schemas                                                            */
/* ------------------------------------------------------------------ */

const assetsQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().max(200, "Search term too long.").optional(),
  limit: z.coerce.number().int().min(1).max(2500).default(200),
  offset: z.coerce.number().int().min(0).default(0),
});

const patchSchema = z.object({
  id: z.string().uuid(),
  category: z.string().max(64).optional(),
  tags: z.array(z.string().max(64)).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

/* ------------------------------------------------------------------ */
/*  GET /api/design-system/assets                                      */
/*  Query params: ?category=X&search=X&limit=100&offset=0             */
/* ------------------------------------------------------------------ */

export async function GET(request: NextRequest): Promise<NextResponse> {
  const blocked = relaxedLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const rawParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = assetsQuerySchema.safeParse(rawParams);
    if (!parsed.success) {
      return apiError("Invalid query parameters.", 400);
    }
    const { category, search, limit, offset } = parsed.data;

    const supabase = createSupabaseServiceRoleClient();
    let query = supabase
      .from("design_assets")
      .select("*", { count: "exact" })
      .order("category")
      .order("filename")
      .range(offset, offset + limit - 1);

    if (category && category !== "all") {
      query = query.eq("category", category);
    }
    if (search) {
      query = query.ilike("filename", `%${escapeLikePattern(search)}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      captureApiError("GET /api/design-system/assets", error);
      return apiError("Failed to load assets.", 500);
    }

    return NextResponse.json({ data: data ?? [], count: count ?? 0 });
  } catch (err) {
    captureApiError("GET /api/design-system/assets", err);
    return apiError("Internal server error.", 500);
  }
}

/* ------------------------------------------------------------------ */
/*  PATCH /api/design-system/assets                                    */
/*  Body: { id, category?, tags?, notes? }                             */
/* ------------------------------------------------------------------ */

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid input.", 400);
    }

    const { id, ...updates } = parsed.data;
    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase.from("design_assets").update(updates).eq("id", id).select().single();

    if (error) {
      captureApiError("PATCH /api/design-system/assets", error);
      return NextResponse.json({ error: "Failed to update asset." }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    captureApiError("PATCH /api/design-system/assets", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
