import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api/require-admin";
import createSupabaseServiceRoleClient from "@/lib/supabase/service-role-client";
import { standardLimiter, relaxedLimiter } from "@/lib/rate-limit";

/* ------------------------------------------------------------------ */
/*  Schemas                                                            */
/* ------------------------------------------------------------------ */

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
    const params = request.nextUrl.searchParams;
    const category = params.get("category");
    const search = params.get("search");
    const rawLimit = parseInt(params.get("limit") ?? "200", 10);
    const rawOffset = parseInt(params.get("offset") ?? "0", 10);
    const limit = Math.min(Number.isNaN(rawLimit) ? 200 : rawLimit, 2500);
    const offset = Number.isNaN(rawOffset) ? 0 : rawOffset;

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
      query = query.ilike("filename", `%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[design-assets GET]", error.message);
      return NextResponse.json({ error: "Failed to load assets." }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [], count: count ?? 0 });
  } catch (err) {
    console.error("[design-assets GET] Unexpected:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { id, ...updates } = parsed.data;
    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase.from("design_assets").update(updates).eq("id", id).select().single();

    if (error) {
      console.error("[design-assets PATCH]", error.message);
      return NextResponse.json({ error: "Failed to update asset." }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[design-assets PATCH] Unexpected:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
