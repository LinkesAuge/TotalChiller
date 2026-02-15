import { NextResponse, type NextRequest } from "next/server";
import { captureApiError } from "@/lib/api/logger";
import { requireAuth } from "@/lib/api/require-auth";
import { apiError } from "@/lib/api/validation";
import createSupabaseServiceRoleClient from "@/lib/supabase/service-role-client";
import { standardLimiter } from "@/lib/rate-limit";
import { BUG_SCREENSHOTS_BUCKET, BUG_MAX_SCREENSHOT_BYTES, BUG_ACCEPTED_IMAGE_TYPES } from "@/lib/constants";
import { generateStoragePath } from "@/lib/markdown/app-markdown-toolbar";

/**
 * POST /api/bugs/screenshots — Upload a screenshot file.
 * Accepts multipart FormData with a `file` field.
 * Returns the storage path and public URL.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return apiError("No file provided.", 400);
    }

    /* Validate type */
    if (!BUG_ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof BUG_ACCEPTED_IMAGE_TYPES)[number])) {
      return apiError("Invalid file type. Use JPEG, PNG, GIF, or WebP.", 400);
    }

    /* Validate size */
    if (file.size > BUG_MAX_SCREENSHOT_BYTES) {
      return apiError("File too large. Maximum size is 5 MB.", 400);
    }

    const svc = createSupabaseServiceRoleClient();
    const storagePath = generateStoragePath(auth.userId, `bug_${file.name}`);

    const { error: uploadErr } = await svc.storage.from(BUG_SCREENSHOTS_BUCKET).upload(storagePath, file);

    if (uploadErr) {
      captureApiError("POST /api/bugs/screenshots", uploadErr);
      return apiError("Failed to upload screenshot.", 500);
    }

    const { data: urlData } = svc.storage.from(BUG_SCREENSHOTS_BUCKET).getPublicUrl(storagePath);

    return NextResponse.json(
      {
        data: {
          storage_path: storagePath,
          public_url: urlData.publicUrl,
          file_name: file.name,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    captureApiError("POST /api/bugs/screenshots", err);
    return apiError("Internal server error.", 500);
  }
}
