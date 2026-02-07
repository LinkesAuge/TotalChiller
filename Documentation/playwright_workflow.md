# Playwright Workflow Automation

This project now includes two automated Playwright CLI workflows:

- Dashboard quick actions and events calendar navigation checks.
- Full route-by-route UI audit (desktop + mobile) with screenshot capture, overflow checks, and table checkbox sizing checks.

## What it validates

### Dashboard workflow (`playwright:dashboard-workflow`)

- `Upload CSV` quick action navigates to data import.
- `Review Rules` quick action navigates to admin rules review (`/admin` or `/not-authorized` for non-admin users).
- `Events Calendar` quick action navigates to `/events`.
- `/events` renders a real month-style calendar grid (`.calendar-day-cell`), not only a list.
- Captures full-page screenshots at each major step.

### UI audit workflow (`playwright:ui-audit`)

- Visits major routes step-by-step.
- Runs both desktop (`1280x900`) and mobile (`375x812`) viewport passes.
- Captures full-page screenshots per route and viewport.
- Records route redirects (useful to detect auth gating behavior).
- Detects horizontal overflow (`scrollWidth > viewport width`).
- Audits table checkbox sizing and flags out-of-range values.
- Generates structured reports (`JSON` + `Markdown`) and warning logs.

## Prerequisites

1. Start the app:
   ```powershell
   npm run dev
   ```
2. Ensure `npx` is available:
   ```powershell
   npx --version
   ```

## Run

Option 1 (npm script):
```powershell
npm run playwright:dashboard-workflow
```

Option 2 (direct Node runner):
```powershell
node scripts/playwright/dashboard-workflow.mjs --base-url http://127.0.0.1:3000
```

Option 3 (PowerShell wrapper with parameters):
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/playwright/dashboard-workflow.ps1
```

### UI audit workflow

Option 1 (npm script):
```powershell
npm run playwright:ui-audit
```

Option 2 (direct Node runner):
```powershell
node scripts/playwright/ui-audit.mjs --base-url http://127.0.0.1:3000
```

Option 3 (PowerShell wrapper):
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/playwright/ui-audit.ps1
```

### Optional flags

- Headed browser:
  ```powershell
  node scripts/playwright/dashboard-workflow.mjs --headed
  ```
- Custom URL/session:
  ```powershell
  node scripts/playwright/dashboard-workflow.mjs --base-url http://127.0.0.1:3000 --session my-session
  ```
- Authenticated workflow (required to fully validate `/events` calendar behind auth):
  ```powershell
  node scripts/playwright/dashboard-workflow.mjs --login-identifier your@email.com --login-password your_password
  ```
- Reuse saved browser auth state:
  ```powershell
  node scripts/playwright/dashboard-workflow.mjs --auth-state output/playwright/auth-state.json
  ```
- UI audit with explicit route list:
  ```powershell
  node scripts/playwright/ui-audit.mjs --routes "/home,/events,/admin,/admin/data-table"
  ```

## Authenticated audit input

To fully audit protected pages (`/events`, `/messages`, `/charts`, `/settings`, `/profile`, `/admin`, `/admin/data-*`), provide one of:

1. Login credentials:
   ```text
   login_identifier=<email_or_username>
   login_password=<temporary_password>
   ```
2. Reusable auth state file:
   ```text
   output/playwright/auth-state.json
   ```

Credential handling:
- Use temporary credentials dedicated to QA.
- Do not commit credentials or auth-state files.
- Rotate/reset the password after audit if needed.

## Artifacts

Saved under:

- `output/playwright/quick-action-upload.png`
- `output/playwright/quick-action-review-rules.png`
- `output/playwright/events-calendar-overview.png` (when authenticated)
- `output/playwright/events-calendar-auth-required.png` (when redirected to `/home` without auth)
- `output/playwright/console-warnings.log`
- `output/playwright/ui-audit-<viewport>-<route>.png`
- `output/playwright/ui-audit-report.json`
- `output/playwright/ui-audit-report.md`
- `output/playwright/ui-audit-console-warnings.log`
