#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

function getArgValue(flag, fallback = "") {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) {
    return fallback;
  }
  return process.argv[index + 1];
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

const baseUrl = getArgValue("--base-url", "http://127.0.0.1:3000").replace(/\/+$/, "");
const session = getArgValue("--session", "totalchiller-workflow");
const authStatePath = getArgValue("--auth-state", "");
const loginIdentifier = getArgValue("--login-identifier", "");
const loginPassword = getArgValue("--login-password", "");
const headed = hasFlag("--headed");

const repoRoot = process.cwd();
const outputDir = resolve(repoRoot, "output", "playwright");
mkdirSync(outputDir, { recursive: true });
const outputDirPosix = outputDir.replace(/\\/g, "/");
const npmCliPath = resolve(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
const npmRunner = existsSync(npmCliPath) ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm";

function runPwcli(args) {
  const fullArgs = [
    "exec",
    "--yes",
    "--package",
    "@playwright/cli",
    "--",
    "playwright-cli",
    "--session",
    session,
    ...args,
  ];
  const spawnArgs = npmRunner === process.execPath ? [npmCliPath, ...fullArgs] : fullArgs;
  const result = spawnSync(npmRunner, spawnArgs, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
    shell: npmRunner !== process.execPath && process.platform === "win32",
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.error) {
    throw result.error;
  }

  const mergedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (result.status !== 0 || mergedOutput.includes("### Error")) {
    throw new Error(`playwright-cli failed for: ${args.join(" ")}`);
  }

  return mergedOutput;
}

function escapeJs(value) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function oneLine(code) {
  return code.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
}

const safeBaseUrl = escapeJs(baseUrl);
const safeOutputDir = escapeJs(outputDirPosix);
const safeLoginIdentifier = escapeJs(loginIdentifier);
const safeLoginPassword = escapeJs(loginPassword);

runPwcli(["open", `${baseUrl}/`, ...(headed ? ["--headed"] : [])]);

if (authStatePath) {
  runPwcli(["state-load", resolve(repoRoot, authStatePath)]);
}

if (loginIdentifier && loginPassword) {
  runPwcli([
    "run-code",
    oneLine(`async function (page) {
      await page.goto('${safeBaseUrl}/auth/login');
      await page.waitForSelector('#identifier', { timeout: 10000 });
      await page.fill('#identifier', '${safeLoginIdentifier}');
      await page.fill('#password', '${safeLoginPassword}');
      await page.getByRole('button', { name: 'Enter the Sanctum' }).click();
      await page.waitForTimeout(1200);
      if (/\\/auth\\/login(\\/|$)/.test(page.url())) {
        throw new Error('Login did not complete. Check credentials.');
      }
    }`),
  ]);
}

runPwcli([
  "run-code",
  oneLine(`async function (page) {
    await page.waitForLoadState('domcontentloaded');
    if (await page.getByRole('link', { name: 'Upload CSV' }).count()) {
      return;
    }
    await page.goto('${safeBaseUrl}/');
    await page.waitForLoadState('networkidle');
  }`),
]);

runPwcli([
  "run-code",
  oneLine(`async function (page) {
    const action = page.locator('a.action-btn', { hasText: 'Upload CSV' }).first();
    const previousUrl = page.url();
    await action.click();
    await page.waitForTimeout(900);
    if (page.url() === previousUrl) {
      const href = await action.getAttribute('href');
      if (href) {
        await page.goto(new URL(href, previousUrl).toString());
      }
    }
    await page.waitForLoadState('domcontentloaded');
    if (!/\\/data-import(\\/|$)|\\/admin\\/data-import(\\/|$)|\\/home(\\?|\\/|$)/.test(page.url())) {
      throw new Error('Upload CSV quick action did not navigate to expected route. Current URL: ' + page.url());
    }
    await page.screenshot({ path: '${safeOutputDir}/quick-action-upload.png', fullPage: true });
    await page.goto('${safeBaseUrl}/');
  }`),
]);

runPwcli([
  "run-code",
  oneLine(`async function (page) {
    const action = page.locator('a.action-btn', { hasText: 'Review Rules' }).first();
    const previousUrl = page.url();
    await action.click();
    await page.waitForTimeout(900);
    if (page.url() === previousUrl) {
      const href = await action.getAttribute('href');
      if (href) {
        await page.goto(new URL(href, previousUrl).toString());
      }
    }
    await page.waitForLoadState('domcontentloaded');
    if (!/\\/admin(\\?|\\/|$)|\\/not-authorized(\\/|$)|\\/home(\\?|\\/|$)/.test(page.url())) {
      throw new Error('Review Rules quick action did not navigate to expected route. Current URL: ' + page.url());
    }
    await page.screenshot({ path: '${safeOutputDir}/quick-action-review-rules.png', fullPage: true });
    await page.goto('${safeBaseUrl}/');
  }`),
]);

runPwcli([
  "run-code",
  oneLine(`async function (page) {
    const action = page.locator('a.action-btn', { hasText: 'Events Calendar' }).first();
    const previousUrl = page.url();
    await action.click();
    await page.waitForTimeout(900);
    if (page.url() === previousUrl) {
      const href = await action.getAttribute('href');
      if (href) {
        await page.goto(new URL(href, previousUrl).toString());
      }
    }
    await page.waitForLoadState('domcontentloaded');

    if (/\\/events(\\/|$)/.test(page.url())) {
      await page.waitForSelector('.event-calendar-grid', { timeout: 10000 });
      const calendarCellCount = await page.locator('.calendar-day-cell').count();
      if (calendarCellCount < 35) {
        throw new Error('Expected month grid with at least 35 cells, got ' + calendarCellCount);
      }
      const dayWithEvents = page.locator('.calendar-day-cell:has(.calendar-day-count)').first();
      if (await dayWithEvents.count()) {
        await dayWithEvents.click();
      }
      await page.screenshot({ path: '${safeOutputDir}/events-calendar-overview.png', fullPage: true });
      return;
    }

    if (/\\/home(\\?|\\/|$)/.test(page.url())) {
      await page.screenshot({ path: '${safeOutputDir}/events-calendar-auth-required.png', fullPage: true });
      return;
    }

    throw new Error('Events Calendar quick action did not navigate to /events or /home. Current URL: ' + page.url());
  }`),
]);

const warnings = runPwcli(["console", "warning"]);
writeFileSync(join(outputDir, "console-warnings.log"), warnings, "utf8");

runPwcli(["close"]);

process.stdout.write(`Playwright workflow finished.\nArtifacts saved to: ${outputDir}\n`);
