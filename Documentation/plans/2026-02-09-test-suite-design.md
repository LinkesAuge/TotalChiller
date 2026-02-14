# Test Suite Design — TotalChiller

**Date:** 2026-02-09 (updated 2026-02-13)  
**Status:** Implemented

## Overview

Comprehensive test suite covering all functionality of the TotalChiller webapp. Tests are split into two tiers:

1. **Vitest unit tests** (`lib/**/*.test.ts`) — fast, isolated tests for pure utility logic, Zod schemas, and mocked Supabase helpers.
2. **Playwright E2E tests** (`tests/*.spec.ts`) — browser-based tests covering UI flows, authentication, and integration.

Tests are organized by feature area, following Vercel/Next.js best practices for testing React applications.

## Unit Tests (Vitest)

Unit tests validate pure logic in `lib/` using Vitest with a Node environment. Run via `npm run test:unit`.

```
lib/
├── correction-applicator.test.ts    # Correction rule applicator — field matching, wildcard, status, edge cases
├── dashboard-utils.test.ts          # Date formatting, trend calculation, number formatting, relative time
├── date-format.test.ts              # German/locale datetime formatting
├── messages-schemas.test.ts         # Message Zod schemas + broadcast deduplication logic
├── permissions.test.ts              # Role definitions, permission matrix, hasPermission, canDo, isAdmin
├── rate-limit.test.ts               # Sliding-window rate limiter — allow, block, per-IP, Retry-After
├── api/
│   └── validation.test.ts           # Zod schemas: uuidSchema, notificationSettingsSchema, chartQuerySchema
└── supabase/
    ├── admin-access.test.ts         # getIsAdminAccess — admin/owner gate with mocked role resolution
    ├── check-role.test.ts           # resolveUserRole — auth check, RPC fast-path, user_roles fallback
    ├── config.test.ts               # Env-var accessors — throws on missing, returns when present
    ├── error-utils.test.ts          # Error classification — RLS, auth, network, unknown
    └── role-access.test.ts          # getIsContentManager — content-manager gate with mocked role resolution
```

| File                            | Tests   | What it covers                                                                                              |
| ------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------- |
| `correction-applicator.test.ts` | 21      | Field-specific & wildcard rules, case-insensitive matching, status filtering, edge cases                    |
| `dashboard-utils.test.ts`       | 25      | `toDateString`, `getMonday`, `calculateTrend`, `formatNumber`, `formatRelativeTime`, `extractAuthorName`    |
| `date-format.test.ts`           | 5       | `formatLocalDateTime`, `formatGermanDateTime`                                                               |
| `messages-schemas.test.ts`      | 20      | `SEND_MESSAGE_SCHEMA`, `BATCH_MARK_READ_SCHEMA`, `deduplicateOutgoing`                                      |
| `permissions.test.ts`           | 30      | `ROLES`, `isValidRole`, `toRole`, `hasPermission`, `canDo`, `isAdmin`, `isContentManager`, `getPermissions` |
| `rate-limit.test.ts`            | 5       | Rate limiter creation, blocking, per-IP isolation, Retry-After header                                       |
| `api/validation.test.ts`        | 26      | `uuidSchema`, `notificationSettingsSchema`, `chartQuerySchema` — valid/invalid/edge inputs                  |
| `supabase/admin-access.test.ts` | 7       | Returns true for owner/admin, false for all other roles and unauthenticated                                 |
| `supabase/check-role.test.ts`   | 9       | Auth failure → null, admin RPC → "admin", fallback to user_roles, default "member"                          |
| `supabase/config.test.ts`       | 6       | Each env-var getter returns value or throws with descriptive message                                        |
| `supabase/error-utils.test.ts`  | 12      | Error classification by code/message, i18n key mapping                                                      |
| `supabase/role-access.test.ts`  | 7       | Returns true for owner/admin/moderator/editor, false for member/guest/null                                  |
| **Total**                       | **173** |                                                                                                             |

### Files intentionally not unit-tested

| File                                  | Reason                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------- |
| `lib/hooks/use-user-role.ts`          | React hook — requires jsdom + React Testing Library (covered by E2E)      |
| `lib/supabase/browser-client.ts`      | Thin factory calling `createBrowserClient` — no branching logic           |
| `lib/supabase/server-client.ts`       | Thin factory depending on Next.js `cookies()` — covered by E2E            |
| `lib/supabase/service-role-client.ts` | Thin factory calling `createClient` — no branching logic                  |
| `lib/api/require-admin.ts`            | Thin guard composing Supabase auth + RPC — covered by E2E `admin.spec.ts` |
| `lib/types/domain.ts`                 | TypeScript types only — no runtime logic                                  |

## Playwright E2E Architecture

```
tests/
├── auth.setup.ts             # Global setup: pre-authenticate all 6 test roles
├── helpers/
│   └── auth.ts               # Shared auth helpers, test user config, storageStatePath
├── smoke.spec.ts              # Page load & redirect checks (no auth)
├── auth.spec.ts               # Auth flows: login, register, forgot, update
├── navigation.spec.ts         # Sidebar links, page transitions, redirects
├── api-endpoints.spec.ts      # API contract: status codes, response shapes
├── cms-pages.spec.ts          # CMS pages: public view + admin editing
├── cms-api.spec.ts            # CMS API endpoints
├── cms-components.spec.ts     # CMS component rendering
├── cms-markdown.spec.ts       # Markdown rendering
├── cms-public-view.spec.ts    # CMS public visibility
├── cms-responsive.spec.ts     # Responsive layout
├── news.spec.ts               # News/Articles: list, CRUD, permissions
├── events.spec.ts             # Events: calendar, CRUD, templates
├── forum.spec.ts              # Forum: posts, comments, voting, moderation
├── messages.spec.ts           # Messages: inbox, compose, send, broadcast
├── profile-settings.spec.ts   # Profile & Settings: forms, toggles
├── charts.spec.ts             # Charts: filters, visualizations
├── dashboard.spec.ts          # Dashboard: authenticated landing
├── admin.spec.ts              # Admin panel: access control, tabs, sections
├── admin-actions.spec.ts      # Admin panel: interactive tab actions
├── crud-flows.spec.ts         # CRUD flows: news, events, forum, messages, API
├── data-workflows.spec.ts     # Data import & data table workflows
├── notifications.spec.ts      # Notification bell, dropdown, API
├── i18n.spec.ts               # Internationalization: language switching, cookies
├── accessibility.spec.ts      # Accessibility: axe-core audits on key pages
├── permissions-unit.spec.ts   # Unit tests for lib/permissions.ts
└── roles-permissions.spec.ts  # E2E role-based access tests
```

## Authentication Strategy

### Pre-authenticated Storage State (Primary — Fast)

Tests use Playwright's **storageState** mechanism for authentication. A global `auth.setup.ts` runs once before all test projects, logging in as each of the 6 test roles and saving the browser state (cookies + localStorage) to JSON files in `tests/.auth/`.

Individual test files and describe blocks then declare their required role via:

```typescript
import { storageStatePath } from "./helpers/auth";

// File-level (all tests in this file run as "member")
test.use({ storageState: storageStatePath("member") });

// Or describe-level (different roles per describe block)
test.describe("Admin features", () => {
  test.use({ storageState: storageStatePath("admin") });
  // tests run as admin...
});
```

This eliminates the ~3-5 second login round-trip per test, making the full suite significantly faster.

### loginAs Helper (Fallback — For Role Overrides)

The `loginAs(page, role)` function is retained in `tests/helpers/auth.ts` for cases where a single test needs a different role than its parent describe block. Currently only used in `profile-settings.spec.ts` for one admin-override test.

### Roles Pre-authenticated in Setup

All 6 roles are set up: `owner`, `admin`, `moderator`, `editor`, `member`, `guest`.

## Test Categories

### 1. Smoke Tests (smoke.spec.ts)

- **Purpose:** Verify every page loads without JS errors
- **Auth:** None required
- **Count:** 3 tests
- Checks: public pages render, protected pages redirect unauthenticated, admin pages redirect

### 2. Auth Flow Tests (auth.spec.ts)

- **Purpose:** Validate login, register, forgot password forms
- **Auth:** None (tests the forms themselves)
- **Count:** 11 tests
- Checks: form fields render, validation works, links between auth pages, error display

### 3. Navigation Tests (navigation.spec.ts)

- **Purpose:** Verify sidebar navigation, link behavior, access control
- **Auth:** storageState (member, admin)
- **Count:** 6 tests
- Checks: public links work, sidebar renders for members, admin link visibility

### 4. API Endpoint Tests (api-endpoints.spec.ts)

- **Purpose:** Validate API contracts — status codes and response shapes
- **Auth:** None (tests unauthenticated behavior)
- **Count:** 30+ tests
- Checks: CMS endpoints, charts, messages, notifications, admin, game accounts, data import, design-system, auth, notification fan-out
- Note: Accepts both expected status (e.g. 401) and 429 (rate-limited) as valid responses

### 5. CMS Tests (cms-\*.spec.ts)

- **Purpose:** CMS content rendering, API contracts, markdown, responsiveness
- **Auth:** Mixed (public view + admin editing via storageState)
- **Count:** 36 tests across 5 files (cms-pages, cms-api, cms-components, cms-markdown, cms-public-view, cms-responsive)
- Checks: content renders, edit buttons for admin, API responses, markdown rendering

### 6. News Tests (news.spec.ts)

- **Purpose:** News/articles page functionality
- **Auth:** storageState (member, editor, guest)
- **Count:** 6 tests
- Checks: page loads, permission-based create button, article form, guest restrictions

### 7. Events Tests (events.spec.ts)

- **Purpose:** Events/calendar functionality
- **Auth:** storageState (member, editor)
- **Count:** 6 tests
- Checks: page loads, calendar navigation, create button permissions

### 8. Forum Tests (forum.spec.ts)

- **Purpose:** Forum posts, comments, moderation
- **Auth:** storageState (member, guest, moderator)
- **Count:** 7 tests
- Checks: page loads, sort controls, search, create post permissions, moderation

### 9. Messages Tests (messages.spec.ts)

- **Purpose:** Messaging system
- **Auth:** storageState (member, moderator)
- **Count:** 6 tests
- Checks: page loads, compose, broadcast permissions, type filters

### 10. Profile & Settings Tests (profile-settings.spec.ts)

- **Purpose:** Profile display and settings forms
- **Auth:** storageState (member) + loginAs override (admin for one test)
- **Count:** 13 tests
- Checks: profile info, game accounts, settings fields, notification toggles, username admin-only

### 11. Charts Tests (charts.spec.ts)

- **Purpose:** Data visualization page
- **Auth:** storageState (member)
- **Count:** 6 tests
- Checks: page loads, filters, chart rendering, handles "no clan access" gracefully

### 12. Dashboard Tests (dashboard.spec.ts)

- **Purpose:** Authenticated landing page
- **Auth:** storageState (member)
- **Count:** 3 tests
- Checks: page loads, content visible, no JS errors

### 13. Admin Tests (admin.spec.ts)

- **Purpose:** Admin panel access control and section rendering
- **Auth:** storageState (owner, admin, moderator, member)
- **Count:** 17 tests
- Checks: access control per role, tab navigation, clans, users, data import/table sections

### 14. Admin Actions Tests (admin-actions.spec.ts)

- **Purpose:** Admin panel interactive tab actions
- **Auth:** storageState (admin)
- **Count:** 6 tests
- Checks: approvals tab, users tab, clans tab, validation tab, forum tab, logs tab

### 15. CRUD Flow Tests (crud-flows.spec.ts)

- **Purpose:** Create/Read/Update/Delete workflows across features
- **Auth:** storageState (editor, member)
- **Count:** 16 tests
- Checks: news CRUD, events CRUD, forum post/comment CRUD, message send, authenticated API endpoints, error paths

### 16. Data Workflow Tests (data-workflows.spec.ts)

- **Purpose:** Data import and data table admin workflows
- **Auth:** storageState (admin, member)
- **Count:** 10 tests
- Checks: data import page, upload area, table rendering, pagination, batch actions, member access control

### 17. Notification Tests (notifications.spec.ts)

- **Purpose:** Notification bell, dropdown, and API endpoints
- **Auth:** storageState (member)
- **Count:** 6 tests
- Checks: bell visibility, dropdown toggle, mark-all-read, API response format, settings endpoint

### 18. i18n Tests (i18n.spec.ts)

- **Purpose:** Internationalization and language switching
- **Auth:** storageState (member)
- **Count:** 5 tests
- Checks: language switch, cookie setting, URL stability, public page language

### 19. Accessibility Tests (accessibility.spec.ts)

- **Purpose:** Automated accessibility audits via axe-core
- **Auth:** storageState (member)
- **Count:** 2 test groups (PUBLIC_PAGES + PROTECTED_PAGES, ~11 tests total)
- Checks: axe-core critical/serious violations on public and authenticated pages
- **Exclusions:** `KNOWN_A11Y_EXCLUSIONS` map disables `nested-interactive` on `/forum`, `/messages`, `/events` (genuine UI patterns: vote buttons in clickable rows, compose recipient chips, calendar day cells)

### 20. Permission Unit Tests (permissions-unit.spec.ts)

- **Purpose:** Unit tests for the permission system
- **Auth:** None (pure logic tests)
- **Count:** 34 tests
- Checks: role definitions, normalization, permission matrix, `hasPermission()`, `canDo()`

### 21. Role-Based Access E2E (roles-permissions.spec.ts)

- **Purpose:** End-to-end role-based access control verification
- **Auth:** storageState (all 6 roles)
- **Count:** 17 tests
- Checks: admin panel access per role, content management buttons, event management, profile access, broadcast permissions

## Playwright Configuration

| Setting            | Value                                                      |
| ------------------ | ---------------------------------------------------------- |
| Test directory     | `./tests`                                                  |
| Parallel execution | `fullyParallel: true`                                      |
| Retries            | 2 in CI, 1 locally                                         |
| Workers            | 1 in CI, 3 locally (reduces Supabase auth rate-limit hits) |
| Reporter           | `html`                                                     |
| Base URL           | `PLAYWRIGHT_BASE_URL` or `http://localhost:3000`           |
| Trace              | `on-first-retry`                                           |
| Screenshot         | `only-on-failure`                                          |
| Video              | `on-first-retry`                                           |

### Browser Projects

1. **setup** — runs `auth.setup.ts`, pre-authenticates all 6 roles
2. **chromium** — Desktop Chrome (depends on setup)
3. **firefox** — Desktop Firefox (depends on setup)
4. **webkit** — Desktop Safari (depends on setup)
5. **mobile-chrome** — Pixel 5 (depends on setup)

## Test User Setup

Tests require 6 test users in Supabase:

| Email                   | Role      | Password         |
| ----------------------- | --------- | ---------------- |
| test-owner@example.com  | owner     | TestPassword123! |
| test-admin@example.com  | admin     | TestPassword123! |
| test-mod@example.com    | moderator | TestPassword123! |
| test-editor@example.com | editor    | TestPassword123! |
| test-member@example.com | member    | TestPassword123! |
| test-guest@example.com  | guest     | TestPassword123! |

See `Documentation/test-user-setup.sql` for the SQL to create these users.

## Running Tests

```bash
# All tests
npx playwright test

# Chromium only (fastest for development)
npx playwright test --project=chromium

# Specific test file
npx playwright test tests/admin.spec.ts

# With visible browser
npx playwright test --headed

# Interactive UI mode
npx playwright test --ui

# Generate HTML report
npx playwright test --reporter=html
```

Set `PLAYWRIGHT_BASE_URL` if the dev server runs on a non-default port:

```bash
# PowerShell
$env:PLAYWRIGHT_BASE_URL = "http://localhost:3001"
npx playwright test

# Bash
PLAYWRIGHT_BASE_URL=http://localhost:3001 npx playwright test
```

## Coverage Summary

| Area                 | File(s)                     | Tests    | Auth  |
| -------------------- | --------------------------- | -------- | ----- |
| Smoke / Page Load    | `smoke.spec.ts`             | 3        | No    |
| Authentication Forms | `auth.spec.ts`              | 11       | No    |
| Navigation           | `navigation.spec.ts`        | 6        | Mixed |
| API Endpoints        | `api-endpoints.spec.ts`     | 30+      | No    |
| CMS (5 files)        | `cms-*.spec.ts`             | 36       | Mixed |
| News / Articles      | `news.spec.ts`              | 6        | Yes   |
| Events / Calendar    | `events.spec.ts`            | 6        | Yes   |
| Forum                | `forum.spec.ts`             | 7        | Yes   |
| Messages             | `messages.spec.ts`          | 6        | Yes   |
| Profile & Settings   | `profile-settings.spec.ts`  | 13       | Yes   |
| Charts               | `charts.spec.ts`            | 6        | Yes   |
| Dashboard            | `dashboard.spec.ts`         | 7        | Yes   |
| Admin Panel          | `admin.spec.ts`             | 17       | Yes   |
| Admin Actions        | `admin-actions.spec.ts`     | 6        | Yes   |
| CRUD Flows           | `crud-flows.spec.ts`        | 16       | Yes   |
| Data Workflows       | `data-workflows.spec.ts`    | 10       | Yes   |
| Notifications        | `notifications.spec.ts`     | 6        | Yes   |
| i18n                 | `i18n.spec.ts`              | 5        | Yes   |
| Accessibility        | `accessibility.spec.ts`     | ~11      | Yes   |
| Permissions Unit     | `permissions-unit.spec.ts`  | 34       | No    |
| Role-based E2E       | `roles-permissions.spec.ts` | 17       | Yes   |
| **E2E Total**        | **27 spec files**           | **~396** |       |

### Combined Coverage (Unit + E2E)

| Tier      | Framework  | Files  | Tests    |
| --------- | ---------- | ------ | -------- |
| Unit      | Vitest     | 12     | 173      |
| E2E       | Playwright | 27     | ~396     |
| **Total** |            | **39** | **~569** |

## Design Decisions

1. **Pre-authenticated storageState:** Tests use pre-saved browser state from `auth.setup.ts` instead of logging in per test. This eliminates ~3-5s per test. `loginAs` is retained only for per-test role overrides.
2. **No test data mutation:** Tests verify UI rendering and permission guards, never create/delete production data.
3. **Resilient selectors:** Use `#id`, `.class`, and `text=` selectors; `.first()` for ambiguous matches.
4. **`.content-inner` always uses `.first()`:** Multiple pages render 2+ `.content-inner` divs (from `PageShell` + inner client component). All `.content-inner` locators must use `.first()` to avoid Playwright strict mode violations.
5. **i18n-aware assertions:** All text assertions use regex alternation for German and English (`/erstellen|create/i`).
6. **Rate-limit tolerance:** API tests accept both expected status codes and 429 (Too Many Requests) as valid responses.
7. **Graceful degradation:** Tests handle conditional UI (e.g. "no clan access" messages) without failing.
8. **Port flexibility:** Base URL is configurable via `PLAYWRIGHT_BASE_URL` env var.
9. **Parallel-safe:** Tests are fully parallel (no shared state between tests). `fullyParallel: true` in config.
10. **Lazy-load tolerance:** Admin panel tests use 10-15s timeouts for `toContainText`/`toBeVisible` assertions to wait for `next/dynamic` chunk loading.
11. **Describe-level auth scoping:** Tests that need different roles use nested `test.describe` blocks, each with its own `test.use({ storageState })`.
12. **Prefer `domcontentloaded` over `networkidle`:** Pages with persistent Supabase realtime connections never reach `networkidle`. Use `domcontentloaded` + explicit element visibility waits instead.
13. **a11y exclusion map:** `accessibility.spec.ts` maintains `KNOWN_A11Y_EXCLUSIONS` to disable specific axe-core rules per page (e.g. `nested-interactive` on `/forum`, `/messages`, `/events`). These represent genuine UI patterns, not test gaps.
14. **CRUD delete flows require modal confirmation:** News and events delete buttons open a `ConfirmModal`. Tests must wait for the modal (`[role='dialog']`), then click the confirm button inside it.

## Helper Exports (tests/helpers/auth.ts)

| Export                   | Type     | Description                                                            |
| ------------------------ | -------- | ---------------------------------------------------------------------- |
| `TEST_PASSWORD`          | const    | `"TestPassword123!"` — shared password for all roles                   |
| `TEST_USERS`             | object   | Map of role → `{ email, role }` for all 6 test users                   |
| `TestRole`               | type     | `"owner" \| "admin" \| "moderator" \| "editor" \| "member" \| "guest"` |
| `loginAs(page, role)`    | function | Login via `/auth/login` form (fallback for role overrides)             |
| `logout(page)`           | function | Navigate to `/auth/login` to clear auth context                        |
| `storageStatePath(role)` | function | Returns path to `.auth/{role}.json` storage state file                 |

## npm Scripts

| Script            | Command                | Purpose                  |
| ----------------- | ---------------------- | ------------------------ |
| `test`            | `playwright test`      | Run all E2E tests        |
| `test:ui`         | `playwright test --ui` | Interactive E2E UI mode  |
| `test:unit`       | `vitest run`           | Run all unit tests once  |
| `test:unit:watch` | `vitest`               | Unit tests in watch mode |
