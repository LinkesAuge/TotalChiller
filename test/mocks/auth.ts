import { NextResponse } from "next/server";
import type { AuthResult } from "@/lib/api/require-auth";
import { createMockSupabase } from "./supabase";

/**
 * Creates a mock auth setup for API route handler tests.
 *
 * Usage:
 * ```ts
 * vi.mock("@/lib/api/require-auth");
 * vi.mock("@/lib/api/require-admin");
 * import { requireAuth } from "@/lib/api/require-auth";
 * import { requireAdmin } from "@/lib/api/require-admin";
 *
 * let mockAuth: ReturnType<typeof createMockAuth>;
 * beforeEach(() => {
 *   mockAuth = createMockAuth();
 *   vi.mocked(requireAuth).mockResolvedValue(mockAuth.authResult);
 *   vi.mocked(requireAdmin).mockResolvedValue(mockAuth.authResult);
 * });
 * ```
 */
export function createMockAuth(userId = "test-user-id") {
  const { supabase, mockFrom, mockRpc, mockStorage } = createMockSupabase({ authUser: { id: userId } });
  const authResult: AuthResult & { error?: undefined } = { userId, supabase };
  return { supabase, mockFrom, mockRpc, mockStorage, authResult };
}

export function createUnauthorizedResult() {
  return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
}

export function createForbiddenResult() {
  return { error: NextResponse.json({ error: "Forbidden: admin access required." }, { status: 403 }) };
}
