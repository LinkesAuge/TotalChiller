import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "../../../lib/api/require-admin";
import createSupabaseServiceRoleClient from "../../../lib/supabase/service-role-client";
import { standardLimiter, relaxedLimiter } from "../../../lib/rate-limit";

const PATCH_SCHEMA = z.object({
  page: z.string().min(1).max(64),
  section_key: z.string().min(1).max(128),
  field_key: z.string().min(1).max(128),
  content_de: z.string().max(50_000).optional(),
  content_en: z.string().max(50_000).optional(),
  _delete: z.boolean().optional(),
});

/**
 * GET /api/site-content?page=home
 * Returns all content rows for the specified page.
 * Public — no auth required.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const blocked = relaxedLimiter.check(request);
  if (blocked) return blocked;
  const page = request.nextUrl.searchParams.get("page");
  if (!page) {
    return NextResponse.json({ error: "Missing ?page= parameter" }, { status: 400 });
  }
  try {
    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .from("site_content")
      .select("page,section_key,field_key,content_de,content_en")
      .eq("page", page);
    if (error) {
      /* Table might not exist yet — return empty array so page still works */
      console.warn("[site-content GET] DB error:", error.message);
      return NextResponse.json([]);
    }
    return NextResponse.json(data ?? []);
  } catch (err) {
    /* Graceful fallback — page will use translation file defaults */
    console.warn("[site-content GET] Unexpected error:", err);
    return NextResponse.json([]);
  }
}

/**
 * PATCH /api/site-content
 * Updates a single content field. Admin-only.
 * Body: { page, section_key, field_key, content_de, content_en }
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;
  /* Auth + admin check */
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const parsed = PATCH_SCHEMA.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const { page, section_key, field_key, content_de, content_en, _delete } = parsed.data;

  const supabase = createSupabaseServiceRoleClient();

  /* Delete mode: remove the row entirely */
  if (_delete) {
    const { error } = await supabase
      .from("site_content")
      .delete()
      .eq("page", page)
      .eq("section_key", section_key)
      .eq("field_key", field_key);
    if (error) {
      console.error("[site-content PATCH] Delete failed:", error.message);
      return NextResponse.json({ error: "Failed to delete content." }, { status: 500 });
    }
    return NextResponse.json({ data: { success: true, deleted: true } });
  }

  /* Upsert mode: create or update */
  const { error } = await supabase.from("site_content").upsert(
    {
      page,
      section_key,
      field_key,
      content_de: content_de ?? "",
      content_en: content_en ?? "",
      updated_by: auth.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "page,section_key,field_key" },
  );
  if (error) {
    console.error("[site-content PATCH] Upsert failed:", error.message);
    return NextResponse.json({ error: "Failed to save content." }, { status: 500 });
  }
  return NextResponse.json({ data: { success: true } });
}
