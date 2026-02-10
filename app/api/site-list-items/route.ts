import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import createSupabaseServerClient from "../../../lib/supabase/server-client";
import createSupabaseServiceRoleClient from "../../../lib/supabase/service-role-client";
import { standardLimiter } from "../../../lib/rate-limit";

const CREATE_ITEM_SCHEMA = z.object({
  action: z.literal("create"),
  page: z.string().min(1).max(64),
  section_key: z.string().min(1).max(128),
  text_de: z.string().max(5_000).optional(),
  text_en: z.string().max(5_000).optional(),
  badge_de: z.string().max(200).optional(),
  badge_en: z.string().max(200).optional(),
  link_url: z.string().max(2_000).optional(),
  icon: z.string().max(500).optional(),
  icon_type: z.enum(["preset", "custom"]).optional(),
});

const UPDATE_ITEM_SCHEMA = z.object({
  action: z.literal("update"),
  id: z.string().uuid(),
  text_de: z.string().max(5_000).optional(),
  text_en: z.string().max(5_000).optional(),
  badge_de: z.string().max(200).optional(),
  badge_en: z.string().max(200).optional(),
  link_url: z.string().max(2_000).optional(),
  icon: z.string().max(500).optional(),
  icon_type: z.enum(["preset", "custom"]).optional(),
});

const DELETE_ITEM_SCHEMA = z.object({
  action: z.literal("delete"),
  id: z.string().uuid(),
});

const REORDER_ITEMS_SCHEMA = z.object({
  action: z.literal("reorder"),
  items: z
    .array(z.object({ id: z.string().uuid(), sort_order: z.number().int().min(0) }))
    .min(1)
    .max(500),
});

const PATCH_SCHEMA = z.discriminatedUnion("action", [
  CREATE_ITEM_SCHEMA,
  UPDATE_ITEM_SCHEMA,
  DELETE_ITEM_SCHEMA,
  REORDER_ITEMS_SCHEMA,
]);

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
  /* Admin check — relies on simplified is_any_admin (user_roles only) */
  const { data: adminFlag } = await authClient.rpc("is_any_admin");
  if (!adminFlag) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;
  const auth = await verifyAdmin();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const parsed = PATCH_SCHEMA.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  const supabase = createSupabaseServiceRoleClient();

  switch (body.action) {
    /* ── Create ── */
    case "create": {
      const { page, section_key, text_de, text_en, badge_de, badge_en, link_url, icon, icon_type } = body;

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
      const { id, action: _a, ...fields } = body;

      const updates: Record<string, unknown> = {
        updated_by: userId,
        updated_at: new Date().toISOString(),
      };
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) {
          updates[key] = value;
        }
      }

      const { data, error } = await supabase.from("site_list_items").update(updates).eq("id", id).select().single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, item: data });
    }

    /* ── Delete ── */
    case "delete": {
      const { id } = body;

      const { error } = await supabase.from("site_list_items").delete().eq("id", id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, deleted: true });
    }

    /* ── Reorder ── */
    case "reorder": {
      const { items } = body;

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
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
