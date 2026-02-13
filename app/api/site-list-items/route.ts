import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { captureApiError } from "@/lib/api/logger";
import { apiError, sitePageQuerySchema } from "@/lib/api/validation";
import { requireAdmin } from "../../../lib/api/require-admin";
import createSupabaseServiceRoleClient from "../../../lib/supabase/service-role-client";
import { standardLimiter, relaxedLimiter } from "../../../lib/rate-limit";

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
  const blocked = relaxedLimiter.check(request);
  if (blocked) return blocked;
  const rawParams = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = sitePageQuerySchema.safeParse(rawParams);
  if (!parsed.success) {
    return apiError("Invalid query parameters.", 400);
  }
  const { page } = parsed.data;
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
    const response = NextResponse.json(data ?? []);
    response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return response;
  } catch (err) {
    console.warn("[site-list-items GET] Unexpected error:", err);
    return NextResponse.json([]);
  }
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
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
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
        console.error("[site-list-items PATCH create]", error.message);
        return NextResponse.json({ error: "Failed to create item." }, { status: 500 });
      }
      return NextResponse.json({ data: { success: true, item: data } });
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
        console.error("[site-list-items PATCH update]", error.message);
        return NextResponse.json({ error: "Failed to update item." }, { status: 500 });
      }
      return NextResponse.json({ data: { success: true, item: data } });
    }

    /* ── Delete ── */
    case "delete": {
      const { id } = body;

      const { error } = await supabase.from("site_list_items").delete().eq("id", id);

      if (error) {
        console.error("[site-list-items PATCH delete]", error.message);
        return NextResponse.json({ error: "Failed to delete item." }, { status: 500 });
      }
      return NextResponse.json({ data: { success: true, deleted: true } });
    }

    /* ── Reorder ── */
    case "reorder": {
      const { items } = body;

      /* Batch update sort_order for all provided items */
      const now = new Date().toISOString();
      const results = await Promise.all(
        items.map((item) =>
          supabase
            .from("site_list_items")
            .update({ sort_order: item.sort_order, updated_by: userId, updated_at: now })
            .eq("id", item.id),
        ),
      );
      let failCount = 0;
      for (const result of results) {
        if (result.error) {
          captureApiError("PATCH /api/site-list-items", result.error);
          failCount++;
        }
      }

      if (failCount > 0) {
        return NextResponse.json({ error: `Reorder partially failed (${failCount} items).` }, { status: 500 });
      }
      return NextResponse.json({ data: { success: true } });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
