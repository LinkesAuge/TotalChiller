import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { standardLimiter } from "@/lib/rate-limit";
import { requireAdmin } from "@/lib/api/require-admin";
import { apiError, parseJsonBody } from "@/lib/api/validation";
import { captureApiError } from "@/lib/api/logger";
import createSupabaseServiceRoleClient from "@/lib/supabase/service-role-client";

const RematchSchema = z.object({
  clanId: z.string().uuid(),
  submissionId: z.string().uuid().optional(),
});

/**
 * POST /api/import/submissions/rematch
 *
 * Re-matches all pending staged entries for a clan (or a single submission)
 * against the current game accounts and OCR corrections.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const parsed = await parseJsonBody(request, RematchSchema);
    if (parsed.error) return parsed.error;
    const { clanId, submissionId } = parsed.data;

    const svc = createSupabaseServiceRoleClient();

    const { data, error } = await svc.rpc("rematch_pending_entries", {
      p_clan_id: clanId,
      p_submission_id: submissionId ?? null,
    });

    if (error) {
      captureApiError("POST /api/import/submissions/rematch", error);
      return apiError("Re-matching failed.", 500);
    }

    return NextResponse.json({
      data: { rematchedCount: data as number },
    });
  } catch (err) {
    captureApiError("POST /api/import/submissions/rematch", err);
    return apiError("Internal server error.", 500);
  }
}
