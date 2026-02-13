import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { captureApiError } from "@/lib/api/logger";
import { requireAdmin } from "@/lib/api/require-admin";
import createSupabaseServiceRoleClient from "@/lib/supabase/service-role-client";
import { standardLimiter, relaxedLimiter } from "@/lib/rate-limit";

/* ------------------------------------------------------------------ */
/*  Schemas                                                            */
/* ------------------------------------------------------------------ */

const RENDER_TYPES = ["css", "asset", "hybrid", "icon", "typography", "composite"] as const;

const createSchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().max(2000).optional(),
  category: z.string().min(1).max(64),
  subcategory: z.string().max(64).nullable().optional(),
  component_file: z.string().max(256).nullable().optional(),
  current_css: z.string().max(512).nullable().optional(),
  status: z.enum(["active", "planned", "deprecated"]).optional(),
  render_type: z.enum(RENDER_TYPES).optional(),
  preview_html: z.string().max(4000).nullable().optional(),
  preview_image: z.string().max(512).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

const patchSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(128).optional(),
  description: z.string().max(2000).nullable().optional(),
  category: z.string().min(1).max(64).optional(),
  subcategory: z.string().max(64).nullable().optional(),
  component_file: z.string().max(256).nullable().optional(),
  current_css: z.string().max(512).nullable().optional(),
  status: z.enum(["active", "planned", "deprecated"]).optional(),
  render_type: z.enum(RENDER_TYPES).optional(),
  preview_html: z.string().max(4000).nullable().optional(),
  preview_image: z.string().max(512).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
});

/* ------------------------------------------------------------------ */
/*  GET /api/design-system/ui-elements                                 */
/*  Query params: ?category=X&status=X&search=X                       */
/* ------------------------------------------------------------------ */

export async function GET(request: NextRequest): Promise<NextResponse> {
  const blocked = relaxedLimiter.check(request);
  if (blocked) return blocked;

  try {
    const params = request.nextUrl.searchParams;
    const category = params.get("category");
    const status = params.get("status");
    const renderType = params.get("render_type");
    const search = params.get("search");

    const supabase = createSupabaseServiceRoleClient();
    let query = supabase.from("ui_elements").select("*", { count: "exact" }).order("category").order("name");

    if (category && category !== "all") {
      query = query.eq("category", category);
    }
    if (status && status !== "all") {
      query = query.eq("status", status);
    }
    if (renderType && renderType !== "all") {
      query = query.eq("render_type", renderType);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      captureApiError("GET /api/design-system/ui-elements", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [], count: count ?? 0 });
  } catch (err) {
    captureApiError("GET /api/design-system/ui-elements", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  POST /api/design-system/ui-elements                                */
/*  Body: { name, description?, category, subcategory?, ... }          */
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
    const { data, error } = await supabase.from("ui_elements").insert(parsed.data).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    captureApiError("POST /api/design-system/ui-elements", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  PATCH /api/design-system/ui-elements                               */
/*  Body: { id, ...fields }                                            */
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
    const { data, error } = await supabase.from("ui_elements").update(updates).eq("id", id).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    captureApiError("PATCH /api/design-system/ui-elements", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  DELETE /api/design-system/ui-elements                              */
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
    const { error } = await supabase.from("ui_elements").delete().eq("id", parsed.data.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    captureApiError("DELETE /api/design-system/ui-elements", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
