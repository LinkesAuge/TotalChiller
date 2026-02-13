import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api/require-admin";
import createSupabaseServiceRoleClient from "@/lib/supabase/service-role-client";
import { standardLimiter, relaxedLimiter } from "@/lib/rate-limit";

/* ------------------------------------------------------------------ */
/*  Schemas                                                            */
/* ------------------------------------------------------------------ */

const createSchema = z.object({
  ui_element_id: z.string().uuid(),
  asset_id: z.string().uuid(),
  role: z.string().max(64).default("default"),
  notes: z.string().max(2000).nullable().optional(),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
});

/* ------------------------------------------------------------------ */
/*  GET /api/design-system/assignments                                 */
/*  Query params: ?ui_element_id=X or ?asset_id=X                     */
/* ------------------------------------------------------------------ */

export async function GET(request: NextRequest): Promise<NextResponse> {
  const blocked = relaxedLimiter.check(request);
  if (blocked) return blocked;

  try {
    const params = request.nextUrl.searchParams;
    const uiElementId = params.get("ui_element_id");
    const assetId = params.get("asset_id");

    const supabase = createSupabaseServiceRoleClient();
    let query = supabase
      .from("asset_assignments")
      .select(
        `
        *,
        design_assets:asset_id (id, filename, public_path, category),
        ui_elements:ui_element_id (id, name, category, subcategory)
      `,
      )
      .order("created_at", { ascending: false });

    if (uiElementId) {
      query = query.eq("ui_element_id", uiElementId);
    }
    if (assetId) {
      query = query.eq("asset_id", assetId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[assignments GET]", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("[assignments GET] Unexpected:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  POST /api/design-system/assignments                                */
/*  Body: { ui_element_id, asset_id, role?, notes? }                   */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .from("asset_assignments")
      .upsert(parsed.data, { onConflict: "ui_element_id,asset_id,role" })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("[assignments POST] Unexpected:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  DELETE /api/design-system/assignments                              */
/*  Body: { id }                                                       */
/* ------------------------------------------------------------------ */

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = createSupabaseServiceRoleClient();
    const { error } = await supabase.from("asset_assignments").delete().eq("id", parsed.data.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[assignments DELETE] Unexpected:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
