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

function escapeJs(value) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function oneLine(code) {
  return code.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
}

function parsePwcliJsonResult(output) {
  const match = output.match(/### Result\s*([\s\S]*?)\n### Ran Playwright code/);
  if (!match) {
    return null;
  }
  const raw = match[1]?.trim();
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function toSlug(route) {
  const trimmed = route.replace(/^\//, "").replace(/\/$/, "");
  if (!trimmed) {
    return "root";
  }
  return trimmed.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
}

const baseUrl = getArgValue("--base-url", "http://127.0.0.1:3000").replace(/\/+$/, "");
const session = getArgValue("--session", "totalchiller-ui-audit");
const authStatePath = getArgValue("--auth-state", "");
const loginIdentifier = getArgValue("--login-identifier", "");
const loginPassword = getArgValue("--login-password", "");
const routesArg = getArgValue("--routes", "");
const headed = hasFlag("--headed");

const defaultRoutes = [
  "/",
  "/home",
  "/auth/login",
  "/auth/register",
  "/auth/forgot",
  "/news",
  "/events",
  "/messages",
  "/analytics",
  "/settings",
  "/profile",
  "/admin",
  "/admin/data-import",
  "/admin/data-table",
];

const routes = routesArg
  ? routesArg
      .split(",")
      .map((route) => route.trim())
      .filter(Boolean)
  : defaultRoutes;

const viewports = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile", width: 375, height: 812 },
];

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

const safeBaseUrl = escapeJs(baseUrl);
const safeOutputDir = escapeJs(outputDirPosix);
const safeLoginIdentifier = escapeJs(loginIdentifier);
const safeLoginPassword = escapeJs(loginPassword);

runPwcli(["open", `${baseUrl}/home`, ...(headed ? ["--headed"] : [])]);

if (authStatePath) {
  runPwcli(["state-load", resolve(repoRoot, authStatePath)]);
}

if (loginIdentifier && loginPassword) {
  runPwcli([
    "run-code",
    oneLine(`async function (page) {
      await page.goto('${safeBaseUrl}/auth/login', { waitUntil: 'networkidle' });
      await page.waitForSelector('#identifier', { timeout: 15000 });
      await page.fill('#identifier', '${safeLoginIdentifier}');
      await page.fill('#password', '${safeLoginPassword}');
      await Promise.all([
        page.waitForURL((url) => !url.pathname.startsWith('/auth/login'), { timeout: 20000 }).catch(() => null),
        page.getByRole('button', { name: 'Enter the Sanctum' }).click(),
      ]);
      await page.waitForTimeout(2000);
      if (/\\/auth\\/login(\\/|$)/.test(page.url())) {
        const statusText = await page.evaluate(() => {
          const el = document.querySelector('.text-muted');
          return el ? el.textContent : '';
        });
        throw new Error('Login did not complete: ' + (statusText || 'unknown error'));
      }
    }`),
  ]);
}

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  authenticated: Boolean(authStatePath || (loginIdentifier && loginPassword)),
  routes,
  viewports: [],
};

for (const viewport of viewports) {
  runPwcli(["resize", String(viewport.width), String(viewport.height)]);
  const viewportResults = [];

  for (const route of routes) {
    const normalizedRoute = route.startsWith("/") ? route : `/${route}`;
    const screenshotPath = `${safeOutputDir}/ui-audit-${viewport.name}-${toSlug(normalizedRoute)}.png`;
    const safeTargetUrl = escapeJs(`${baseUrl}${normalizedRoute}`);

    const output = runPwcli([
      "run-code",
      oneLine(`async function (page) {
        await page.goto('${safeTargetUrl}', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(600);
        const metrics = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          const viewportWidth = window.innerWidth;
          const docWidth = doc?.scrollWidth ?? viewportWidth;
          const bodyWidth = body?.scrollWidth ?? viewportWidth;
          const overflowX = Math.max(docWidth, bodyWidth) - viewportWidth;
          const visibleCheckboxes = Array.from(document.querySelectorAll('input[type="checkbox"]')).filter((checkbox) => {
            const rect = checkbox.getBoundingClientRect();
            const style = window.getComputedStyle(checkbox);
            return (
              rect.width > 0 &&
              rect.height > 0 &&
              style.visibility !== "hidden" &&
              style.display !== "none" &&
              style.opacity !== "0"
            );
          });
          const tableCheckboxes = visibleCheckboxes.filter((checkbox) => Boolean(checkbox.closest(".table")));
          const checkboxTarget = tableCheckboxes.length > 0 ? tableCheckboxes : visibleCheckboxes;
          const checkboxSample = checkboxTarget.slice(0, 8).map((checkbox) => {
            const rect = checkbox.getBoundingClientRect();
            return {
              width: Number(rect.width.toFixed(1)),
              height: Number(rect.height.toFixed(1)),
            };
          });
          const outOfRangeCheckboxes = checkboxSample.filter((sample) => (
            sample.width > 18 || sample.height > 18 || sample.width < 12 || sample.height < 12
          )).length;
          const clippedHeadlines = Array.from(document.querySelectorAll('.top-bar-title, .card-title')).filter((node) => {
            const element = node;
            return element.scrollWidth > element.clientWidth + 1;
          }).length;
          return {
            href: window.location.href,
            viewportWidth,
            docWidth,
            bodyWidth,
            overflowX,
            checkboxCount: visibleCheckboxes.length,
            tableCheckboxCount: tableCheckboxes.length,
            checkboxSample,
            outOfRangeCheckboxes,
            clippedHeadlines,
          };
        });
        await page.screenshot({ path: '${screenshotPath}', fullPage: true });
        return {
          route: '${escapeJs(normalizedRoute)}',
          ...metrics,
        };
      }`),
    ]);

    const parsed = parsePwcliJsonResult(output);
    viewportResults.push(
      parsed ?? {
        route: normalizedRoute,
        href: "unavailable",
        viewportWidth: viewport.width,
        docWidth: viewport.width,
        bodyWidth: viewport.width,
        overflowX: 0,
        checkboxCount: 0,
        tableCheckboxCount: 0,
        checkboxSample: [],
        outOfRangeCheckboxes: 0,
        clippedHeadlines: 0,
      },
    );
  }

  report.viewports.push({
    ...viewport,
    summary: {
      redirectedRoutes: viewportResults.filter((item) => {
        const expected = `${baseUrl}${item.route}`;
        return item.href !== expected;
      }).length,
      overflowRoutes: viewportResults.filter((item) => item.overflowX > 0).length,
      checkboxIssueRoutes: viewportResults.filter((item) => item.outOfRangeCheckboxes > 0).length,
    },
    results: viewportResults,
  });
}

const warnings = runPwcli(["console", "warning"]);
writeFileSync(join(outputDir, "ui-audit-console-warnings.log"), warnings, "utf8");
writeFileSync(join(outputDir, "ui-audit-report.json"), JSON.stringify(report, null, 2), "utf8");

const markdownLines = [
  "# UI Audit Report",
  "",
  `Generated: ${report.generatedAt}`,
  `Base URL: ${report.baseUrl}`,
  `Authenticated: ${report.authenticated ? "yes" : "no"}`,
  "",
];

for (const viewportReport of report.viewports) {
  markdownLines.push(`## ${viewportReport.name} (${viewportReport.width}x${viewportReport.height})`);
  markdownLines.push("");
  markdownLines.push(
    `- Redirected routes: ${viewportReport.summary.redirectedRoutes}`,
    `- Routes with horizontal overflow: ${viewportReport.summary.overflowRoutes}`,
    `- Routes with checkbox sizing anomalies: ${viewportReport.summary.checkboxIssueRoutes}`,
    "",
    "| Route | Final URL | Overflow(px) | Visible checkboxes | Table checkboxes | Checkbox anomalies |",
    "| --- | --- | ---: | ---: | ---: | ---: |",
  );
  for (const item of viewportReport.results) {
    markdownLines.push(
      `| \`${item.route}\` | \`${item.href}\` | ${item.overflowX} | ${item.checkboxCount} | ${item.tableCheckboxCount} | ${item.outOfRangeCheckboxes} |`,
    );
  }
  markdownLines.push("");
}

writeFileSync(join(outputDir, "ui-audit-report.md"), markdownLines.join("\n"), "utf8");

runPwcli(["close"]);

process.stdout.write(`UI audit finished.\nArtifacts saved to: ${outputDir}\n`);
