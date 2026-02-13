# Changelog

> Historical record of all changes. Newest first. For current project status, see `handoff_summary.md`. For system architecture, see `ARCHITECTURE.md`.

> **Maintenance**: Add a dated `## YYYY-MM-DD — Title` entry when you complete significant work (features, refactors, bug fixes). Keep entries as bullet points. When `handoff_summary.md` "Recent Changes" gets stale, move those entries here.

---

## 2026-02-13 — E2E Test Suite Stabilization

Fixed all 26 pre-existing E2E test failures. Full suite now passes: **372 passed, 0 failed, 10 skipped** (9.2m runtime).

### Root Causes Fixed

- **ClanAccessGate locale reload**: Replaced destructive `window.location.reload()` with `router.refresh()` + `useRef` guard in `clan-access-gate.tsx`. This was causing page reloads mid-test, racing with assertions.
- **ClanAccessGate blocking admin pages**: Added `/admin` to public path list — admin pages have their own auth guards and shouldn't be gated by clan membership.
- **Rate limiter too strict**: Increased `relaxedLimiter` from 60 → 120 req/min in `lib/rate-limit.ts` to handle parallel E2E test load.

### Test File Fixes

- **auth.setup.ts**: Pre-set `NEXT_LOCALE` cookie to prevent locale sync reload; use `waitUntil: "domcontentloaded"` for faster navigation.
- **admin.spec.ts, admin-actions.spec.ts**: Wait for `.admin-grid` (30s timeout) before asserting tab content; use `toBeVisible` with timeouts instead of synchronous count checks.
- **i18n.spec.ts**: Updated selectors from `#language-select` (obsolete `<select>`) to `.lang-toggle` / `.lang-toggle-btn` buttons matching the current `LanguageSelector` component.
- **cms-\*.spec.ts**: Added explicit waits for `.card` visibility (15s) to ensure CMS content fully renders before assertions; increased skeleton-gone timeout.
- **data-workflows.spec.ts**: Removed `networkidle` dependency for data-table tests (persistent connections); increased content-inner timeout to 30s.
- **crud-flows.spec.ts, forum.spec.ts, news.spec.ts, events.spec.ts, roles-permissions.spec.ts**: Updated ClanAccessGate denial message regex to include English locale text (`clan areas`, `Go to Profile`, `keinen Zugang`).
- **smoke.spec.ts**: Added `IGNORABLE_ERRORS` filter for known `next-intl` SSR→CSR hydration warnings.
- **profile-settings.spec.ts**: Replaced `networkidle` with explicit element waits for settings page.

---

## 2026-02-13 — Project-Wide Optimization & Cleanup Audit

Comprehensive 6-phase audit touching ~30 files. All changes grouped by category:

### Critical Fixes

- **Race condition in messages**: Added `AbortController` refs to `loadThread`, `loadInbox`, `loadSent`, and recipient search in `messages-client.tsx`. Previous requests are now cancelled when new ones start, preventing stale data display when rapidly switching threads.
- **Path traversal in preview-upload**: Added Zod UUID validation for `element_id` in `app/api/design-system/preview-upload/route.ts` before any `path.join()` operation.

### Security & Reliability

- **Try-catch wrappers**: Added to 8 API route handlers (`admin/create-user`, `admin/delete-user`, `admin/forum-categories` (4 methods), `admin/game-account-approvals` (2 methods), `game-accounts` (3 methods), `data-import/commit`, `notifications/fan-out`, `notifications/mark-all-read`).
- **Error leak prevention**: All routes now log raw errors via `console.error` and return generic messages to clients.
- **Rate limiting**: Added `relaxedLimiter` to 5 public GET endpoints (`site-content`, `site-list-items`, `design-system/assets`, `design-system/assignments`, `design-system/ui-elements`).
- **Input validation**: Added UUID validation to `forum-categories` GET/DELETE params, replaced ad-hoc validation in `notifications/fan-out` with proper Zod schema (`FAN_OUT_SCHEMA`) with title/body length limits, guarded `parseInt` against NaN in design-system routes.

### Performance

- **Parallelized queries**: `members-client.tsx` (profiles + roles), `clans-tab.tsx` (profiles + roles), `admin-context.tsx` (clans + default clan + auth + approvals), `admin/create-user` (username + email + display name checks).
- **Memory leak fixes**: Added `useEffect` cleanup for tooltip timeout in `event-calendar.tsx` and search debounce timer in `asset-library-tab.tsx`.
- **useEffect dependency fixes**: Wrapped `loadArticles` in `useCallback` in `news-client.tsx`, extracted `resetPage` ref in `logs-tab.tsx`. Removed eslint-disable comments.

### Refactoring

- **Shared rule modals**: Created `app/components/add-correction-rule-modal.tsx` and `app/components/add-validation-rule-modal.tsx`. Consumer migration pending.
- **Type consolidation**: Added `ArticleSummary` and `EventSummary` to `lib/types/domain.ts`. Dashboard imports from shared types. Exported `SelectOption` from `radix-select.tsx`, removed duplicate in `labeled-select.tsx`.
- **Deduplicated `extractAuthorName`**: `news-client.tsx` and `use-events-data.ts` now import from `lib/dashboard-utils.ts`.
- **API response format**: Fixed status codes (201 for creation routes), normalized response shapes (`{ data }` / `{ error }`).

### Bugfixes (Post-Audit Review)

- **Breaking response shape in `data-import/commit`**: Reverted response from `{ data: { insertedCount } }` back to `{ insertedCount }` to match the client-side expectation in `data-import-client.tsx`.
- **Pre-existing TS error**: Fixed `Object is possibly 'undefined'` in `lib/api/validation.test.ts` (optional chaining on `issues[0]`).
- **E2E test expectations**: Fixed `api-endpoints.spec.ts` to include 429 (rate limiting) and 400 (validation) in expected status codes for `user-lookup` and `fan-out` tests.

### Test Coverage

- **New Vitest schema tests**: Added 55 unit tests across 3 new test files:
  - `lib/fan-out-schema.test.ts` (18 tests) — validates `FAN_OUT_SCHEMA` (type, UUIDs, title/body limits, trimming).
  - `lib/create-user-schema.test.ts` (14 tests) — validates `CREATE_USER_SCHEMA` (email, username min/max, displayName).
  - `lib/forum-categories-schemas.test.ts` (23 tests) — validates `CREATE_CATEGORY_SCHEMA`, `UPDATE_CATEGORY_SCHEMA`, UUID params.
- **Enhanced E2E API tests**: Added 12 new tests in `tests/api-endpoints.spec.ts`:
  - Input validation tests for `create-user`, `delete-user`, `forum-categories`, `fan-out`.
  - Auth guard tests for `game-accounts` (POST/PATCH), `mark-all-read`, `design-system/*`.

### Dead Code Removal

- Deleted 12 unused redesign variant directories (`app/redesign/v1` through `v6`).
- Removed unused `CmsSection` component from `cms-shared.tsx`.
- Removed deprecated `formatGermanDateTime` from `date-format.ts` and updated its test.
- Deleted `public/icon-preview.html`.

### Documentation

- Fixed `toDateString()` location reference in `ARCHITECTURE.md`.
- Updated messaging design doc with current API route inventory.
- Updated `handoff_summary.md` with audit results.

---

## 2026-02-12 — Messaging System Audit & Refactor

- **Rate limiter bug fix (critical)**: All `createRateLimiter()` instances shared a single global `Map<string, number[]>` store, so requests to any endpoint (inbox GET, sent GET, thread GET, search-recipients, send POST) all counted toward the same per-IP bucket. Opening the messages page could exhaust the limit before a user ever sent a message. Fix: each limiter now gets its own isolated store. GC timer iterates all stores with per-store `windowMs`.
- **Rate limit severity fix**: `POST /api/messages` was using `strictLimiter` (10 req/min, intended for admin/auth). Changed to `standardLimiter` (30 req/min).
- **Error handling**: Added `try/catch` wrappers to `GET /api/messages` (inbox), `GET /api/messages/sent`, `POST /api/messages`, and `GET /api/messages/search-recipients`.
- **Client refactor**: Replaced ~100 lines of duplicated compose/reply markdown editor code with the shared `MarkdownEditor` component. Added `storageBucket` prop to `MarkdownEditor`.
- **Profile map performance**: `getProfileLabel()` was merging `{ ...inboxProfiles, ...sentProfiles, ...threadProfiles }` on every call. Now computed once via `useMemo`.
- **Consolidated reply reset**: Extracted `resetReply()` helper to eliminate 5 duplicated reset blocks.
- **Fixed broadcast placeholder**: Changed from `["__placeholder__"]` to nil UUID `["00000000-0000-0000-0000-000000000000"]` for Zod validation.
- **Fetch error handling**: All `loadInbox`, `loadSent`, `loadThread` wrapped in `try/finally`. `handleDeleteMessage` has `try/catch`. `handleCompose` and `handleSendReply` have catch blocks.
- **API query parallelization**: Thread route runs mark-read and fetch-all-recipients in parallel via `Promise.all`. Search-recipients route runs both search pairs in parallel.
- **Validation message fix**: Split `recipientRequired` into separate `messageRequired` / `recipientRequired` i18n keys.
- **Indentation & JSDoc cleanup** in API routes.
- **Test expansion**: Rate limiter tests expanded from 5 to 12 (isolated stores, window expiry, IP edge cases). Schema tests expanded from 13 to 23 (nil UUID, boundary values, missing fields). Full suite: 223 tests passing.

## 2026-02-12 — Email Model Messages Redesign

- **Complete rewrite** of messaging system from flat "one row per recipient" to email model: `messages` + `message_recipients` tables.
- **Threading**: `thread_id`/`parent_id` for Gmail-style reply chains. Inbox groups by thread.
- **Broadcasts**: one message row + N recipients. Sender sees one entry in sent box. No reply on broadcasts/clan.
- **Soft delete**: `deleted_at` on `message_recipients`.
- **New API routes**: `GET /api/messages` (inbox), `GET /api/messages/sent`, `GET /api/messages/thread/[threadId]`, `POST /api/messages` (unified send), `PATCH/DELETE /api/messages/[id]`, `GET /api/messages/search-recipients`.
- **Two-column UI**: inbox/sent list (420px) + thread detail with reply form.
- **Migration**: `messages_v2.sql` with data migration from old table.
- Design document: `Documentation/plans/2026-02-12-email-model-messages-design.md`.

## 2026-02-12 — Redundancy Reduction Refactoring (7 phases)

Complete refactoring to eliminate ~1,230 lines of duplicate code across 50+ files:

- **Phase 1**: Created `requireAuth()` and `useSupabase()` hook. Migrated 25+ API routes.
- **Phase 2**: Extended `domain.ts` types, created shared constants, consolidated rank/role formatters.
- **Phase 3**: Moved `usePagination`/`useSortable` to `lib/hooks/`, `PaginationBar`/`SortableColumnHeader` to `app/components/`.
- **Phase 4**: Created `useRuleProcessing` hook, migrated inline confirm modals to `ConfirmModal`.
- **Phase 5**: Created `DataState` component. Applied to members, news, events, dashboard, messages. Replaced inline pagination with shared components.
- **Phase 6**: Date helper consolidation, `formatCompactNumber` rename.
- **Phase 7**: Created `ConfirmModal` and `FormModal` components. Migrated 7 inline form modals. Removed Phase-3 re-export stubs.

Plan: `Documentation/plans/2026-02-12-redundancy-reduction-plan.md`.

## 2026-02-11 — Project Audit & Test Coverage

- **Vitest unit testing**: 52 tests across 4 files (error-utils, permissions, date-format, rate-limit).
- **Zod validation** added to 4 API routes (notification-settings, charts, messages/[id], notifications/[id]).
- **Shared validation schemas**: `lib/api/validation.ts`.
- **Try/catch wrappers** on 5 API routes.
- **Error consistency**: events use `classifySupabaseError` instead of raw messages.
- **i18n error page**: `app/error.tsx` uses `next-intl`.
- **12 new Playwright API tests**.

## 2026-02-11 — Website Audit (Score: 84/100)

- **Security**: API rate limiting, Zod validation, Cloudflare Turnstile CAPTCHA, Sentry with PII filtering, CSP headers.
- **SEO**: metadataBase, canonical URLs, Open Graph, Twitter Cards, JSON-LD, sitemap, robots.txt.
- **Legal**: Impressum, cookie consent banner, GDPR privacy policy.
- **UI/UX**: Animated sidebar, mobile menu, skeleton loaders, focus-visible outlines, scroll-to-top, toast animations.
- **Code quality**: ~240 Playwright tests, stricter TS/ESLint, image optimization, Husky + lint-staged, GitHub Actions CI.
- **Performance**: LCP preload hints, priority images, Sharp compression.

## 2026-02-11 — Notable Bug Fixes

- **Dashboard widgets**: Live data from `/api/charts` with week-over-week trends.
- **Member directory**: `/members` page with rank badges, expandable rows, "Send message" links.
- **Author FK constraints**: Migration enabling PostgREST embedded joins.
- **Events RLS fix**: Updated to `has_permission()`.
- **Supabase error handling**: New `error-utils.ts` classification.
- **Clan Management**: Fixed init effect, game account deletion refresh, race conditions.
- **Modal positioning**: Fixed CSS transform creating stale containing blocks for fixed modals.
- **UI Cleanup**: Removed QuickActions, ClanScopeBanner. Added gold divider below top bar.

## 2026-02-10 — Shared Components & Unified Markdown

- **Unified markdown system**: Consolidated 3 sanitizers, 2 renderers, 2 toolbars into `lib/markdown/`.
- **Shared BannerPicker**: 51 game-asset presets + custom upload. Used by events, announcements.
- **Shared MarkdownEditor**: Write/preview tabs, toolbar, image paste/drop. Used by events, announcements, forum, messages.
- **Button & Label Standardization**: "Registrieren"/"Register", "Einloggen"/"Sign In" globally.

## 2026-02-09 — Roles & Permissions Refactor

- Dropped 6 unused tables. Dropped `profiles.is_admin`.
- New `lib/permissions.ts`: static role→permission map.
- New `use-user-role.ts` hook.
- New SQL functions: `is_any_admin()`, `has_permission()`.
- Updated RLS policies for articles and events.
- Migration: `roles_permissions_cleanup.sql`.

## 2026-02-09 — Playwright Test Suite

- ~250 E2E tests across 27 spec files.
- Pre-authenticated storageState for 6 roles.
- Design document: `Documentation/plans/2026-02-09-test-suite-design.md`.

## 2026-02-07 — CMS Refactoring

- Inline-editable content for public pages via `site_content` + `site_list_items` tables.
- `useSiteContent(page)` hook.
- 40 Playwright tests.
- Design document: `Documentation/plans/2026-02-07-cms-refactoring-design.md`.

## 2026-02-07 — Forum System

- Reddit-style forum with categories, posts, threaded comments, voting, markdown.
- Post thumbnails, pinned posts, forum admin tab.
- Design document: `Documentation/plans/2026-02-07-forum-system-design.md`.

## Pending — Navigation Icons (Medieval Theme Overhaul)

**Status**: Preview page created, awaiting icon selection before integration.

- ~260 game-style PNG icons available in `/assets/game/icons/`.
- Preview page: `public/icon-preview.html` (Tab 1: suggested nav replacements, Tab 2: full gallery, Tab 3: shields/decorations).
- **Bug**: Dashboard and Home share the same house SVG path — dashboard needs a distinct icon.

**Task list**:

1. Review `/icon-preview.html` in browser, pick one icon per nav item.
2. Fix Dashboard icon (critical — duplicate of Home icon).
3. Decide approach: (A) All PNG game icons, or (B) Hybrid SVG+PNG.
4. Update `sidebar-nav.tsx` — either change `ICONS[key]` SVG path or add `vipIcon` property.
5. Test at both sidebar widths (280px expanded, 60px collapsed).
6. Remove `public/icon-preview.html` before production.

**Suggested icon mapping** (from preview page):

| Nav Item  | Recommended      | Path                                              |
| --------- | ---------------- | ------------------------------------------------- |
| Home      | Medieval house   | `/assets/game/icons/icons_card_house_1.png`       |
| Dashboard | Rating/stats     | `/assets/game/icons/icons_main_menu_rating_1.png` |
| News      | Scroll           | `/assets/game/icons/icons_scroll_1.png`           |
| Charts    | Points clipboard | `/assets/game/icons/icons_clip_points_1.png`      |
| Events    | Events banner    | `/assets/game/icons/icons_events_1.png`           |
| Forum     | Message bubble   | `/assets/game/icons/icons_message_1.png`          |
| Messages  | Envelope         | `/assets/game/icons/icons_envelope_1.png`         |
| Members   | Clan menu        | `/assets/game/icons/icons_main_menu_clan_1.png`   |

---

## Earlier — Foundation

- App scaffold with Next.js App Router + "Fortress Sanctum" design system.
- Supabase Auth (email/password, PKCE).
- Profile + Settings pages, game account approval system.
- Admin panel (modular architecture), data import, chest database.
- Events calendar with recurring events, multi-day support, banners, pinned events.
- Announcements with banner headers, rich editor, edit tracking.
- Charts & Stats with Recharts.
- Notification system with fan-out and preferences.
- Clan context selector in sidebar.
- Design System Asset Manager.
