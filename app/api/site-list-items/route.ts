import { NextResponse, type NextRequest } from "next/server";
import createSupabaseServerClient from "../../../lib/supabase/server-client";
import createSupabaseServiceRoleClient from "../../../lib/supabase/service-role-client";

/**
 * GET /api/site-list-items?page=home
 * Returns all list items for the specified page, sorted by section_key + sort_order.
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
      .from("site_list_items")
      .select("id,page,section_key,sort_order,text_de,text_en,badge_de,badge_en,link_url,icon,icon_type")
      .eq("page", page)
      .order("section_key")
      .order("sort_order");
    if (error) {
      /* Table might not exist yet — return empty array so page still works */
      console.warn("[site-list-items GET] DB error:", error.message);
      return NextResponse.json([]);
    }
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.warn("[site-list-items GET] Unexpected error:", err);
    return NextResponse.json([]);
  }
}

/* ─── Helper: verify admin permissions ─── */

async function verifyAdmin(): Promise<{ userId: string } | NextResponse> {
  const authClient = await createSupabaseServerClient();
  const { data: authData } = await authClient.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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
  return { userId };
}

/**
 * PATCH /api/site-list-items
 * Admin-only. Supports multiple actions:
 *
 * Create: { action: "create", page, section_key, text_de, text_en, badge_de?, badge_en?, link_url?, icon?, icon_type? }
 * Update: { action: "update", id, text_de?, text_en?, badge_de?, badge_en?, link_url?, icon?, icon_type? }
 * Delete: { action: "delete", id }
 * Reorder: { action: "reorder", items: [{ id, sort_order }] }
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const auth = await verifyAdmin();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const body = await request.json();
  const { action } = body as { action: string };

  const supabase = createSupabaseServiceRoleClient();

  switch (action) {
    /* ── Create ── */
    case "create": {
      const { page, section_key, text_de, text_en, badge_de, badge_en, link_url, icon, icon_type } = body;
      if (!page || !section_key) {
        return NextResponse.json({ error: "Missing page or section_key" }, { status: 400 });
      }

      /* Determine next sort_order */
      const { data: lastItem } = await supabase
        .from("site_list_items")
        .select("sort_order")
        .eq("page", page)
        .eq("section_key", section_key)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextOrder = (lastItem?.sort_order ?? -1) + 1;

      const { data, error } = await supabase
        .from("site_list_items")
        .insert({
          page,
          section_key,
          sort_order: nextOrder,
          text_de: text_de ?? "",
          text_en: text_en ?? "",
          badge_de: badge_de ?? "",
          badge_en: badge_en ?? "",
          link_url: link_url ?? "",
          icon: icon ?? "",
          icon_type: icon_type ?? "preset",
          updated_by: userId,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, item: data });
    }

    /* ── Update ── */
    case "update": {
      const { id, ...fields } = body as Record<string, unknown>;
      if (!id) {
        return NextResponse.json({ error: "Missing id" }, { status: 400 });
      }

      /* Only allow updating specific fields */
      const allowedFields = ["text_de", "text_en", "badge_de", "badge_en", "link_url", "icon", "icon_type"];
      const updates: Record<string, unknown> = {
        updated_by: userId,
        updated_at: new Date().toISOString(),
      };
      for (const field of allowedFields) {
        if (fields[field] !== undefined) {
          updates[field] = fields[field];
        }
      }

      const { data, error } = await supabase
        .from("site_list_items")
        .update(updates)
        .eq("id", id as string)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, item: data });
    }

    /* ── Delete ── */
    case "delete": {
      const { id } = body as { id: string };
      if (!id) {
        return NextResponse.json({ error: "Missing id" }, { status: 400 });
      }

      const { error } = await supabase
        .from("site_list_items")
        .delete()
        .eq("id", id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, deleted: true });
    }

    /* ── Reorder ── */
    case "reorder": {
      const { items } = body as { items: Array<{ id: string; sort_order: number }> };
      if (!items || !Array.isArray(items)) {
        return NextResponse.json({ error: "Missing items array" }, { status: 400 });
      }

      /* Batch update sort_order for all provided items */
      const errors: string[] = [];
      for (const item of items) {
        const { error } = await supabase
          .from("site_list_items")
          .update({ sort_order: item.sort_order, updated_by: userId, updated_at: new Date().toISOString() })
          .eq("id", item.id);
        if (error) errors.push(`${item.id}: ${error.message}`);
      }

      if (errors.length > 0) {
        return NextResponse.json({ error: `Reorder partially failed: ${errors.join(", ")}` }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}
