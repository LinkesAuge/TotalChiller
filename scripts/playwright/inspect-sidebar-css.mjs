#!/usr/bin/env node
/**
 * Inspect sidebar CSS custom properties at runtime.
 * Navigates to dashboard, takes screenshot, and returns computed values.
 */
import { chromium } from "playwright";
import { resolve } from "path";
import { mkdirSync, existsSync } from "fs";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const OUTPUT_DIR = resolve(process.cwd(), "output", "playwright");

async function main() {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL: BASE_URL,
    storageState: resolve(process.cwd(), "tests", ".auth", "member.json"),
  });
  const page = await context.newPage();

  try {
    /* Dashboard is at / (root); /dashboard may 404 */
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("aside.sidebar", { state: "visible", timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});

    /* Screenshot - full page including sidebar and main content */
    await page.screenshot({
      path: resolve(OUTPUT_DIR, "sidebar-inspect-screenshot.png"),
      fullPage: true,
    });
    console.log("Screenshot saved to output/playwright/sidebar-inspect-screenshot.png");

    /* Get computed CSS custom properties from sidebar */
    const computed = await page.evaluate(() => {
      const sidebar = document.querySelector("aside.sidebar");
      if (!sidebar) {
        return { error: "Sidebar element (aside.sidebar) not found" };
      }
      const styles = getComputedStyle(sidebar);
      return {
        "--color-edge": styles.getPropertyValue("--color-edge").trim(),
        "--color-edge-glow": styles.getPropertyValue("--color-edge-glow").trim(),
      };
    });

    if (computed.error) {
      console.error(computed.error);
      process.exit(1);
    }

    console.log("\nComputed --color-edge-glow on aside.sidebar:", JSON.stringify(computed["--color-edge-glow"]));
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
