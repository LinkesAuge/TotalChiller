/**
 * Playwright global setup: authenticate each test role and save storage state.
 *
 * This runs ONCE before all test projects. Each role's browser state
 * (cookies + localStorage) is persisted to a JSON file so that test
 * projects can skip the login step via `storageState`.
 *
 * Usage in test files:
 *   test.use({ storageState: "tests/.auth/member.json" });
 */
import { test as setup, expect } from "@playwright/test";
import { TEST_USERS, TEST_PASSWORD, type TestRole } from "./helpers/auth";
import path from "path";

const AUTH_DIR = path.join(__dirname, ".auth");

const ROLES_TO_SETUP: TestRole[] = ["member", "admin", "editor", "moderator", "owner", "guest"];

for (const role of ROLES_TO_SETUP) {
  setup(`authenticate as ${role}`, async ({ page }) => {
    const user = TEST_USERS[role];

    await page.goto("/auth/login");
    await page.waitForLoadState("networkidle");

    const identifierInput = page.locator("#identifier");
    if ((await identifierInput.count()) === 0) {
      /* Already logged in — just save state */
      await page.context().storageState({ path: path.join(AUTH_DIR, `${role}.json`) });
      return;
    }

    await identifierInput.fill(user.email);
    await page.locator("#password").fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 15000 });
    await page.waitForLoadState("networkidle");

    /* Persist the authenticated storage state */
    await page.context().storageState({ path: path.join(AUTH_DIR, `${role}.json`) });
  });
}
