/**
 * Shared authentication helpers for Playwright tests.
 *
 * Test users must exist in Supabase with these credentials:
 *   test-owner@example.com   → role: owner
 *   test-admin@example.com   → role: admin
 *   test-mod@example.com     → role: moderator
 *   test-editor@example.com  → role: editor
 *   test-member@example.com  → role: member
 *   test-guest@example.com   → role: guest
 * All passwords: TestPassword123!
 */
import type { Page } from "@playwright/test";

export const TEST_PASSWORD = "TestPassword123!";

export const TEST_USERS = {
  owner: { email: "test-owner@example.com", role: "owner" },
  admin: { email: "test-admin@example.com", role: "admin" },
  moderator: { email: "test-mod@example.com", role: "moderator" },
  editor: { email: "test-editor@example.com", role: "editor" },
  member: { email: "test-member@example.com", role: "member" },
  guest: { email: "test-guest@example.com", role: "guest" },
} as const;

export type TestRole = keyof typeof TEST_USERS;

/**
 * Login as a specific test user via the /auth/login page.
 * Waits for redirect away from the login page before returning.
 */
export async function loginAs(page: Page, role: TestRole): Promise<void> {
  const user = TEST_USERS[role];
  await page.goto("/auth/login");
  await page.waitForLoadState("networkidle");

  const identifierInput = page.locator("#identifier");
  const passwordInput = page.locator("#password");

  /* If already on a non-login page, we may be logged in */
  if ((await identifierInput.count()) === 0) return;

  await identifierInput.fill(user.email);
  await passwordInput.fill(TEST_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 15000 });
  await page.waitForLoadState("networkidle");
}

/**
 * Navigate to /auth/login to effectively "log out" (public page, clears auth redirect).
 */
export async function logout(page: Page): Promise<void> {
  await page.goto("/auth/login");
  await page.waitForLoadState("networkidle");
}
