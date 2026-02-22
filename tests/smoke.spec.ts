import { test, expect } from "@playwright/test";

/**
 * Smoke tests — every page loads without JS errors or crashes.
 * These run unauthenticated and verify the basic rendering.
 */

/* ── Public pages (no auth required) ── */

const PUBLIC_PAGES = [
  { path: "/home", title: "Home" },
  { path: "/about", title: "About" },
  { path: "/contact", title: "Contact" },
  { path: "/privacy-policy", title: "Privacy Policy" },
  { path: "/auth/login", title: "Login" },
  { path: "/auth/register", title: "Register" },
  { path: "/auth/forgot", title: "Forgot Password" },
  { path: "/not-authorized", title: "Not Authorized" },
];

/** Known harmless errors to ignore in smoke tests. */
const IGNORABLE_ERRORS = [
  /NextIntlClientProvider/i, // next-intl SSR→CSR fallback hydration warning
  /useTranslations/i,
  /client rendering/i,
];

test.describe("Smoke: Public pages load", () => {
  for (const { path, title } of PUBLIC_PAGES) {
    test(`${title} (${path}) loads without errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => {
        const msg = err.message;
        if (!IGNORABLE_ERRORS.some((re) => re.test(msg))) {
          errors.push(msg);
        }
      });

      await page.goto(path);
      await page.waitForLoadState("domcontentloaded");

      /* Page should not be blank */
      const body = page.locator("body");
      await expect(body).not.toBeEmpty();

      /* No uncaught JS errors (excluding known harmless ones) */
      expect(errors).toEqual([]);
    });
  }
});

/* ── Protected pages redirect to /home when unauthenticated ── */

const PROTECTED_PAGES = [
  "/news",
  "/events",
  "/forum",
  "/messages",
  "/members",
  "/profile",
  "/settings",
  "/auswertungen",
];

test.describe("Smoke: Protected pages redirect unauthenticated users", () => {
  for (const path of PROTECTED_PAGES) {
    test(`${path} redirects to /home`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("domcontentloaded");
      await expect.poll(async () => page.url(), { timeout: 15000 }).toContain("/home");
    });
  }
});

/* ── Admin pages redirect non-admin users ── */

const ADMIN_PAGES = ["/admin"];

test.describe("Smoke: Admin pages redirect unauthenticated users", () => {
  for (const path of ADMIN_PAGES) {
    test(`${path} redirects away`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("domcontentloaded");
      await expect.poll(async () => page.url(), { timeout: 15000 }).not.toContain("/admin");
    });
  }
});
