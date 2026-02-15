import { NextResponse, type NextRequest } from "next/server";
import { captureApiError } from "@/lib/api/logger";
import { requireAuth } from "@/lib/api/require-auth";
import { requireAdmin } from "@/lib/api/require-admin";
import { bugCategorySchema, uuidSchema, apiError, parseJsonBody } from "@/lib/api/validation";
import createSupabaseServiceRoleClient from "@/lib/supabase/service-role-client";
import { standardLimiter, strictLimiter } from "@/lib/rate-limit";

/**
 * GET /api/bugs/categories — List all bug report categories.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const svc = createSupabaseServiceRoleClient();
    const { data, error } = await svc
      .from("bug_report_categories")
      .select("id, name, slug, sort_order, created_at")
      .order("sort_order", { ascending: true });

    if (error) {
      captureApiError("GET /api/bugs/categories", error);
      return apiError("Failed to load categories.", 500);
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    captureApiError("GET /api/bugs/categories", err);
    return apiError("Internal server error.", 500);
  }
}

/**
 * POST /api/bugs/categories — Create a new category (admin only).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const blocked = strictLimiter.check(request);
  if (blocked) return blocked;
  try {
    const admin = await requireAdmin();
    if (admin.error) return admin.error;

    const parsed = await parseJsonBody(request, bugCategorySchema);
    if (parsed.error) return parsed.error;

    const svc = createSupabaseServiceRoleClient();
    const { data, error } = await svc
      .from("bug_report_categories")
      .insert({
        name: parsed.data.name.trim(),
        sort_order: parsed.data.sort_order ?? 0,
      })
      .select("id, name, slug, sort_order, created_at")
      .single();

    if (error) {
      captureApiError("POST /api/bugs/categories", error);
      return apiError("Failed to create category.", 500);
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    captureApiError("POST /api/bugs/categories", err);
    return apiError("Internal server error.", 500);
  }
}

/**
 * PATCH /api/bugs/categories — Update a category (admin only).
 * Expects `id` in the body alongside name/sort_order.
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const blocked = strictLimiter.check(request);
  if (blocked) return blocked;
  try {
    const admin = await requireAdmin();
    if (admin.error) return admin.error;

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return apiError("Invalid JSON body.", 400);
    }

    const body = raw as Record<string, unknown>;
    const idParsed = uuidSchema.safeParse(body.id);
    if (!idParsed.success) return apiError("Invalid category ID.", 400);

    const fieldsParsed = bugCategorySchema.partial().safeParse(body);
    if (!fieldsParsed.success) return apiError("Invalid input.", 400);

    const svc = createSupabaseServiceRoleClient();
    const updates: Record<string, unknown> = {};
    if (fieldsParsed.data.name !== undefined) updates.name = fieldsParsed.data.name.trim();
    if (fieldsParsed.data.sort_order !== undefined) updates.sort_order = fieldsParsed.data.sort_order;

    if (Object.keys(updates).length === 0) return apiError("No fields to update.", 400);

    const { data, error } = await svc
      .from("bug_report_categories")
      .update(updates)
      .eq("id", body.id as string)
      .select("id, name, slug, sort_order, created_at")
      .single();

    if (error) {
      captureApiError("PATCH /api/bugs/categories", error);
      return apiError("Failed to update category.", 500);
    }

    return NextResponse.json({ data });
  } catch (err) {
    captureApiError("PATCH /api/bugs/categories", err);
    return apiError("Internal server error.", 500);
  }
}

/**
 * DELETE /api/bugs/categories — Delete a category (admin only).
 * Expects `{ id: uuid }` in the body.
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const blocked = strictLimiter.check(request);
  if (blocked) return blocked;
  try {
    const admin = await requireAdmin();
    if (admin.error) return admin.error;

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return apiError("Invalid JSON body.", 400);
    }

    const body = raw as Record<string, unknown>;
    const idParsed = uuidSchema.safeParse(body.id);
    if (!idParsed.success) return apiError("Invalid category ID.", 400);

    const svc = createSupabaseServiceRoleClient();
    const { error } = await svc
      .from("bug_report_categories")
      .delete()
      .eq("id", body.id as string);

    if (error) {
      captureApiError("DELETE /api/bugs/categories", error);
      return apiError("Failed to delete category.", 500);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    captureApiError("DELETE /api/bugs/categories", err);
    return apiError("Internal server error.", 500);
  }
}
