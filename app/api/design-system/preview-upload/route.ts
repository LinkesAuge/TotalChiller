import { NextResponse, type NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { z } from "zod";
import { captureApiError } from "@/lib/api/logger";
import { requireAdmin } from "@/lib/api/require-admin";
import createSupabaseServiceRoleClient from "@/lib/supabase/service-role-client";
import { standardLimiter } from "@/lib/rate-limit";

const uuidSchema = z.string().uuid("element_id must be a valid UUID");

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PREVIEW_DIR = path.join(process.cwd(), "public", "design-system-previews");
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

/* ------------------------------------------------------------------ */
/*  POST /api/design-system/preview-upload                             */
/*  Multipart form: file (image) + element_id (uuid)                   */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const elementId = formData.get("element_id") as string | null;

    if (!file || !elementId) {
      return NextResponse.json({ error: "Missing file or element_id" }, { status: 400 });
    }

    const uuidParsed = uuidSchema.safeParse(elementId);
    if (!uuidParsed.success) {
      return NextResponse.json({ error: "Invalid element_id format" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type. Allowed: ${ALLOWED_TYPES.join(", ")}` },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "File too large (max 2 MB)" }, { status: 400 });
    }

    /* Determine extension from MIME */
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const filename = `${elementId}.${ext}`;
    const publicPath = `/design-system-previews/${filename}`;

    /* Ensure directory exists and write file */
    await mkdir(PREVIEW_DIR, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(PREVIEW_DIR, filename), buffer);

    /* Update DB: set preview_image on the element */
    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .from("ui_elements")
      .update({ preview_image: publicPath })
      .eq("id", elementId)
      .select()
      .single();

    if (error) {
      captureApiError("POST /api/design-system/preview-upload", error);
      return NextResponse.json({ error: "Failed to update element preview" }, { status: 500 });
    }

    return NextResponse.json({ data, path: publicPath });
  } catch (err) {
    captureApiError("POST /api/design-system/preview-upload", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
