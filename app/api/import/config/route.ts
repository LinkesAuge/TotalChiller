import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { standardLimiter } from "@/lib/rate-limit";
import { getSupabaseUrl, getSupabaseAnonKey } from "@/lib/supabase/config";
import { captureApiError } from "@/lib/api/logger";

/**
 * Public discovery endpoint for ChillerBuddy desktop clients.
 * Returns the Supabase URL and anon key so the app doesn't need to hardcode them.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;

  try {
    return NextResponse.json({
      data: {
        supabaseUrl: getSupabaseUrl(),
        supabaseAnonKey: getSupabaseAnonKey(),
      },
    });
  } catch (err) {
    captureApiError("GET /api/import/config", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
