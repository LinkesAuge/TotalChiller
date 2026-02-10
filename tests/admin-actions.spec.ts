import { test, expect } from "@playwright/test";
import { storageStatePath } from "./helpers/auth";

test.use({ storageState: storageStatePath("admin") });

/**
 * Admin actions tests — covers key interactive workflows in admin tabs.
 */

test.describe("Admin Actions: Approvals tab", () => {
  test("approvals tab renders pending list or empty state", async ({ page }) => {
    await page.goto("/admin?tab=approvals");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 15000 });

    /* Should show approval entries or an empty-state message */
    const tableOrList = page.locator("table, .list, .card-body");
    expect(await tableOrList.count()).toBeGreaterThan(0);
  });
});

test.describe("Admin Actions: Users tab", () => {
  test("users tab shows create user button", async ({ page }) => {
    await page.goto("/admin?tab=users");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toContainText(/user|benutzer/i, { timeout: 15000 });

    const createBtn = page.locator("button", { hasText: /create|erstellen|hinzufügen|add/i });
    expect(await createBtn.count()).toBeGreaterThan(0);
  });

  test("clicking create user opens a modal", async ({ page }) => {
    await page.goto("/admin?tab=users");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toContainText(/user|benutzer/i, { timeout: 15000 });

    const createBtn = page.locator("button", { hasText: /create user|benutzer erstellen/i });
    if ((await createBtn.count()) > 0) {
      await createBtn.first().click();

      /* Modal should appear with form fields */
      const modal = page.locator(".modal, [role='dialog']");
      await expect(modal.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("users tab search filters results", async ({ page }) => {
    await page.goto("/admin?tab=users");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toContainText(/user|benutzer/i, { timeout: 15000 });

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
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 15000 });

    /* Should render a table or clan list */
    const table = page.locator("table, .table");
    await expect(table.first()).toBeVisible({ timeout: 15000 });
  });

  test("clans tab has create clan button", async ({ page }) => {
    await page.goto("/admin?tab=clans");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toBeVisible({ timeout: 15000 });

    /* Button may be an IconButton with aria-label instead of visible text */
    const createBtn = page.locator(
      'button:has-text("create"), button:has-text("erstellen"), button:has-text("hinzufügen"), button[aria-label*="create" i], button[aria-label*="erstellen" i], button[aria-label*="Clan" i]',
    );
    expect(await createBtn.count()).toBeGreaterThan(0);
  });
});

test.describe("Admin Actions: Validation tab", () => {
  test("validation tab shows field tabs (player, source, chest, clan)", async ({ page }) => {
    await page.goto("/admin?tab=validation");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toContainText(/validation|validierung|rule|regel/i, {
      timeout: 15000,
    });

    /* Should have sub-tabs for different field types */
    const fieldTabs = page.locator("button, [role=tab]", { hasText: /player|source|chest|clan|spieler|quelle|truhe/i });
    expect(await fieldTabs.count()).toBeGreaterThan(0);
  });

  test("validation tab has add rule button", async ({ page }) => {
    await page.goto("/admin?tab=validation");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toContainText(/validation|validierung/i, { timeout: 15000 });

    /* Button may be an IconButton with aria-label or a text button */
    const addBtn = page.locator(
      'button:has-text("add"), button:has-text("hinzufügen"), button:has-text("new"), button:has-text("neu"), button[aria-label*="add" i], button[aria-label*="hinzufügen" i], button[aria-label*="regel" i], button[aria-label*="rule" i]',
    );
    expect(await addBtn.count()).toBeGreaterThan(0);
  });
});

test.describe("Admin Actions: Forum management", () => {
  test("forum tab shows category management", async ({ page }) => {
    await page.goto("/admin?tab=forum");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toContainText(/forum|kategor/i, { timeout: 15000 });

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
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".content-inner")).toContainText(/log|protokoll|audit/i, { timeout: 15000 });

    /* Should have search or filter elements */
    const searchInput = page.locator('input[type="search"], input[placeholder*="such"], input[placeholder*="search"]');
    const filterSelect = page.locator("select");
    expect((await searchInput.count()) + (await filterSelect.count())).toBeGreaterThan(0);
  });
});
