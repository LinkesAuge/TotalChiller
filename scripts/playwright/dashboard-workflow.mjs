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
    await page.goto('${safeBaseUrl}/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(900);
    if (/\\/home(\\?|\\/|$)/.test(page.url())) {
      await page.screenshot({ path: '${safeOutputDir}/dashboard-auth-required.png', fullPage: true });
      return;
    }
    const currentPath = new URL(page.url()).pathname;
    if (currentPath !== '/') {
      throw new Error('Expected dashboard route "/". Current URL: ' + page.url());
    }
    await page.screenshot({ path: '${safeOutputDir}/dashboard-overview.png', fullPage: true });
  }`),
]);

runPwcli([
  "run-code",
  oneLine(`async function (page) {
    if (/\\/home(\\?|\\/|$)/.test(page.url())) {
      return;
    }
    const newsLink = page.locator('a[href="/news"]').first();
    if (!(await newsLink.count())) {
      throw new Error('Dashboard news link was not found.');
    }
    await newsLink.click();
    await page.waitForTimeout(900);
    const path = new URL(page.url()).pathname;
    if (path !== '/news' && path !== '/home') {
      throw new Error('News link did not navigate to /news. Current URL: ' + page.url());
    }
    await page.screenshot({ path: '${safeOutputDir}/dashboard-news-link.png', fullPage: true });
    if (path === '/news') {
      await page.goto('${safeBaseUrl}/', { waitUntil: 'domcontentloaded' });
    }
  }`),
]);

runPwcli([
  "run-code",
  oneLine(`async function (page) {
    if (/\\/home(\\?|\\/|$)/.test(page.url())) {
      return;
    }
    const eventsLink = page.locator('a[href="/events"]').first();
    if (!(await eventsLink.count())) {
      throw new Error('Dashboard events link was not found.');
    }
    await eventsLink.click();
    await page.waitForTimeout(900);
    const path = new URL(page.url()).pathname;
    if (path !== '/events' && path !== '/home') {
      throw new Error('Events link did not navigate to /events. Current URL: ' + page.url());
    }
    await page.screenshot({ path: '${safeOutputDir}/dashboard-events-link.png', fullPage: true });
    if (path === '/events') {
      await page.goto('${safeBaseUrl}/', { waitUntil: 'domcontentloaded' });
    }
  }`),
]);

runPwcli([
  "run-code",
  oneLine(`async function (page) {
    if (/\\/home(\\?|\\/|$)/.test(page.url())) {
      return;
    }
    const articleLink = page.locator('a[href*="/news?article="]').first();
    if (!(await articleLink.count())) {
      return;
    }
    await articleLink.click();
    await page.waitForTimeout(900);
    const path = new URL(page.url()).pathname;
    if (path !== '/news' && path !== '/home') {
      throw new Error('Announcement deep link did not navigate to /news. Current URL: ' + page.url());
    }
    await page.screenshot({ path: '${safeOutputDir}/dashboard-announcement-deeplink.png', fullPage: true });
    if (path === '/news') {
      await page.goto('${safeBaseUrl}/', { waitUntil: 'domcontentloaded' });
    }
  }`),
]);

runPwcli([
  "run-code",
  oneLine(`async function (page) {
    if (/\\/home(\\?|\\/|$)/.test(page.url())) {
      return;
    }
    const threadLink = page.locator('a[href*="/forum?post="]').first();
    if (!(await threadLink.count())) {
      return;
    }
    await threadLink.click();
    await page.waitForTimeout(900);
    const path = new URL(page.url()).pathname;
    if (path !== '/forum' && path !== '/home') {
      throw new Error('Forum deep link did not navigate to /forum. Current URL: ' + page.url());
    }
    await page.screenshot({ path: '${safeOutputDir}/dashboard-thread-deeplink.png', fullPage: true });
    if (path === '/forum') {
      await page.goto('${safeBaseUrl}/', { waitUntil: 'domcontentloaded' });
    }
  }`),
]);

const warnings = runPwcli(["console", "warning"]);
writeFileSync(join(outputDir, "console-warnings.log"), warnings, "utf8");

runPwcli(["close"]);

process.stdout.write(`Playwright workflow finished.\nArtifacts saved to: ${outputDir}\n`);
