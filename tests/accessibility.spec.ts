import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginAs } from "./helpers/auth";

/**
 * Automated accessibility scans using axe-core.
 * Checks critical pages for WCAG 2.1 AA violations.
 */

const PUBLIC_PAGES = ["/", "/auth/login", "/auth/register", "/auth/forgot"];
const PROTECTED_PAGES = ["/home", "/news", "/events", "/forum", "/messages", "/profile"];

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

test.describe("Accessibility: Protected pages", () => {
  for (const path of PROTECTED_PAGES) {
    test(`${path} has no critical a11y violations`, async ({ page }) => {
      await loginAs(page, "member");
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();

      const criticalViolations = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
      expect(criticalViolations).toEqual([]);
    });
  }
});
