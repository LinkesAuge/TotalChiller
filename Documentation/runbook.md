# Runbook (Setup + Usage)

This runbook explains how to set up, run, and use the [THC] Chiller & Killer community platform.

## 1) Supabase Setup

1. Create a Supabase project.
2. Go to **Project Settings → API** and copy:
   - Project URL
   - anon public key
   - service role key
3. In Supabase SQL Editor, run in order:
   - `Documentation/supabase_chest_entries.sql` (base schema)
   - `Documentation/migrations/game_account_approval.sql`
   - `Documentation/migrations/messages.sql`
   - `Documentation/migrations/notifications.sql`
   - `Documentation/migrations/event_recurrence.sql`
   - `Documentation/migrations/event_organizer.sql`
   - `Documentation/migrations/event_templates.sql`
   - `Documentation/migrations/forum_tables.sql`
   - `Documentation/migrations/forum_storage.sql`
   - `Documentation/migrations/forum_seed_categories.sql`
   - `Documentation/migrations/profile_default_game_account.sql`
   - `Documentation/migrations/article_banner.sql`
   - `Documentation/migrations/article_updated_by.sql`
   - `Documentation/migrations/site_content.sql`
   - `Documentation/migrations/site_list_items.sql`
   - `Documentation/migrations/cms_icons_bucket.sql` (manual bucket creation — see file)
   - `Documentation/migrations/fix_broken_markdown.sql`
   - `Documentation/migrations/roles_permissions_cleanup.sql`
   - `Documentation/migrations/author_fk_constraints.sql`
   - `Documentation/migrations/forum_rls_permissions.sql`
   - `Documentation/migrations/event_banner_url.sql`
   - `Documentation/migrations/design_system_tables.sql`
   - `Documentation/migrations/design_system_render_type.sql`
   - `Documentation/migrations/messages_sender_delete.sql`
   - `Documentation/migrations/messages_archive.sql`
   - `Documentation/migrations/bug_reports.sql`
   - `Documentation/migrations/bug_reports_v2.sql`
   - `Documentation/migrations/bug_reports_v3.sql`
   - `Documentation/migrations/guest_role_permissions.sql`
   - `Documentation/migrations/role_change_protection.sql`
   - `Documentation/migrations/drop_chest_data_tables.sql`

## 2) Local Environment

Create `.env.local` in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=YOUR_PROJECT_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

# Optional: bug report email notifications (via Resend)
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=bugs@yourdomain.com
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

## 3) Install + Run

```
npm install
npm run dev
```

Open: `http://localhost:3000`

## 4) Auth Flow

- Register: `/auth/register`
- Login: `/auth/login`
- Forgot password: `/auth/forgot`
- Update password: `/auth/update` — redirects to dashboard after 2 seconds on success

### New User Onboarding Flow

1. **Register** at `/auth/register` (email, username, password).
2. **Confirm email** — a bilingual (DE/EN) confirmation email is sent. The link redirects to the login page after verification.
3. **Log in** at `/auth/login` — the login page detects first-time users (no game accounts) and automatically redirects them to `/profile`.
4. **Create game account** — in the profile page, the user adds their Total Battle player name.
5. **Clan assignment** — an admin assigns the user to a clan (typically within 24–48 hours).

Email templates (dual-theme: light for Outlook, dark for modern clients) are documented in `Documentation/supabase-email-templates.md` and must be configured in the Supabase Dashboard under **Authentication → Email Templates**.

## 5) Routing Behavior

- Unauthenticated `/` redirects to `/home`
- Authenticated `/home` redirects to `/`
- **API routes** (`/api/`) are **not** redirected by the proxy — they handle their own auth and return JSON error responses (e.g. 401, 403)
- **PKCE catch-all:** Stray auth codes (when Supabase ignores redirectTo) are caught by the proxy and redirected to `/auth/callback`. Registration, email change, and forgot-password set `auth_redirect_next` fallback cookie.
- Non-API, non-public page routes redirect unauthenticated users to `/home`
- Admin page routes (`/admin`, `/design-system`) require admin role; non-admins redirected to `/not-authorized?reason=admin` (admin-specific access denied message). "Verwaltung" nav section is visible to all authenticated users.

## 6) Core Pages

- Public Home: `/home`
- Dashboard: `/`
- Announcements: `/news`
- Forum: `/forum`
- Analytics (Analysen): `/analytics`
- Events (Event-Kalender): `/events`
- Messages: `/messages`
- Profile: `/profile`
- Members: `/members`
- Bug Reports: `/bugs`
- Settings: `/settings`
- Admin: `/admin`
- Design System: `/design-system` (admin only)

## 7) Admin: Clans + Memberships

1. Go to `/admin`
2. Create a clan
3. Add members by **user_id** or **email**
4. Assign role and active status

## 8) Admin: Forum Categories

In `/admin` → Forum tab:

- Create/edit/delete forum categories
- Reorder categories via up/down buttons

## Admin Architecture

The admin panel uses a modular, code-split architecture:

- **`admin-client.tsx`**: Slim orchestrator (~140 lines) — renders the tab bar and dynamically imports the active tab.
- **`admin-context.tsx`**: `AdminProvider` context — shared Supabase client, clan data, section routing, status. All tabs call `useAdminContext()`.
- **Tabs** (`app/admin/tabs/`): Each tab is a self-contained component lazy-loaded via `next/dynamic`. Tab names: `clans-tab`, `users-tab`, `logs-tab`, `approvals-tab`, `forum-tab`.
- **Shared hooks** (`app/admin/hooks/`): `usePagination`, `useSortable`, `useConfirmDelete`.
- **Shared components** (`app/admin/components/`): `DangerConfirmModal`, `SortableColumnHeader`, `PaginationBar`.

When modifying the admin panel:

- Add new tabs in `app/admin/tabs/`, register them in `admin-client.tsx`'s `TAB_MAP` and `AdminSection` type.
- Use shared hooks for pagination, sorting, and delete flows instead of reimplementing.
- Context state is in `admin-context.tsx` — add new shared state there, not in individual tabs.

## 9) Announcements

In `/news`:

- Create announcements with banner images (6 templates + custom upload)
- Rich markdown editor with image upload (paste/drag-drop)
- Content supports formatting, images, videos, links
- Pinned announcements appear at top
- Edit tracking: original author is preserved, editor tracked separately

## 10) Forum

In `/forum`:

- Browse by category
- Create posts with rich markdown editor
- Comment/reply with voting
- Pin important posts (content managers only)
- Post thumbnails extracted from content

## 11) Events

In `/events`:

- Create single or recurring events (daily/weekly/biweekly/monthly)
- Use templates for common event types
- Calendar view with day-detail panel (auto-scrolls on day click)
- Optional organizer field

## 12) Running Tests

### Vitest Unit Tests

**Current status (2026-02-15):** 654 tests across 32 test files in `lib/` and `app/`.

```
npm run test:unit                            # Run all unit tests once
npm run test:unit:watch                      # Run in watch mode (re-runs on file change)
npx vitest run lib/permissions.test.ts       # Run a specific test file
```

### Playwright E2E Tests

**Current status (2026-02-15):** 346 tests across 29 spec files (Chromium). 5 browser projects (chromium, firefox, webkit, mobile-chrome + setup).

```
npx playwright test                          # Run all tests (all browsers)
npx playwright test --project=chromium       # Run in Chromium only (fastest)
npx playwright test tests/admin.spec.ts      # Run a specific spec file
npx playwright test --ui                     # Open interactive test UI
```

### Authentication: storageState

Tests use **pre-authenticated browser state** for fast, login-free test execution:

1. A global `tests/auth.setup.ts` runs once before all browser projects.
2. It logs in as each of the 6 test roles (owner, admin, moderator, editor, member, guest) and saves browser state to `tests/.auth/{role}.json`.
3. Test files declare their required role via `test.use({ storageState: storageStatePath("role") })` at the file or describe level.
4. This eliminates the ~3-5 second login round-trip per test.

The `loginAs(page, role)` helper is retained in `tests/helpers/auth.ts` as a fallback for per-test role overrides (currently used in 1 test).

### Test User Setup

Before running tests for the first time, create test users by running `Documentation/test-user-setup.sql` in the Supabase SQL Editor. This creates roles for 6 pre-provisioned test users (owner, admin, moderator, editor, member, guest). All use password `TestPassword123!`.

### Test Suite Structure

```
tests/
├── auth.setup.ts              # Global setup: pre-authenticate all 6 roles
├── helpers/auth.ts            # storageStatePath(), loginAs(), TEST_USERS
├── smoke.spec.ts              # Page load & redirect checks
├── auth.spec.ts               # Login, register, forgot password forms
├── navigation.spec.ts         # Sidebar links, access control
├── api-endpoints.spec.ts      # API contracts (status codes, response shapes)
├── cms-*.spec.ts (6 files)    # CMS pages, API, components, markdown, responsive, public-view
├── news.spec.ts               # News/articles functionality
├── events.spec.ts             # Events/calendar functionality
├── forum.spec.ts              # Forum posts, comments, moderation
├── messages.spec.ts           # Messaging system
├── profile-settings.spec.ts   # Profile & settings forms
├── dashboard.spec.ts          # Authenticated landing page
├── admin.spec.ts              # Admin access control & section rendering
├── admin-actions.spec.ts      # Admin interactive tab actions
├── crud-flows.spec.ts         # CRUD workflows (news, events, forum, messages)
├── feature-flows.spec.ts      # Feature integration flows
├── notifications.spec.ts      # Notification bell, dropdown, API
├── bugs.spec.ts               # Bug reports: API auth/CRUD, UI, widget, settings, email guard
├── i18n.spec.ts               # Language switching, cookies
├── accessibility.spec.ts      # axe-core accessibility audits
├── permissions-unit.spec.ts   # Permission system unit tests
├── roles-permissions.spec.ts  # E2E role-based access control
└── debug-game-account-modal.spec.ts  # Game account modal edge cases
```

### CI / Pre-commit

- **Husky pre-commit hooks** run lint-staged (ESLint + Prettier) on staged files.
- **GitHub Actions CI** runs `npm run lint`, `npm run type-check`, `npm run build`, and Playwright tests on push/PR.
- **Unit tests** can be run locally via `npm run test:unit`. CI currently runs Playwright only; Vitest can be added to the workflow as needed.

### Notes

- Admin panel tests use 10-15s timeouts for lazy-loaded tab content — `toContainText` and `toBeVisible` assertions auto-retry until the `next/dynamic` chunks load.
- Firefox and WebKit require separate browser installations (`npx playwright install`). Chromium is the primary test target.
- API tests accept both expected status codes and 429 (rate-limited) as valid responses.
- Tests use regex alternation for i18n-aware text matching (`/erstellen|create/i`).
- Tests handle conditional UI gracefully (e.g. "no clan access" messages).

## 13) Navigation Icon Preview (Design Tool)

A standalone icon preview page is available at `public/icon-preview.html` for browsing game assets and choosing medieval-themed replacements for sidebar navigation icons.

```
npm run dev
# Open: http://localhost:3000/icon-preview.html
```

See **handoff_summary.md → "Navigation Icons — Medieval Theme Overhaul"** for the full task list and suggested icon mapping.

**Note**: Remove `icon-preview.html` before production deployment.

## 14) Design System Asset Manager

Admin-only tool at `/design-system` for managing game assets, UI inventory, and assignments.

### First-time setup

1. Run migrations in Supabase SQL Editor (in order):
   - `Documentation/migrations/design_system_tables.sql`
   - `Documentation/migrations/design_system_render_type.sql`
2. Scan and copy assets (from `Design/Resources/Assets` into `public/design-assets/` + Supabase):
   ```
   npx tsx scripts/scan-design-assets.ts
   ```
3. Scan UI elements (from codebase + checklist into Supabase — includes render_type and preview_html):
   ```
   npx tsx scripts/scan-ui-elements.ts
   ```
4. Open `/design-system` in the browser (admin login required).

### Re-running scanners

Both scripts are idempotent (upsert on unique keys). Re-run after adding new assets or UI elements:

```
npx tsx scripts/scan-design-assets.ts        # re-scan game assets
npx tsx scripts/scan-ui-elements.ts          # re-scan UI elements
```

Flags:

- `--dry-run` — log actions without copying files or writing to DB
- `--skip-copy` — skip the file copy step (DB upsert only)
- `--skip-db` — skip DB upsert (copy files only)

## 15) Bug Reports

In `/bugs`:

- Any authenticated user can submit bug reports with title, description, category, page URL, and up to 5 screenshots.
- All reports are visible to all authenticated users (transparent issue tracking).
- Simple workflow: Open → Resolved → Closed.
- Admin/content manager controls appear inline for status changes, priority assignment (low/medium/high/critical), and category reassignment.
- Threaded comments allow back-and-forth between reporters and admins. Reporters receive a notification when someone comments on their report.
- Admin-managed categories (default: Bug, Feature Request, UI Issue, Data Problem, Other) — add/edit/delete via the admin controls or directly via the `/api/bugs/categories` API.
- A floating quick-report widget button appears on every page (bottom-right). It auto-captures the current page URL and opens a compact report form in a modal. Hidden on the `/bugs` page itself and for unauthenticated users.
- Deep-link: `/bugs?report=<id>` opens a specific report directly.
- Screenshots are stored in the Supabase Storage `bug-screenshots` bucket. The bucket is created by the migration; verify it exists in the Supabase Dashboard under Storage.

### First-time setup

1. Run migrations in order in Supabase SQL Editor:
   - `Documentation/migrations/bug_reports.sql`
   - `Documentation/migrations/bug_reports_v2.sql`
   - `Documentation/migrations/bug_reports_v3.sql`
2. Verify the `bug-screenshots` storage bucket was created (Dashboard → Storage). If not, create it manually with `public = true`.
3. Default categories (Bug, Feature Request, UI Issue, Data Problem, Other) are seeded by the migration.

### Email notifications (optional)

Admin email notifications require a [Resend](https://resend.com) account (free tier: 100 emails/day).

1. Create a Resend account and verify your sending domain.
2. Add these to `.env.local`:
   - `RESEND_API_KEY` — your Resend API key.
   - `RESEND_FROM_EMAIL` — verified sender (e.g. `bugs@yourdomain.com`).
   - `NEXT_PUBLIC_SITE_URL` — your site URL for the "View Report" link.
3. Admins (owner/admin only) opt in via Settings → Notifications → "Bug report email" toggle (off by default). The toggle is hidden for non-admin users; the API silently ignores `bugs_email_enabled` from non-admins.
4. If env vars are missing, email notifications are silently skipped — no errors.

## 16) Troubleshooting

- If data insert fails: check RLS policies and membership
- If user lookup fails: verify `profiles` trigger ran on signup
- If page redirects unexpectedly: confirm auth session in Supabase
- If YouTube embeds are blocked: verify CSP headers in `next.config.js`
- If forum category add/sort fails: verify `/api/admin/forum-categories` route and service role key
- If announcement banner not saving: verify `banner_url` column exists in articles table
- If admin tab shows loading skeleton indefinitely: check browser devtools network tab for chunk load errors (dynamic imports via `next/dynamic`)
- If admin tests fail with timeouts: increase the `timeout` value in `toContainText()` / `toBeVisible()` assertions, or check that the dev server is running
- If `.next` cache causes stale behavior after refactoring: delete `.next/` and restart `npm run dev`
- If API routes return HTML instead of JSON: verify that `proxy.ts` skips the auth redirect for `/api/` paths (the proxy should not redirect API requests — they handle their own auth)
- If bug report screenshot upload fails: verify the `bug-screenshots` storage bucket exists in Supabase Dashboard (Storage section) and that it is public
- If bug report categories are empty: re-run the `bug_reports.sql` migration — it seeds 5 default categories
- If Radix Select dropdowns lose their visible scrollbar after upgrading `@radix-ui/react-select`: Radix injects a runtime `<style>` tag hiding scrollbars on `[data-radix-select-viewport]`. Our `!important` overrides in `app/styles/components.css` counter this. Verify the injected styles haven't changed shape — see `handoff_summary.md → Radix Select Scrollbar` for the full explanation.
