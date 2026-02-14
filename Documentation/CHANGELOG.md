# Changelog

> Historical record of all changes. Newest first. For architecture, see `ARCHITECTURE.md`. For current status, see `handoff_summary.md`.

---

## 2026-02-14 — Fix: Event cards always show original author

- Event cards (day panel, upcoming sidebar, past list) now always display the original author via `createdBy` label instead of misleadingly showing "Edited by {author}" when the event was modified. Events lack an `updated_by` column, so the previous "Edited by" label incorrectly implied the original author was the editor.
- Added a generic "(edited)" indicator when `updated_at !== created_at` to preserve the edit signal without misattributing it.
- Added `edited`/`bearbeitet` i18n key to the events namespace in both locale files.

---

## 2026-02-14 — Performance audit & fixes (85 → 89)

- Removed redundant `<link rel="preload">` tags from root layout for images that already use `next/image` with `priority` (prevented double downloads of raw + optimized assets).
- Added `sizes` attribute to small icon images on auth pages and dashboard (`batler_icons_star_4/5.png`) to prevent oversized file serving.
- Added explicit `loading="lazy"` to footer divider image.
- Improved `--color-text-muted` contrast from `#8a7b65` to `#9d8d76` (WCAG AA compliance on dark card backgrounds).
- Removed auth-gated pages (`/forum`, `/events`, `/charts`) from sitemap — they redirect unauthenticated crawlers to `/home`, causing duplicate titles and uncrawlable entries.

---

## 2026-02-14 — Best practices audit & improvements

- Made browser Supabase client an explicit module-level singleton (`lib/supabase/browser-client.ts`).
- Parallelized two independent DB queries in `GET /api/messages/archive` with `Promise.all` (was sequential).
- Decoupled `forum-utils.ts` from browser client import — `resolveAuthorNames` now accepts generic `SupabaseClient`.
- Added route-level `loading.tsx` + `error.tsx` for 6 secondary routes: `home`, `about`, `contact`, `privacy-policy`, `members`, `settings`.

---

## 2026-02-14 — Test coverage audit & bug fixes

- Fixed RLS silent delete gap: 7 client-side delete operations now chain `.select("id")` and verify `data.length`.
- Data import `COMMIT_ROW_SCHEMA` now uses `dateStringSchema` (YYYY-MM-DD regex).
- 68 new unit tests (528 → 596), 13 new API tests (49 → 62), 16 new E2E tests.

---

## 2026-02-14 — Second-pass code review (8 bug fixes)

- Fixed `handleVotePost` failing on deep-linked posts (searched empty `posts` list).
- Fixed event highlight not expanding when clicking upcoming sidebar item.
- Fixed wrong toast key in `handleMarkNotificationRead`.
- Fixed silent error handling in forum edit, news fan-out, data import rule loading, game account default.
- Added `isSubmitting` guard to forgot-password page.
- Fixed wrong i18n keys in settings and members page.

---

## 2026-02-14 — Systematic code review (9 phases)

- Replaced ~40 hardcoded strings with `useTranslations()`.
- Replaced all 6 `window.confirm` calls with `ConfirmModal`.
- Replaced unsafe `as unknown as Array<…>` casts with typed interfaces.
- Added `response.ok` checks to ~10 fetch calls in messaging.
- Extracted inline helpers outside components for performance.
- Added `useEffect` cleanup for `setTimeout` in 3 components.
- Created centralized `lib/public-paths.ts`.
- Fixed duplicate dashboard/home icon.

---

## 2026-02-14 — E2E test fixes

- Fixed Flatpickr `setDate` race condition (polls for `_flatpickr` instance).
- Fixed post-submit verification (uses `page.reload()` instead of client-side state).
- Replaced all `networkidle` waits with `domcontentloaded` + element waits.
- Fixed banner preset filename typo (`exhange` not `exchange`).

---

## 2026-02-14 — Code review fixes (6 issues)

- Created dedicated `/api/admin/resend-invite` endpoint (was broken, sent wrong payload to create-user).
- Added DOMPurify sanitization for `dangerouslySetInnerHTML` in design-system.
- Escaped LIKE wildcards in display name uniqueness check.
- Filtered null `user_id` values in clans-tab assign modal.
- Added `aria-label` to language selector radio buttons.
- Surfaced `loadClans` error in `use-data-table.ts`.

---

## 2026-02-14 — Fix: Admin pages not redirecting unauthenticated users

- Removed `/admin` from `isPublicPath()`. Created `isClanExemptPath()` for clan-gate bypass.

---

## 2026-02-14 — Feature: Notifications tab on Messages page

- Fourth tab (Notifications) with unread badge, per-item delete, delete-all.
- Bell footer links to `/messages?tab=notifications`.
- Query parameter routing for all tabs.

---

## 2026-02-14 — Feature: Split banner for two-event calendar days

- Calendar days with exactly two banner events show a top/bottom vertical split.

---

## 2026-02-14 — Fix: Admin Users tab showing only 25 users

- Removed hard `.limit(25)` that silently truncated the user list.

---

## 2026-02-14 — Fix & Feature: Notification improvements

- Shadow members now receive notifications (removed `.eq("is_shadow", false)` filter).
- Fan-out skips notification creation for test users.
- Added delete single notification and delete-all endpoints.

---

## 2026-02-13 — Playwright test suite fix (17 failures → 0)

- Fixed `.content-inner` strict mode violations (`.first()` on all 14 files).
- Updated drifted UI selectors across 10+ test files.
- Added `KNOWN_A11Y_EXCLUSIONS` for genuine nested-interactive patterns.
- Replaced `networkidle` with `domcontentloaded` + element waits.

---

## 2026-02-13 — Feature: Message archive

- Gmail-style archive for inbox and sent. Third "Archive" tab with combined list.
- Batch archive/unarchive via multi-select. Reversible via unarchive.
- Migrations: `messages_archive.sql`.

---

## 2026-02-13 — Feature: Message delete from inbox/outbox

- Per-row trash icon + multi-select batch delete with confirmation modal.
- Inbox: soft-deletes `message_recipients`. Sent: sets `sender_deleted_at`.
- Migration: `messages_sender_delete.sql`.

---

## 2026-02-13 — Dashboard deep-links & forum navigation fix

- Dashboard items link to `/news?article=<id>`, `/events?date=…&event=<id>`, `/forum?post=<id>`.
- Fixed forum deep-link trapping users in thread view (decoupled effect from view state).

---

## 2026-02-13 — Code review & hardening (11 phases)

Key improvements across all phases:

- **Security**: Escaped LIKE wildcards, replaced raw `error.message` leakage, added `requireAuth()` to design-system GETs, DOMPurify for `dangerouslySetInnerHTML`.
- **Error handling**: Toast feedback on 8+ silent Supabase operations. Replaced `console.error` with `captureApiError` (Sentry) in 17 routes. Fixed 13 empty catch blocks.
- **Performance**: Service-role client singleton. Parallelized queries in 4 components. Extracted `useNews`, `useChartsData`, `useDashboardData` hooks.
- **Decomposition**: Split 5 oversized components (data-import, data-table, messages, events, forum) into hook + subcomponents. Created `PageShell`, `ConfirmModal`, `FormModal` shared components.
- **API hardening**: Added Zod validation to 8 routes. Created `apiError()` and `parseJsonBody()` helpers. Fixed auth ordering.
- **CSS**: Split `globals.css` (7455L) into 10 modular files under `app/styles/`. Replaced 294 raw `rgba()` values with CSS variables.
- **Testing**: Added 194 unit tests across 8 files. Created `captureApiError` logger for Sentry.
- **Error boundaries**: Added `app/global-error.tsx`, auth loading skeleton.

---

## 2026-02-13 — Forum thread auto-linking

- Creating events/announcements auto-creates linked forum threads.
- Bidirectional edit/delete sync via `SECURITY DEFINER` DB triggers.
- Deep-link `/forum?post=<id>` opens post directly.
- Migration: `forum_thread_linking.sql`.

---

## 2026-02-13 — Forum comment/reply markdown toolbar

- Unified contextual comment/reply form with full markdown toolbar.
- "Replying to [username]" indicator. Form hidden by default, shown on click.

---

## 2026-02-13 — E2E test suite stabilization

- Fixed `ClanAccessGate` locale reload (replaced `window.location.reload()` with `router.refresh()`).
- Increased `relaxedLimiter` from 60 → 120 req/min for parallel test load.
- Result: 372 passed, 0 failed.

---

## 2026-02-13 — Project-wide optimization audit

- **Race condition fix**: Added `AbortController` to message loading functions.
- **Path traversal fix**: Zod UUID validation on preview-upload `element_id`.
- **Try-catch**: Added to 8 API route handlers.
- **Rate limiting**: Added to 5 public GET endpoints.
- **Parallelized queries**: members, clans-tab, admin-context, create-user.
- **Dead code**: Deleted 12 unused redesign variant directories.
- **New tests**: 55 unit tests across 3 schema test files, 12 E2E API tests.

---

## 2026-02-13 — UI polish: buttons, filters, event edit indicator

- "Edited by" indicator on events (calendar, sidebar, past list).
- Button style overhaul (tighter padding, refined gradients).
- Announcements filters moved to top, collapsed by default.

---

## 2026-02-13 — Code quality: CSS variables, component extraction

- Replaced 294 raw `rgba()` values with CSS custom properties.
- Extracted `DayPanelEventCard`, `UpcomingEventCard`, `NewsForm` as memoized components.

---

## 2026-02-12 — Messaging system audit & refactor

- **Critical**: Fixed rate limiter sharing a single global store across all instances.
- Replaced ~100 lines of duplicate markdown editor code with shared `MarkdownEditor`.
- Profile map computed once via `useMemo` (was merging on every call).
- Rate limiter tests expanded (5 → 12).

---

## 2026-02-12 — Email model messages redesign

- Rewrote messaging from flat model to `messages` + `message_recipients`.
- Gmail-style threading via `thread_id`/`parent_id`.
- Broadcasts: one message + N recipients.
- Migration: `messages_v2.sql`.

---

## 2026-02-12 — Redundancy reduction (7 phases)

Eliminated ~1,230 lines of duplicate code across 50+ files:

- Created `requireAuth()`, `useSupabase()`, `DataState`, `ConfirmModal`, `FormModal`, `useRuleProcessing`.
- Moved `usePagination`/`useSortable` to `lib/hooks/`, `PaginationBar`/`SortableColumnHeader` to `app/components/`.
- Extended `domain.ts` with shared types. Created `lib/constants.ts`.

---

## 2026-02-11 — Project audit & test coverage

- Added Vitest (52 unit tests), Zod validation on 4 API routes.
- 12 new Playwright API tests.
- Website audit score: 43 → **84/100 (B)**.
- Security: rate limiting, Zod, Turnstile CAPTCHA, Sentry, CSP headers.
- Legal: Impressum, cookie consent, GDPR privacy policy.

---

## 2026-02-11 — Notable bug fixes

- Dashboard widgets: live data from `/api/charts`.
- Member directory: `/members` page.
- Author FK constraints enabling PostgREST joins.
- Events RLS updated to `has_permission()`.
- Clan management init/refresh/race-condition fixes.
- Modal positioning fix (CSS transform containing block).

---

## 2026-02-10 — Shared components & unified markdown

- Unified markdown system: 3 sanitizers → 1, 2 renderers → 1, 2 toolbars → 1.
- Shared `BannerPicker` (51 presets + upload) and `MarkdownEditor`.
- Button/label standardization ("Registrieren"/"Register", "Einloggen"/"Sign In").

---

## 2026-02-09 — Roles & permissions refactor

- Dropped 6 unused tables and `profiles.is_admin`.
- New `lib/permissions.ts` with static role→permission map.
- New `has_permission()` SQL function mirroring TypeScript map.
- Migration: `roles_permissions_cleanup.sql`.

---

## 2026-02-09 — Playwright test suite

- ~250 E2E tests across 27 spec files with pre-authenticated storageState.

---

## 2026-02-07 — CMS refactoring

- Inline-editable content via `site_content` + `site_list_items` tables.
- `useSiteContent(page)` hook. 40 Playwright tests.

---

## 2026-02-07 — Forum system

- Reddit-style forum with categories, posts, threaded comments, voting, markdown.

---

## Earlier — Foundation

- App scaffold with Next.js App Router + "Fortress Sanctum" design system.
- Supabase Auth, profile/settings, game account approval, admin panel.
- Data import, chest database, events calendar, announcements, charts.
- Notification system, clan context, Design System Asset Manager.
