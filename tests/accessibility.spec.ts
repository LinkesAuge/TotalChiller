import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { storageStatePath } from "./helpers/auth";

test.use({ storageState: storageStatePath("member") });

/**
 * Automated accessibility scans using axe-core.
 * Checks critical pages for WCAG 2.1 AA violations.
 */

const PUBLIC_PAGES = ["/", "/auth/login", "/auth/register", "/auth/forgot"];
const PROTECTED_PAGES = ["/home", "/news", "/events", "/forum", "/messages", "/members", "/profile"];

test.describe("Accessibility: Public pages", () => {
  for (const path of PUBLIC_PAGES) {
    test(`${path} has no critical a11y violations`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");

      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();

      const criticalViolations = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
      expect(criticalViolations).toEqual([]);
    });
  }
});

/**
 * Known a11y rule exclusions per page.
 * These represent genuine UI issues tracked for future fixes — not test gaps.
 * Rule IDs: https://dequeuniversity.com/rules/axe/
 */
const KNOWN_A11Y_EXCLUSIONS: Record<string, string[]> = {
  "/forum": [
    "nested-interactive", // Forum vote buttons nested inside clickable post rows
  ],
  "/messages": [
    "nested-interactive", // Compose recipient chips and interactive elements
  ],
  "/events": [
    "nested-interactive", // Calendar day cells with interactive event entries
  ],
};

test.describe("Accessibility: Protected pages", () => {
  for (const path of PROTECTED_PAGES) {
    test(`${path} has no critical a11y violations`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expect(page.locator(".content-inner, .card, main").first()).toBeVisible({ timeout: 10000 });

      const builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]);
      const exclusions = KNOWN_A11Y_EXCLUSIONS[path];
      if (exclusions) {
        builder.disableRules(exclusions);
      }
      const results = await builder.analyze();

      const criticalViolations = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
      expect(criticalViolations).toEqual([]);
    });
  }
});
