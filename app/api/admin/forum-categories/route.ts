import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { captureApiError } from "@/lib/api/logger";
import createSupabaseServiceRoleClient from "../../../../lib/supabase/service-role-client";
import { strictLimiter } from "../../../../lib/rate-limit";
import { requireAdmin } from "../../../../lib/api/require-admin";

/* ─── Schemas ─── */

const UUID_SCHEMA = z.string().uuid();

const CREATE_CATEGORY_SCHEMA = z.object({
  clan_id: z.string().uuid(),
  name: z.string().trim().min(1),
  slug: z.string().trim().optional(),
  description: z.string().nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
});

const UPDATE_CATEGORY_SCHEMA = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).optional(),
  slug: z.string().trim().optional(),
  description: z.string().nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
});

/* ─── GET ─── */

export async function GET(request: NextRequest): Promise<NextResponse> {
  const blocked = strictLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const clanId = request.nextUrl.searchParams.get("clan_id");
    if (!clanId || !UUID_SCHEMA.safeParse(clanId).success) {
      return NextResponse.json({ error: "A valid clan_id is required." }, { status: 400 });
    }

    const serviceClient = createSupabaseServiceRoleClient();
    const { data, error } = await serviceClient
      .from("forum_categories")
      .select("*")
      .eq("clan_id", clanId)
      .order("name", { ascending: true });

    if (error) {
      captureApiError("GET /api/admin/forum-categories", error);
      return NextResponse.json({ error: "Failed to load categories." }, { status: 500 });
    }
    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    captureApiError("GET /api/admin/forum-categories", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/* ─── POST (create) ─── */

export async function POST(request: NextRequest): Promise<NextResponse> {
  const blocked = strictLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    const parsed = CREATE_CATEGORY_SCHEMA.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input.", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const body = parsed.data;

    if (body.slug !== undefined && body.slug !== "" && !/^[a-z0-9-]+$/.test(body.slug)) {
      return NextResponse.json(
        { error: "Slug must contain only lowercase letters, numbers, and hyphens." },
        { status: 400 },
      );
    }

    const serviceClient = createSupabaseServiceRoleClient();
    const { data, error } = await serviceClient
      .from("forum_categories")
      .insert({
        clan_id: body.clan_id,
        name: body.name,
        slug:
          body.slug ||
          body.name
            .toLowerCase()
            .replace(/ä/g, "ae")
            .replace(/ö/g, "oe")
            .replace(/ü/g, "ue")
            .replace(/ß/g, "ss")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, ""),
        description: body.description ?? null,
        sort_order: body.sort_order ?? 0,
      })
      .select()
      .single();

    if (error) {
      captureApiError("POST /api/admin/forum-categories", error);
      return NextResponse.json({ error: "Failed to create category." }, { status: 500 });
    }
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    captureApiError("POST /api/admin/forum-categories", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/* ─── PATCH (update) ─── */

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const blocked = strictLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    const parsed = UPDATE_CATEGORY_SCHEMA.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input.", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const body = parsed.data;

    if (body.slug !== undefined && body.slug !== "" && !/^[a-z0-9-]+$/.test(body.slug)) {
      return NextResponse.json(
        { error: "Slug must contain only lowercase letters, numbers, and hyphens." },
        { status: 400 },
      );
    }

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.slug !== undefined) updates.slug = body.slug;
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
      captureApiError("PATCH /api/admin/forum-categories", error);
      return NextResponse.json({ error: "Failed to update category." }, { status: 500 });
    }
    return NextResponse.json({ data });
  } catch (err) {
    captureApiError("PATCH /api/admin/forum-categories", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/* ─── DELETE ─── */

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const blocked = strictLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const id = request.nextUrl.searchParams.get("id");
    if (!id || !UUID_SCHEMA.safeParse(id).success) {
      return NextResponse.json({ error: "A valid id is required." }, { status: 400 });
    }

    const serviceClient = createSupabaseServiceRoleClient();
    const { error } = await serviceClient.from("forum_categories").delete().eq("id", id);

    if (error) {
      captureApiError("DELETE /api/admin/forum-categories", error);
      return NextResponse.json({ error: "Failed to delete category." }, { status: 500 });
    }
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    captureApiError("DELETE /api/admin/forum-categories", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
