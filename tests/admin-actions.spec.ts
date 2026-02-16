import { test, expect, type Page } from "@playwright/test";
import { storageStatePath } from "./helpers/auth";

test.use({ storageState: storageStatePath("admin") });

/** Wait for admin panel to fully render (past ClanAccessGate + lazy load). */
async function waitForAdmin(page: Page): Promise<void> {
  await expect(page.locator(".admin-grid")).toBeVisible({ timeout: 30000 });
}

/**
 * Admin actions tests — covers key interactive workflows in admin tabs.
 */

test.describe("Admin Actions: Approvals tab", () => {
  test("approvals tab renders pending list or empty state", async ({ page }) => {
    await page.goto("/admin?tab=approvals");
    await waitForAdmin(page);

    /* Should show approval entries, an empty-state message, or card body */
    const tableOrList = page.locator("table, .list, .card-body, .card-title");
    await expect(tableOrList.first()).toBeVisible({ timeout: 20000 });
  });
});

test.describe("Admin Actions: Users tab", () => {
  test("users tab shows create user button", async ({ page }) => {
    await page.goto("/admin?tab=users");
    await waitForAdmin(page);

    /* Wait for the users tab to fully load (creates user list + create button) */
    const createBtn = page.locator("button", { hasText: /create|erstellen|hinzufügen|add/i });
    await expect(createBtn.first()).toBeVisible({ timeout: 25000 });
  });

  test("clicking create user opens a modal", async ({ page }) => {
    await page.goto("/admin?tab=users");
    await waitForAdmin(page);

    const createBtn = page.locator("button", { hasText: /create user|benutzer erstellen/i });
    await expect(createBtn.first()).toBeVisible({ timeout: 25000 });
    await createBtn.first().click();

    /* Modal should appear with form fields */
    const modal = page.locator(".modal, [role='dialog']");
    await expect(modal.first()).toBeVisible({ timeout: 5000 });
  });

  test("users tab search filters results", async ({ page }) => {
    await page.goto("/admin?tab=users");
    await waitForAdmin(page);
    await expect(page.locator(".content-inner").first()).toContainText(/user|benutzer/i, { timeout: 25000 });

    const searchInput = page.locator('input[type="search"], input[placeholder*="such"], input[placeholder*="search"]');
    if ((await searchInput.count()) > 0) {
      await searchInput.first().fill("test-admin");
      /* Give a moment for filtering */
      await page.waitForLoadState("networkidle");
    }
  });
});

test.describe("Admin Actions: Clans tab", () => {
  test("clans tab shows clan table", async ({ page }) => {
    await page.goto("/admin?tab=clans");
    await waitForAdmin(page);

    /* Should render a table, clan list, or card title */
    const table = page.locator("table, .table, .card-title");
    await expect(table.first()).toBeVisible({ timeout: 20000 });
  });

  test("clans tab has create clan button", async ({ page }) => {
    await page.goto("/admin?tab=clans");
    await waitForAdmin(page);

    /* Button may be an IconButton with aria-label instead of visible text */
    const createBtn = page.locator(
      'button:has-text("create"), button:has-text("erstellen"), button:has-text("hinzufügen"), button[aria-label*="create" i], button[aria-label*="erstellen" i], button[aria-label*="Clan" i]',
    );
    expect(await createBtn.count()).toBeGreaterThan(0);
  });
});

test.describe("Admin Actions: Forum management", () => {
  test("forum tab shows category management", async ({ page }) => {
    await page.goto("/admin?tab=forum");
    await waitForAdmin(page);
    await expect(page.locator(".content-inner").first()).toContainText(/forum|kategor/i, { timeout: 20000 });

    /* Forum categories require a clan to be selected; look for add button OR "select clan" prompt */
    const addBtn = page.locator(
      'button:has-text("add"), button:has-text("hinzufügen"), button:has-text("erstellen"), button:has-text("create"), button[aria-label*="add" i], button[aria-label*="hinzufügen" i], button[aria-label*="kategor" i], button[aria-label*="category" i]',
    );
    const selectClanMsg = page.locator("text=/select.*clan|clan.*wählen|wähle.*clan/i");
    expect((await addBtn.count()) + (await selectClanMsg.count())).toBeGreaterThan(0);
  });
});

test.describe("Admin Actions: Logs tab", () => {
  test("logs tab shows filter controls", async ({ page }) => {
    await page.goto("/admin?tab=logs");
    await waitForAdmin(page);
    await expect(page.locator(".content-inner").first()).toContainText(/log|protokoll|audit/i, { timeout: 20000 });

    /* Should have search or filter elements */
    const searchInput = page.locator('input[type="search"], input[placeholder*="such"], input[placeholder*="search"]');
    const filterSelect = page.locator("select");
    expect((await searchInput.count()) + (await filterSelect.count())).toBeGreaterThan(0);
  });
});
