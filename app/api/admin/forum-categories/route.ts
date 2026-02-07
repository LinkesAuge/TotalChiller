import { NextResponse, type NextRequest } from "next/server";
import createSupabaseServerClient from "../../../../lib/supabase/server-client";
import createSupabaseServiceRoleClient from "../../../../lib/supabase/service-role-client";

/* ─── Helpers ─── */

async function requireAdmin(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>): Promise<
  { userId: string; error?: undefined } | { error: NextResponse; userId?: undefined }
> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const { data: isAdmin } = await supabase.rpc("is_any_admin");
  if (!isAdmin) {
    return { error: NextResponse.json({ error: "Forbidden: admin access required." }, { status: 403 }) };
  }
  return { userId: authData.user.id };
}

/* ─── GET ─── */

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const auth = await requireAdmin(supabase);
  if (auth.error) return auth.error;

  const clanId = request.nextUrl.searchParams.get("clan_id");
  if (!clanId) {
    return NextResponse.json({ error: "clan_id is required." }, { status: 400 });
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const { data, error } = await serviceClient
    .from("forum_categories")
    .select("*")
    .eq("clan_id", clanId)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data: data ?? [] });
}

/* ─── POST (create) ─── */

interface CreateBody {
  readonly clan_id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly sort_order: number;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const auth = await requireAdmin(supabase);
  if (auth.error) return auth.error;

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.clan_id || !body.name?.trim()) {
    return NextResponse.json({ error: "clan_id and name are required." }, { status: 400 });
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const { data, error } = await serviceClient
    .from("forum_categories")
    .insert({
      clan_id: body.clan_id,
      name: body.name.trim(),
      slug: body.slug?.trim() || body.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      description: body.description || null,
      sort_order: body.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}

/* ─── PATCH (update) ─── */

interface UpdateBody {
  readonly id: string;
  readonly name?: string;
  readonly slug?: string;
  readonly description?: string | null;
  readonly sort_order?: number;
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const auth = await requireAdmin(supabase);
  if (auth.error) return auth.error;

  let body: UpdateBody;
  try {
    body = (await request.json()) as UpdateBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.slug !== undefined) updates.slug = body.slug.trim();
  if (body.description !== undefined) updates.description = body.description || null;
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const { data, error } = await serviceClient
    .from("forum_categories")
    .update(updates)
    .eq("id", body.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}

/* ─── DELETE ─── */

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const auth = await requireAdmin(supabase);
  if (auth.error) return auth.error;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const { error } = await serviceClient
    .from("forum_categories")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
