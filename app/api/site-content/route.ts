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
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("site_content")
    .select("page,section_key,field_key,content_de,content_en")
    .eq("page", page);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
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
  const { page, section_key, field_key, content_de, content_en } = body as Record<string, string>;
  if (!page || !section_key || !field_key) {
    return NextResponse.json({ error: "Missing required fields: page, section_key, field_key" }, { status: 400 });
  }

  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .from("site_content")
    .upsert(
      {
        page,
        section_key,
        field_key,
        content_de: content_de ?? "",
        content_en: content_en ?? "",
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
