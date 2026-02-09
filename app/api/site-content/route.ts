import { NextResponse, type NextRequest } from "next/server";
import createSupabaseServerClient from "../../../lib/supabase/server-client";
import createSupabaseServiceRoleClient from "../../../lib/supabase/service-role-client";

/**
 * GET /api/site-content?page=home
 * Returns all content rows for the specified page.
 * Public — no auth required.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
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
  /* Auth check */
  const authClient = await createSupabaseServerClient();
  const { data: authData } = await authClient.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  /* Admin check */
  const { data: adminFlag } = await authClient.rpc("is_any_admin");
  if (!adminFlag) {
    const { data: profileData } = await authClient
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .maybeSingle();
    if (!profileData?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await request.json();
  const { page, section_key, field_key, content_de, content_en, _delete } = body as Record<string, string | boolean>;
  if (!page || !section_key || !field_key) {
    return NextResponse.json({ error: "Missing required fields: page, section_key, field_key" }, { status: 400 });
  }

  const supabase = createSupabaseServiceRoleClient();

  /* Delete mode: remove the row entirely */
  if (_delete) {
    const { error } = await supabase
      .from("site_content")
      .delete()
      .eq("page", page as string)
      .eq("section_key", section_key as string)
      .eq("field_key", field_key as string);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, deleted: true });
  }

  /* Upsert mode: create or update */
  const { error } = await supabase
    .from("site_content")
    .upsert(
      {
        page,
        section_key,
        field_key,
        content_de: (content_de as string) ?? "",
        content_en: (content_en as string) ?? "",
        updated_by: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "page,section_key,field_key" }
    );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
