import { expect, type Page } from "@playwright/test";

/**
 * Wait until the clan access gate leaves its transient loading state.
 * This avoids flaky assertions while "Zugang wird geladen" is still rendered.
 */
export async function waitForClanAccessResolution(page: Page, timeoutMs = 20000): Promise<void> {
  await expect(
    page.locator(
      "text=/Zugang wird geladen|Clan-Mitgliedschaft wird überprüft|Loading clan access|Checking clan membership/i",
    ),
  ).toHaveCount(0, { timeout: timeoutMs });
}
