const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const BASE = "http://localhost:3000";
const OUTPUT = path.join(__dirname, "..", "output", "playwright");
const TEST_EMAIL = "test-member@example.com";
const TEST_PASSWORD = "TestPassword123!";

(async () => {
  if (!fs.existsSync(OUTPUT)) fs.mkdirSync(OUTPUT, { recursive: true });

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    baseURL: BASE,
  });
  const page = await context.newPage();

  try {
    // 1. Screenshot login page
    await page.goto("/auth/login", { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUTPUT, "auth-login.png"), fullPage: true });
    console.log("Screenshot saved: output/playwright/auth-login.png");

    // 2. Login
    const identifier = page.locator("#identifier");
    if ((await identifier.count()) > 0) {
      await identifier.fill(TEST_EMAIL);
      await page.locator("#password").fill(TEST_PASSWORD);
      await page.locator('button[type="submit"]').first().click();
      await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 20000 });
      await page.waitForTimeout(2000);
    }

    // 3. Navigate to messages and screenshot
    await page.goto("/messages", { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(OUTPUT, "messages-page.png"), fullPage: true });
    console.log("Screenshot saved: output/playwright/messages-page.png");

    // 4. Click first message to open thread (chat bubbles view)
    const firstMessage = page.locator(".messages-conversation-item").first();
    if ((await firstMessage.count()) > 0) {
      await firstMessage.click();
      await page.waitForTimeout(2500);
      await page.screenshot({ path: path.join(OUTPUT, "messages-thread.png"), fullPage: true });
      console.log("Screenshot saved: output/playwright/messages-thread.png");
    }
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await browser.close();
  }
})();
