# Changelog

> Historical record of changes (newest first). For architecture see `ARCHITECTURE.md`. For setup see `runbook.md`.

---

## 2026-02-21

### Added

- **Data pipeline enhancement:** Complete date-tracking and event-linking system for data submissions.
  - `reference_date` column on `data_submissions` tracks what day the data represents (derived from entries or set explicitly).
  - `linked_event_id` on submissions and `event_results` links event data to calendar events.
  - Unique index on `member_snapshots(clan_id, game_account_id, date)` prevents duplicate member data per day.
  - Conflict detection: submitting member data for an already-covered date returns 409 with overwrite/cancel UI.
- **Members page data display:** Koordinaten, Machtpunkte, and Last Updated columns pulled from latest `member_snapshots` via `/api/members/snapshots`.
- **Submission metadata editing (always editable regardless of status):**
  - Member submissions: date picker for `reference_date` with duplicate-date warnings.
  - Event submissions: searchable RadixSelect for linking/unlinking calendar events.
  - PATCH cascades to production tables when submission is already approved.
- **Event results in calendar:** Expanding a calendar event now shows linked event results (player leaderboard) fetched from `event_results`.
- **Validation lists admin UI:** New "Validierungslisten" sub-tab in the Data section. Full CRUD for OCR corrections and known names with inline editing, type filtering, and add/delete buttons. New DELETE and PATCH endpoints on `/api/import/validation-lists`.
- **Inline submission actions in list view:** Approve-all, reject-all, and delete buttons directly in each submission row.
- **Server-busy indicator:** When a review/delete action takes longer than 5 seconds, a hint appears.

### Changed

- **Merged "Daten importieren" and "Einreichungen" tabs into a single "Daten" tab:** The separate import and submissions admin sections are now one unified tab with a compact inline dropzone next to the filters. Import preview, success, and error feedback render contextually below the filter bar. Uses the chest icon.
- **Submit endpoint stores reference_date:** All submissions now persist `reference_date` derived from payload or entry timestamps.
- **Submit endpoint rate limit tightened:** `/api/import/submit` moved from `relaxedLimiter` to `standardLimiter` (30 req/min).
- **Delete any submission:** Removed the pending-only restriction. Production data preserved via `ON DELETE SET NULL`.
- **Review route copies linked_event_id:** When approving event submissions, `linked_event_id` propagates to production `event_results`.

---

## 2026-02-19

### Fixed

- **Auth error messages untranslated:** Login, register, forgot-password, and update-password pages displayed raw Supabase error messages. Added `getAuthErrorKey()` utility mapping GoTrue errors to i18n keys with translated messages in both locales.

---

## 2026-02-18

### Added

- **Pull-based broadcast visibility with rank filtering:** Broadcasts no longer create per-user `message_recipients` rows. Targeting criteria (`target_ranks`, `target_roles`, `target_clan_id`) stored on the message, visibility resolved at read time. New tables: `message_reads`, `message_dismissals`. New module: `lib/messages/broadcast-targeting.ts`. New component: `app/messages/rank-filter.tsx` (Radix Popover with rank presets).
- **Leadership reply-all on broadcasts:** Users with leader/superior rank or Webmaster role can reply to broadcast threads. Thread API returns `can_reply` metadata.

### Changed

- **Messages thread view → chat timeline:** Replaced email-style stacked cards with flat chat bubbles (own messages right, received left). Subject shown once in header. Single thread-level reply. Auto-scroll to latest message. Trailing blockquotes cleaned via DB migration.
- **Next.js Image migration:** Migrated ~25 files from `<img>` to `<Image>`. Restored `no-img-element` ESLint rule with override for markdown renderers.
- **Sidebar icon reassignment:** Reshuffled sidebar navigation icons for better visual fit across main and admin sections.
- **Complete GameButton adoption:** Replaced all `className="button primary/danger"` elements site-wide with `GameButton` variants across ~30 files.
- **Game asset migration:** Re-encoded design assets through Sharp and moved to `public/assets/game/`. Updated all component references.

### Fixed

- System messages incorrectly included in broadcast visibility logic.
- Duplicate broadcasts in inbox when `typeFilter === "all"`.
- Broadcast reply-all failures with null `target_ranks`.
- Content managers unable to reply to own broadcast threads.
- Delete button hidden for broadcast messages in thread view.
- Inbox broadcast filtering N+1 queries (added batched sync matching).
- Rank filter dropdown z-index issues (switched to Radix Popover).
- Inbox tab header text clipped with large badge numbers.
- Mobile sidebar admin nav, clan logo, section divider issues.
- Messages reply "Invalid input" from null subject.
- Approvals table column misalignment.
- Messages thread not rendering on first click (removed outer `dynamic()`).
- Pagination page-jump input misaligned (CSS specificity fix).
- Settings button text overflow (added `width: fit-content` to `.gbtn`).
- **UI/UX polish batch (P1-P3):** Top chrome compaction, auth progressive disclosure, unified loading skeletons, mobile navigation refinements, interaction + focus polish, accessibility hardening, console warning cleanup.

---

## 2026-02-17

### Added

- Vercel Web Analytics integration.
- Shared auth state context/provider for deduplicated session lookups.
- Inline membership editing in admin Users tab.
- Email confirmation status column + manual confirm in Users tab.
- Approvals tab split layout (registrations + game account approvals).
- Messages mobile panel-toggle pattern with back button.
- Playwright clan-access helper and messages API contract suite.

### Changed

- UI density/hierarchy pass on news, forum, bugs list surfaces and admin tables.
- Admin IA clarity pass with active-tab context and standardized toolbar patterns.
- Messaging route internals refactored to shared profile map + label helpers.
- Heavy feature panels converted to dynamic imports for code splitting.
- Brand copy refreshed to `[THC] Chiller & Killer` across all surfaces.
- Performance optimization: widget deferral, image loading priorities, auth/role dedupe, events query windowing, route-level code splitting.

### Fixed

- Stale Playwright workflows and obsolete migration steps.
- API documentation drift and runbook stale sections.
- Desktop top-bar parity, gold color rebase (brown-amber → true gold).
- Messages recipient privacy (removed email from API payloads).
- Playwright suite-wide migration from `networkidle` to `domcontentloaded`.
- Admin hydration mismatch, hero clipping, mobile touch targets.
- Production type-check blocker (deprecated MediaQueryList listeners).
- Comprehensive responsive/mobile fixes across all feature pages.

---

## 2026-02-16

### Removed

- **Data import, chest database, validation rules, correction rules, analytics/charts:** All routes, components, API endpoints, parsers, and related DB tables dropped. Analytics replaced with placeholder page.

### Fixed

- Messages tab badge layout shift.

### Changed

- Admin panel reduced to: clans, users, approvals, forum, design system, logs.
- ~300 unused translation keys cleaned up.

---

## 2026-02-16

### Security

- SVG XSS blocked in markdown URLs, LIKE injection fixed, auth-before-parse in admin routes, email validation hardened, CAPTCHA fails in production when unconfigured, reporter emails removed from bugs API.

### Fixed

- Banner filename typo, `statsError` exposure in dashboard hook, hardcoded German strings replaced with i18n.
- Deleted stale `/redesign` pages and references.

### Added

- `no-console` ESLint rule, `audit:deps` npm script, descriptive alt text on images.

---

## 2026-02-15

### Added

- **Bug report / ticket system:** Full `/bugs` page with list/detail views, screenshot uploads (up to 5), status workflow (open/resolved/closed), admin priority, threaded comments, admin-managed categories, floating quick-report widget, markdown editing, opt-in admin email notifications via Resend API.
- **Guest role + rank:** Guest promoted to member-level permissions. New "guest" rank below soldier.
- **Webmaster role rename + protection:** "Owner" → Webmaster. Role change protection enforced at UI and DB levels.
- Bug report category i18n via slugs. Page selector dropdown in report form.
- Bug report list redesign with card layout and pagination.

### Fixed

- Project-wide CSS browser compatibility (17 issues across 7 files): flex shrinking, word-break, border shift, hover-only visibility, webkit-appearance.
- Event cards always show original author (not misleading "Edited by").

---

## 2026-02-14

### Added

- Notifications tab on Messages page with unread badge and delete-all.
- Split banner for two-event calendar days.

### Changed

- Performance audit (85 → 89): removed redundant preloads, added image sizes, improved contrast.
- Best practices: Supabase client singleton, parallelized queries, route-level loading/error pages.
- Test coverage: 68 new unit tests, RLS silent delete fixes, Zod validation on data import.
- Systematic code review (9 phases): ~40 i18n replacements, ConfirmModal adoption, typed interfaces, fetch error handling, centralized public paths.

### Fixed

- 8 bug fixes from second-pass review (vote post, event highlight, toast key, silent errors).
- E2E test fixes (Flatpickr race, networkidle replacement, banner typo).
- Admin pages not redirecting unauthenticated users.
- Admin Users tab 25-user limit removed.
- Shadow members now receive notifications.

---

## 2026-02-13

### Added

- Message archive (Gmail-style with batch archive/unarchive).
- Message delete from inbox/outbox (soft-delete pattern).
- Forum thread auto-linking (events/announcements auto-create forum threads, bidirectional sync via DB triggers).
- Forum comment/reply markdown toolbar.

### Changed

- Dashboard deep-links to news, events, and forum posts.
- Project-wide optimization audit: race condition fixes, path traversal fix, rate limiting on 5 endpoints, dead code removal, 55 new unit tests.
- Code review & hardening (11 phases): security (escaped LIKE, DOMPurify), error handling (toasts, Sentry), performance (parallelized queries, extracted hooks), decomposition (5 oversized components split), API hardening (Zod on 8 routes), CSS split (7455-line globals.css → 10 modules), 194 unit tests.

### Fixed

- Playwright test suite (17 failures → 0): strict mode violations, drifted selectors, networkidle replacement.
- ClanAccessGate locale reload, rate limiter alignment for test load.

---

## 2026-02-12

### Changed

- Messaging system rewritten: flat model → `messages` + `message_recipients`. Gmail-style threading via `thread_id`/`parent_id`. Broadcasts: one message + N recipients.
- Messaging audit: fixed rate limiter sharing global store, replaced duplicate markdown editor code, profile map optimization.
- Redundancy reduction (7 phases, ~1,230 lines): created `requireAuth()`, `useSupabase()`, `DataState`, `ConfirmModal`, `FormModal`. Moved shared hooks to `lib/hooks/`.

---

## 2026-02-11

### Added

- Vitest (52 unit tests), Zod validation on 4 API routes, 12 Playwright API tests.
- Security: rate limiting, Turnstile CAPTCHA, Sentry, CSP headers.
- Legal: Impressum, cookie consent, GDPR privacy policy.

### Fixed

- Dashboard widgets with live data, member directory, events RLS, clan management race conditions.

---

## 2026-02-10

### Changed

- Unified markdown system (3 sanitizers → 1, 2 renderers → 1, 2 toolbars → 1).
- Shared `BannerPicker` (51 presets + upload) and `MarkdownEditor`.

---

## 2026-02-09

### Changed

- Roles & permissions refactor: dropped 6 unused tables, new `lib/permissions.ts` with static role→permission map, `has_permission()` SQL function.

### Added

- Playwright test suite (~250 E2E tests across 27 spec files).

---

## 2026-02-07

### Added

- CMS system: inline-editable content via `site_content` + `site_list_items` tables.
- Forum system: categories, posts, threaded comments, voting, markdown.

---

## Earlier

- App scaffold: Next.js App Router + "Fortress Sanctum" design system.
- Supabase Auth, profile/settings, game account approval, admin panel.
- Events calendar, announcements, notification system, clan context.
