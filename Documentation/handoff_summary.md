# Handoff Summary

Context transfer for a new chat session. For architecture and file locations, see `ARCHITECTURE.md`. For change history, see `CHANGELOG.md`.

**Removed features (replaced with placeholders):** Data import, chest database viewer, validation rules, correction rules, analytics/charts, and related tables (`chest_entries`, `validation_rules`, `correction_rules`, `scoring_rules`). See `CHANGELOG.md` for details.

## Quick Start

```bash
npm install
cp .env.local.example .env.local   # fill in Supabase keys
npm run dev                         # http://localhost:3000
```

### Required Environment (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
TURNSTILE_SECRET_KEY=...            # optional: CAPTCHA on forgot-password
SENTRY_DSN=...                      # optional: error tracking
RESEND_API_KEY=...                  # optional: bug report email notifications
RESEND_FROM_EMAIL=...               # optional: verified sender for emails
NEXT_PUBLIC_SITE_URL=...            # optional: site URL for email links
```

### Database Setup

Run SQL migrations in the order listed in `Documentation/runbook.md` section 1. All files are in `Documentation/migrations/`.

## Test Suite

### Unit Tests (Vitest) — 581 tests, 30 files

Run: `npm run test:unit`

| File                                   | Tests | Covers                                                                                                                                                                                                                                                             |
| -------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app/events/events-utils.test.ts`      | 53    | Date/time, recurrence, display helpers                                                                                                                                                                                                                             |
| `lib/permissions.test.ts`              | 45    | Roles, validation, permission helpers, isOwner, canChangeRoleOf, ROLE_LABELS                                                                                                                                                                                       |
| `app/members/members-utils.test.ts`    | 50    | getRoleColor, getRankColor, compareMemberOrder, countRoleSubstitutes, rank/role constants                                                                                                                                                                          |
| `lib/api/validation.test.ts`           | 30    | UUID, notification settings (incl. bugs_email_enabled)                                                                                                                                                                                                             |
| `lib/dashboard-utils.test.ts`          | 25    | Trends, formatting, author extraction                                                                                                                                                                                                                              |
| `lib/messages-schemas.test.ts`         | 23    | SEND_SCHEMA for messages API                                                                                                                                                                                                                                       |
| `lib/forum-categories-schemas.test.ts` | 23    | UUID, category schema validation                                                                                                                                                                                                                                   |
| `lib/fan-out-schema.test.ts`           | 18    | Fan-out notification schema                                                                                                                                                                                                                                        |
| `lib/create-user-schema.test.ts`       | 14    | Admin create-user schema                                                                                                                                                                                                                                           |
| `lib/supabase/error-utils.test.ts`     | 12    | Error classification + i18n keys                                                                                                                                                                                                                                   |
| `lib/rate-limit.test.ts`               | 12    | Rate limiting, IP tracking                                                                                                                                                                                                                                         |
| `lib/markdown/strip-markdown.test.ts`  | 16    | Markdown-to-plain-text stripping (headings, bold, code, links, images, lists, blockquotes)                                                                                                                                                                         |
| Others (19 files)                      | ~334  | check-role, forum-sync, role-access, admin-access, config, date-format, sanitize-markdown, renderers, forum-utils, forum-thumbnail, admin-types, use-sortable, design-system-types, public-paths, validation-helpers, banner-presets, use-pagination, is-test-user |

### E2E Tests (Playwright) — 435 tests, 29 files (Chromium listing)

Run: `npx playwright test`

- Pre-authenticated `storageState` for 6 roles (owner, admin, moderator, editor, member, guest).
- i18n-aware: text assertions use regex alternation for DE/EN.
- Rate-limit tolerant: API tests accept 429 alongside expected status codes.
- Avoid `waitForLoadState("networkidle")` — persistent Supabase connections prevent it from resolving. Use `domcontentloaded` + explicit element waits.
- All `.content-inner` locators must use `.first()` (pages render 2+ via `PageShell`).

## Recently Completed

### Pull-Based Broadcast Visibility with Rank Filtering (2026-02-18)

Major architectural shift for broadcast messaging. Broadcasts no longer create per-user `message_recipients` rows. Instead, targeting criteria are stored on the message itself and visibility is resolved at read time.

- **Pull-based visibility:** Broadcast (`broadcast`, `clan`) messages store `target_ranks`, `target_roles`, `target_clan_id` on the `messages` row. Inbox and thread views check the user's current rank, clan membership, and role against these criteria. New clan members and promoted members automatically see relevant historical broadcasts. **System messages** (e.g., "Game Account Approved") are NOT pull-based — they use `message_recipients` like private messages.
- **Rank filtering in compose:** Content managers can filter broadcasts by rank via a Radix Popover dropdown with preset chips ("Führung" = leader + superior + Webmaster, "Mitglieder" = officer + veteran + soldier + guest). All ranks selected = `target_ranks: NULL` (backwards compatible). Uses `@radix-ui/react-popover` for portaled rendering (no z-index issues).
- **Leadership reply-all:** Users with leader/superior rank in the target clan, the Webmaster (owner) role, or the original sender can reply to broadcast threads. Replies copy the thread root's targeting criteria and are delivered as broadcasts to all matching recipients.
- **New DB tables:** `message_reads` (broadcast read tracking), `message_dismissals` (broadcast delete/archive per user).
- **New shared module:** `lib/messages/broadcast-targeting.ts` centralizes recipient resolution, visibility checking (async per-message + batched sync via `loadUserBroadcastContext`), and reply-all authorization.
- **New component:** `app/messages/rank-filter.tsx` — rank filter Radix Popover dropdown with presets.
- **Dual-path inbox:** `GET /api/messages` queries private/system messages via `message_recipients` (Part A) and broadcasts via rank matching (Part B), merging results. Part B uses `loadUserBroadcastContext()` + `userMatchesBroadcastTargetingSync()` for O(1) per-message matching.
- **Thread metadata:** `GET /api/messages/thread/[threadId]` returns `meta.can_reply` and `meta.thread_targeting` for client-side reply logic.
- **Migration:** `Documentation/migrations/messages_broadcast_targeting.sql`

**Key files:** `lib/messages/broadcast-targeting.ts`, `app/api/messages/route.ts`, `app/api/messages/thread/[threadId]/route.ts`, `app/api/messages/[id]/route.ts`, `app/api/messages/archive/route.ts`, `app/api/messages/sent/route.ts`, `app/messages/use-messages.ts`, `app/messages/messages-compose.tsx`, `app/messages/rank-filter.tsx`, `app/messages/messages-thread.tsx`, `lib/types/domain.ts`, `lib/types/messages-api.ts`.

### Messages: Chat-Style Thread View (2026-02-18)

Replaced the email-style stacked cards in message thread detail with a flat chat-style timeline.

- **Chat bubbles:** Own messages align right (gold accent), received messages align left. System messages left-aligned with blue accent.
- **Flat threading:** Subject shown once in the thread header only; per-message subjects and "Re:" prefixes removed. No more `parent_id` nesting in the UI — replies always target the thread root.
- **Simplified reply:** Reply form no longer has a subject field or quoted content prefill. Single thread-level reply button at the bottom (no per-message reply buttons).
- **Auto-scroll:** Thread auto-scrolls to latest message on load and after sending a reply. Uses `instant` scroll on first load, `smooth` on updates. Does not scroll on delete (tracked via `prevMsgCountRef`).
- **Hook cleanup:** Removed `replySubject`, `setReplySubject`, `replyParentId` from `useMessages`. `openReplyToMessage()` takes no arguments. `handleSendReply` finds the last non-self sender as the reply recipient and sends `parent_id: selectedThreadId`.
- **CSS:** Replaced `.messages-email-*` classes with `.messages-chat-*` classes (timeline, row, bubble, meta, sender, time, content, delete). Bubbles capped at 82% width (92% on mobile).

**Key files:** `app/messages/messages-thread.tsx`, `app/messages/use-messages.ts`, `app/styles/messages.css`.

### Next.js Image Migration (2026-02-18)

Migrated all native `<img>` tags to Next.js `<Image>` for automatic optimization (WebP/AVIF conversion, lazy loading, responsive sizing).

- **Scope:** ~25 TSX files across core components (`GameIcon`, `GameButton`, `sidebar-nav`, `sidebar-shell`, `pagination-bar`, `admin-client`, `auth-actions`, `editable-text`, `editable-list`) and feature files (`dashboard`, `news`, `forum`, `messages`, `members`, `bugs`, all admin tabs).
- **Excluded:** `lib/markdown/renderers.tsx` — user-submitted markdown images from arbitrary external domains stay as native `<img>`.
- **Sidebar logo:** Replaced the `<picture>` + `<source>` + `<img>` pattern with a single `<Image>` (Next.js handles format negotiation automatically).
- **Bug screenshot lightbox:** Uses `<Image unoptimized>` for dynamic Supabase storage URLs.
- **ESLint:** Restored `@next/next/no-img-element` to `"error"` with a file-level override for `lib/markdown/renderers.tsx`.

### Sidebar Icon Reassignment (2026-02-18)

Reshuffled sidebar navigation icons for better visual fit across main and admin sections.

- **Main nav icon rotation:** Ankündigungen now uses `icons_main_menu_daily_1.png` (from Events), Events uses `icons_main_menu_clan_1.png` (from Mitglieder), Mitglieder uses `icons_main_menu_army_1.png` (from Clan-Verwaltung), Forum uses `icons_main_menu_technology_1.png` (from Design System).
- **New icons from design-assets:** Fehlerberichte switched from skull to `icons_spyglass_2.png`, Logs to `icons_scroll_1.png`, Clan-Verwaltung to `circle_mercenaries_01.png`, Benutzer to `gold_72.png`, Design System to `clan_emblem_11.png`, Forenverwaltung to `icons_main_menu_storage_1.png`.
- **Asset consolidation:** All 5 newly referenced design-asset icons copied into `public/assets/game/icons/` so all sidebar icons live in the canonical game icons folder.
- **Icon sizing:** Bumped Ankündigungen, Fehlerberichte, and Benutzer to `lgIcon: true` for consistency with other detailed icons.

### Warning Cleanup Follow-up (2026-02-18)

Closed the remaining warning/perf follow-up items from the P3 review step.

- **NotificationBell abort-noise cleanup:** `app/components/notification-bell.tsx` now ignores expected `AbortError` fetch cancellations during route transitions/unmounts, preventing false warning logs from poll cleanup.
- **Vercel Analytics CSP alignment:** `next.config.js` now allows Vercel Analytics script/load endpoints in CSP (`script-src` includes `https://va.vercel-scripts.com`; `connect-src` includes Vercel vitals endpoints), removing dev console CSP block noise while keeping strict CSP defaults.
- **Auth LCP advisory cleanup:** Auth card-header background images (`/assets/vip/back_tooltip_2.png`) in `app/auth/login/page.tsx`, `app/auth/register/page.tsx`, `app/auth/forgot/page.tsx`, and `app/auth/update/page.tsx` now use `loading="eager"` where they are above-the-fold/LCP candidates.

**Validation run (passing):**

- `npx eslint app/components/notification-bell.tsx app/auth/login/page.tsx app/auth/register/page.tsx app/auth/forgot/page.tsx app/auth/update/page.tsx next.config.js`
- `npm run type-check`
- `npm run lint`
- `npx playwright test tests/notifications.spec.ts tests/auth.spec.ts --project=chromium` (`28 passed`)
- Public warning-follow-up audit (`node scripts/playwright/ui-audit.mjs --routes "/auth/login,/auth/register,/auth/forgot,/home"`): `output/playwright/console-warning-fix-public.log` reports `Total messages: 65 (Errors: 0, Warnings: 0)`.
- Owner warning-follow-up audit (`/home,/messages,/admin,/admin?tab=users`): no NotificationBell abort warnings, no Vercel CSP warnings, no LCP advisory; at this stage only automation-rate-limit `429` console errors remained on `/api/admin/email-confirmations` under rapid tab churn.

### Admin Email Confirmation 429 Hardening (2026-02-18)

Eliminated the remaining `/api/admin/email-confirmations` tab-churn `429` noise with a shared-fetch + limiter-alignment pass.

- **Shared confirmation map in admin context:** `app/admin/admin-context.tsx` now owns email-confirmation map state and exposes `refreshEmailConfirmations()` with short-lived caching/in-flight request dedupe.
- **Tab fetch dedupe:** `users-tab.tsx` and `approvals-tab.tsx` now consume confirmation data from `AdminProvider` context instead of issuing independent GET calls on each tab mount.
- **Limiter alignment:** `app/api/admin/email-confirmations/route.ts` now uses `standardLimiter` for `GET` (read-heavy/status endpoint) while keeping `strictLimiter` for `POST` confirm mutations.

**Validation run (passing):**

- `npx eslint app/admin/admin-context.tsx app/admin/tabs/users-tab.tsx app/admin/tabs/approvals-tab.tsx app/api/admin/email-confirmations/route.ts`
- `npm run type-check`
- `npx playwright test tests/admin.spec.ts --project=chromium` (`18 passed`)
- Owner churn audit (`/home,/messages,/admin,/admin?tab=users,/admin?tab=approvals`, desktop + mobile): `output/playwright/console-email-confirmation-429-fix.log` reports `Total messages: 35 (Errors: 0, Warnings: 0)`.

### P3 Review Step + Final Verification (2026-02-18)

Completed the required P3 review gate and final verification checklist for the UI/UX polish batch.

- **Accessibility self-review:** `npx playwright test tests/accessibility.spec.ts --project=chromium` passed (`17 passed`).
- **Focus order + visible focus sanity:** Captured `output/playwright/focus-visible-p3-review.json`; reviewed `/home`, `/messages`, `/settings`, and `/admin?tab=users` tab sequences all produced visible focus indicators.
- **Reduced-motion sanity pass:** Captured `output/playwright/reduced-motion-p3-review.json`; `prefers-reduced-motion` evaluated `true` across reviewed public/owner routes, no horizontal overflow regressions detected, and keyboard tab focus remained reachable.
- **Desktop/mobile route walkthrough:** `node scripts/playwright/ui-audit.mjs` executed for owner routes + admin tabs and public auth routes. Reports (`ui-audit-report-owner-p3.json`, `ui-audit-report-public-p3.json`) show zero redirects, zero overflow, and zero checkbox-size anomalies on covered routes.
- **Admin tab walkthrough:** `npx playwright test tests/admin.spec.ts --project=chromium` passed (`18 passed`) including users/clans/approvals/forum/logs tab coverage.
- **Final checks:** `npm run lint` and `npm run type-check` both passed after cleaning generated Playwright artifacts.

**Known console noise (pre-existing):**

- `NotificationBell` `AbortError` warnings during rapid navigation.
- CSP blocks for `https://va.vercel-scripts.com/v1/script.debug.js` in dev sessions.
- One existing Next.js LCP advisory for `/assets/vip/back_tooltip_2.png`.

**Artifacts refreshed:** `output/playwright/ui-audit-report-owner-p3.*`, `output/playwright/ui-audit-report-public-p3.*`, `output/playwright/console-owner-p3.log`, `output/playwright/console-public-p3.log`, `output/playwright/focus-visible-p3-review.json`, `output/playwright/reduced-motion-p3-review.json`, and updated route screenshots.

### Playwright Wait Strategy Completion (2026-02-17)

Completed the full follow-up pass to remove the remaining `networkidle` waits and stabilize equivalent assertions with explicit conditions.

- **Suite-wide wait migration:** Replaced the last `page.waitForLoadState("networkidle")` calls across the remaining specs and helpers (`messages`, `admin`, `smoke`, `events`, `profile-settings`, `cms-*`, `forum`, `dashboard`, `auth`, `debug-game-account-modal`, `auth.setup`, `tests/helpers/auth`) with `domcontentloaded`.
- **Deterministic assertions added where needed:** Hardened affected checks in `events.spec.ts`, `forum.spec.ts`, `dashboard.spec.ts`, `profile-settings.spec.ts`, `smoke.spec.ts`, `cms-components.spec.ts`, and `cms-markdown.spec.ts` using explicit visibility/URL polling and clan-access resolution waits.
- **Rate-limit-tolerant API check:** Updated `tests/crud-flows.spec.ts` authenticated `/api/messages` assertion to accept `429` under parallel suite load, aligning it with other rate-limit-aware API tests.

**Validation run (passing):**

- `npx eslint tests`
- `npx playwright test tests/cms-components.spec.ts tests/cms-markdown.spec.ts tests/dashboard.spec.ts tests/events.spec.ts tests/forum.spec.ts tests/profile-settings.spec.ts tests/smoke.spec.ts --project=chromium` (77 passed)
- `npx playwright test tests/crud-flows.spec.ts --project=chromium` (16 passed, 6 skipped)
- `npx playwright test --project=chromium` (424 passed, 2 flaky, 9 skipped)

### Playwright Flake Cleanup Follow-up (2026-02-17)

Completed a follow-up stabilization pass for the last observed flakes after the wait-strategy migration.

- **Admin logs tab reliability:** Updated `tests/admin.spec.ts` and `tests/admin-actions.spec.ts` to validate logs-tab readiness via deterministic controls (`#auditSearch`, `#auditClanFilter`, `#auditActionFilter`, `#auditEntityFilter`, `#auditActorFilter`) instead of brittle text-only checks.
- **Auth setup/spec strict-mode hardening:** Updated `tests/auth.setup.ts`, `tests/helpers/auth.ts`, and `tests/auth.spec.ts` to target `.first()` for duplicated auth form fields/buttons (`#identifier`, `#password`, email and submit controls) to avoid intermittent strict-mode violations during setup and auth flow tests.
- **CRUD auth-selector alignment:** Extended the same `.first()` hardening to auth-like interactions in `tests/crud-flows.spec.ts` (invalid login flow and form-submit clicks) so strict-mode collisions are handled consistently across the suite.
- **Forum guest fallback alignment:** Updated `tests/forum.spec.ts` to treat "Bitte wähle einen Clan..." / "select a clan" as valid no-access fallback output in create-post visibility assertions.

**Validation run (passing):**

- `npx eslint tests/admin.spec.ts tests/admin-actions.spec.ts tests/auth.setup.ts tests/helpers/auth.ts tests/auth.spec.ts`
- `npx playwright test tests/admin.spec.ts tests/admin-actions.spec.ts --project=chromium` (26 passed)
- `npx playwright test tests/auth.setup.ts --project=setup` (6 passed)
- `npx playwright test tests/auth.spec.ts tests/admin.spec.ts tests/admin-actions.spec.ts --project=chromium` (37 passed)
- `npx playwright test tests/auth.setup.ts --project=setup && npx playwright test tests/auth.spec.ts tests/crud-flows.spec.ts --project=chromium` (6 setup passed; 27 passed, 6 skipped)
- `npx playwright test tests/news.spec.ts tests/events.spec.ts tests/forum.spec.ts --project=chromium` (37 passed)
- `npx playwright test --project=chromium` (426 passed, 9 skipped, 0 flaky)

### Unified Loading Skeletons (P3.1 Phase 1) (2026-02-17)

Started P3 polish work by replacing the one-size-fits-all route skeleton with surface-specific loading patterns.

- **Shared variant system:** Expanded `app/components/page-skeleton.tsx` to support `dashboard`, `list`, `table`, `detail`, `article`, `auth`, `messages`, and `admin` variants (plus `default` fallback).
- **Route-level mapping:** Updated page loaders to use appropriate variants across `/home`, `/news`, `/events`, `/forum`, `/bugs`, `/members`, `/profile`, `/settings`, `/messages`, `/auth`, `/about`, `/contact`, `/privacy-policy`, and `/admin`.
- **Suspense parity:** Updated major streamed page fallbacks to match route loaders on `app/page.tsx`, `app/members/page.tsx`, `app/settings/page.tsx`, and `app/messages/page.tsx`.
- **UX outcome:** Loading states now better match actual page structure (cards, tables, detail panes, dashboard widgets), improving perceived continuity during transitions.

**Validation notes:**

- `npm run type-check` passed.
- `npx eslint app/components/page-skeleton.tsx app/page.tsx app/members/page.tsx app/settings/page.tsx app/messages/page.tsx app/home/loading.tsx app/news/loading.tsx app/events/loading.tsx app/forum/loading.tsx app/bugs/loading.tsx app/members/loading.tsx app/profile/loading.tsx app/settings/loading.tsx app/messages/loading.tsx app/auth/loading.tsx app/about/loading.tsx app/contact/loading.tsx app/privacy-policy/loading.tsx app/admin/loading.tsx` passed.

### Mobile Navigation Pattern Refinement (P3.2 Phase 1) (2026-02-17)

Continued the UI/UX backlog with a compact-navigation pass focused on reducing mobile sidebar friction and improving tap efficiency.

- **Compact admin simplification:** `app/components/sidebar-nav.tsx` now renders a single admin entry (`/admin`) on compact viewports instead of listing all admin sub-destinations in the mobile icon rail.
- **Touch-target improvements:** `app/styles/layout.css` now enforces 44px-oriented sizing for compact sidebar toggle/nav entries and flyout actions, plus touch-optimized interaction handling (`touch-action: manipulation`) for key compact controls.
- **Smoother flyout routing:** `app/components/sidebar-shell.tsx` now uses `Link` for compact user-flyout profile/messages/settings navigation and closes the flyout on route changes for cleaner transition behavior.
- **Compact nav hierarchy:** Added a subtle compact secondary admin-group treatment to keep primary navigation emphasis stronger on mobile.

**Validation notes:**

- `npx eslint app/components/sidebar-nav.tsx app/components/sidebar-shell.tsx` passed.
- `npm run type-check` passed.
- `npx playwright test tests/navigation.spec.ts --project=chromium` passed (`13 passed`).

### Interaction + Focus Polish (P3.3 Phase 1) (2026-02-17)

Continued the polish pass with a shared keyboard-focus treatment and clearer CTA emphasis in dense control clusters.

- **Shared focus-visible pass (`components.css`):** Added consistent focus-visible affordances for shared controls (buttons, tabs, user-menu summary/links, form fields, select search, notification controls, dashboard thread action button, compact tab-group buttons).
- **Sidebar/nav focus pass (`layout.css`):** Added focus-visible styling for compact nav and account controls (`sidebar-toggle`, sidebar nav links, clan trigger, sidebar user trigger, sidebar action icons, sidebar flyout links) to match hover affordances for keyboard users.
- **CTA hierarchy refinement:** In dense admin rows/toolbars (`admin-filter-row`, `admin-toolbar-inline`, `admin-table-actions`, `admin-clan-actions`), primary actions now receive stronger visual emphasis while non-primary/non-danger controls stay intentionally quieter.

**Validation notes:**

- IDE lints (`ReadLints`) on touched style files returned no issues.
- `npm run type-check` passed.
- `npx playwright test tests/navigation.spec.ts --project=chromium` passed (`13 passed`).

### Playwright Flake Stabilization (2026-02-17)

Hardened flaky Chromium E2E specs and revalidated the full suite.

- Replaced unstable `networkidle` waits in targeted specs (`news`, `notifications`, `roles-permissions`, `crud-flows`, `admin-actions`) with `domcontentloaded` + explicit/polled assertions.
- Added shared helper `tests/helpers/wait-for-clan-access.ts` and wired it into clan-access-sensitive assertions to avoid race conditions while the gate is still in loading state.
- Updated unauthenticated admin API expectations in `tests/api-endpoints.spec.ts` to accept auth-first `401` responses.
- Stabilized forum-management and event-CRUD assertions with resilient fallback/polling checks to remove intermittent false negatives.

**Validation run (all passing):**

- `npx eslint tests`
- `npx playwright test tests/news.spec.ts tests/roles-permissions.spec.ts --project=chromium`
- `npx playwright test tests/admin-actions.spec.ts tests/crud-flows.spec.ts --project=chromium`
- `npx playwright test --project=chromium` (427 passed, 8 skipped)

### Admin IA Clarity Pass (P2.3 Phases 1-2) (2026-02-17)

Continued the UI/UX backlog with a focused information-architecture pass on `/admin`.

- **Active section context:** `app/admin/admin-client.tsx` now surfaces an explicit active-tab status row below the admin tabs (title + contextual subtitle) and adds clearer approvals pending counts directly on the tab trigger.
- **Toolbar/filter consistency:** Replaced ad-hoc inline layout styling in users, clans, logs, and approvals tab components with shared semantic classes (`admin-filter-row`, `admin-filter-summary`, `admin-filter-cta`, `admin-toolbar-inline`, `admin-table-actions`, `admin-clan-actions`, `admin-shadow-toggle`).
- **Responsive admin controls:** Added mobile rules in `app/styles/components.css` to stack filter/action controls predictably, expand action buttons where needed, and reduce visual overload in dense admin toolbars.
- **Action hierarchy refinement:** Added priority-aware action styling in dense users/clans row toolbars (`admin-row-actions`, `admin-action-primary`, `admin-action-secondary`, `admin-action-danger`) so high-impact actions (save/approve/delete) are visually clearer than secondary actions.

**Validation notes:**

- `npm run type-check` passed.
- `npx eslint app/admin/admin-client.tsx app/admin/tabs/users-tab.tsx app/admin/tabs/clans-tab.tsx app/admin/tabs/logs-tab.tsx app/admin/tabs/approvals-tab.tsx` passed.
- `npx eslint app/admin/tabs/users-tab.tsx app/admin/tabs/clans-tab.tsx` passed after phase-2 action hierarchy updates.
- Targeted Playwright admin audit (`/admin`, owner state, desktop + mobile) reported zero redirects, zero horizontal overflow, zero checkbox anomalies.
- Console output remains limited to known pre-existing noise (NotificationBell abort warning and CSP block for Vercel analytics debug script).

### UI/UX List/Card Density Pass (P2.2 Phase 1) (2026-02-17)

Continued the approved UI/UX backlog with a focused readability + hierarchy pass for list-heavy surfaces.

- **News density tuning:** Increased banner/meta/content spacing and tag/action readability in `app/styles/news.css`, with mobile-specific card compaction rules.
- **Forum density tuning:** Improved post-card rhythm (vote rail/body/meta/title/footer), comment readability, and mobile wrapping/clamp behavior in `app/styles/forum.css`.
- **Bugs density tuning:** Refined toolbar/card spacing, title/description/meta hierarchy, and mobile card/tool spacing in `app/styles/bugs.css`.
- **Admin/member tables readability:** Increased row/header padding and line-height for base table, member table, member directory, and users rows in `app/styles/tables.css`.
- **Backlog status updates:** Marked P1.1/P1.2/P1.3 complete and set P2.2 in progress in `Documentation/ui-ux-review-backlog.md`.

**Validation notes:**

- `npm run type-check` passed.
- IDE lints (`ReadLints`) on all touched style files returned no issues.
- Targeted Playwright UI audit (`/news`, `/forum`, `/bugs`, `/admin`, desktop + mobile, owner state) reported zero redirects, zero horizontal overflow, and zero checkbox anomalies.
- Console output still shows known pre-existing noise (`NotificationBell` abort warnings and CSP blocks for Vercel analytics debug script).
- `npm run lint` currently reports issues inside generated `playwright-report/trace/assets/*` files (minified artifacts), not in touched source files.

### Stepwise Performance Optimization Pass (2026-02-17)

Completed a phased implementation pass focused on reducing initial page pressure and redundant client work, with a review checkpoint after each phase.

- **Phase 1 (widget deferral):** Added `bug-report-widget-loader.tsx` and lazy-loaded `BugsForm` from `bug-report-widget.tsx` so bug-report UI code is no longer eager in the global baseline.
- **Phase 2 (image loading priorities):** Reduced decorative `priority` usage in shared hero/sidebar/top-bar assets to prevent preload contention with true LCP content.
- **Phase 3 (auth/role dedupe):** Added `AuthStateProvider` (`app/hooks/auth-state-provider.tsx`) + shared context (`lib/hooks/auth-state-context.ts`), updated `useAuth`/`useUserRole` to consume centralized auth/role state.
- **Phase 4 (events query windowing):** Added bounded date-window + limit logic for events and templates in `use-events-data.ts` to keep payload growth controlled over time.
- **Phase 5 (route-level code splitting):** Added dynamic loading for conditional heavy panels in `messages`, `bugs`, `forum`, and `events` client flows.

**Validation checkpoints (passing):**

- `npm run lint`
- `npm run type-check`
- `npm run test:unit`
- `npx playwright test tests/bugs.spec.ts --project=chromium`
- `npx playwright test tests/smoke.spec.ts --project=chromium`
- `npx playwright test tests/navigation.spec.ts --project=chromium`
- `npx playwright test tests/events.spec.ts --project=chromium`
- `npx playwright test tests/messages.spec.ts tests/bugs.spec.ts tests/forum.spec.ts tests/events.spec.ts --project=chromium`
- `npm run build`

**Full-suite note:** The previously reported `networkidle`-driven Chromium flakes in legacy specs have been stabilized; current full Chromium sweep passes (`427 passed, 8 skipped`).

### UI/UX Review Kickoff + P1 Start (2026-02-17)

Started the prioritized UI/UX implementation backlog and shipped the first P1 improvements from the Playwright review pass.

- **Auth progressive disclosure:** Added reusable `AuthInfoCard` (`app/auth/components/auth-info-card.tsx`) and applied it to login/register/forgot pages so long explanatory copy is collapsed by default while preserving full content.
- **Top chrome compaction:** Tightened shared top-bar and hero vertical spacing in `app/styles/layout.css` + `app/styles/components.css` to surface primary content earlier on small screens.
- **Runtime warning cleanup:** Updated sidebar texture image (`/assets/vip/back_left.png`) in `app/components/sidebar-shell.tsx` to `next/image` `fill` usage with responsive sizes, addressing repeated width/height mismatch warnings.
- **Execution planning doc:** Added `Documentation/ui-ux-review-backlog.md` with P1/P2/P3 scope, per-phase review gates, and final verification checklist.

### Validation notes

- Playwright route walkthroughs executed across desktop/mobile and owner-authenticated admin surfaces.
- Console logs still show expected navigation-abort warnings from `NotificationBell` and occasional rate-limit (`429`) noise under aggressive automated route switching.

### Messaging Contract + Modularity Hardening (2026-02-17)

Completed a messaging-focused modularity pass to centralize profile/label behavior and harden endpoint contracts.

- **Shared profile helper module:** Added `lib/messages/profile-utils.ts` and replaced duplicated profile map / recipient label logic across message API routes.
- **Centralized API DTO contracts:** Added `lib/types/messages-api.ts` and wired typed messaging response envelopes into routes and `useMessages`.
- **Client fallback consistency:** `useMessages` now uses the shared profile-label resolver to keep sender/recipient fallback behavior aligned with server payloads.
- **Contract coverage for all message endpoints:** Added `tests/messages-api-contract.spec.ts`, covering `/api/messages`, `/api/messages/[id]`, `/api/messages/sent`, `/api/messages/sent/[id]`, `/api/messages/thread/[threadId]`, `/api/messages/archive`, and `/api/messages/search-recipients` with shape + privacy assertions.
- **Architecture convention documented:** Added explicit auth-first handler ordering guidance (`requireAuth`/`requireAdmin` before body parsing) in `Documentation/ARCHITECTURE.md`.

**Validation run (all passing):**

- `npm run lint`
- `npm run type-check`
- `npm run test:unit`
- `npx playwright test tests/messages-api-contract.spec.ts --project=chromium`
- `npx playwright test tests/messages.spec.ts --project=chromium`
- `npx playwright test tests/bugs.spec.ts --project=chromium`

### Project-Wide Review Hardening Pass (2026-02-17)

Completed a full review cycle across pages, APIs, DB policies/migrations, and reliability checks.

- **Messaging privacy hardening:** Recipient/profile payloads in message APIs no longer include user emails (`/api/messages`, `/api/messages/sent`, `/api/messages/thread/[threadId]`, `/api/messages/archive`, `/api/messages/search-recipients`).
- **Auth guard consistency:** `POST /api/admin/delete-user` now enforces `requireAdmin()` before body parsing.
- **Navigation/runtime consistency:** Bugs deep-link navigation now uses App Router (`router.push`) instead of `window.history.pushState`, keeping URL/query state in sync with Next navigation.
- **Performance cleanup:** `useBugs()` avoids redundant detail reloads and list reloads outside list mode; home page internal CTAs now use `Link` instead of raw anchors to avoid full reloads.
- **Regression guard:** Added a new Playwright test in `tests/messages.spec.ts` to ensure recipient search responses do not expose an `email` field.

**Validation run (all passing):**

- `npm run lint`
- `npm run type-check`
- `npm run test:unit`
- `npx playwright test tests/messages.spec.ts --project=chromium`
- `npx playwright test tests/bugs.spec.ts --project=chromium`

### Webmaster Role Rename + Role Protection (2026-02-15)

"Eigentümer" / "Owner" role renamed to **Webmaster** (both DE and EN). Internal key remains `owner`. Role change protection enforced at both UI and DB levels:

- Nobody can change or delete the Webmaster's role.
- Only the Webmaster can change or delete an Administrator's role.
- Admins can still manage roles of moderator and below.

On the members page, Webmaster/Administrator with no in-game rank show their role name as a rank substitute (sorted after "Vorgesetzter", before "Offizier"). Rank stats bar includes Webmaster (red) and Administrator (gold) chips with distinct colours.

**Key files:** `lib/permissions.ts` (new `isOwner()`, `canChangeRoleOf()`), `app/admin/admin-context.tsx` (`currentUserRole`), `app/admin/tabs/users-tab.tsx` (disabled dropdown + save guard), `app/members/members-client.tsx` (rank fallback, chips, sorting), `app/components/sidebar-shell.tsx` (status line).
**DB migration:** `Documentation/migrations/role_change_protection.sql` — `is_owner()` helper, UPDATE + DELETE triggers on `user_roles`.

### Markdown Editing for Bug Reports (2026-02-15)

Report descriptions and comments now use the same `MarkdownEditor` component as events, news, and messages. This provides write/preview tabs, a full formatting toolbar (bold, italic, headings, links, code blocks, etc.), and image paste/drop/upload. Stored content renders as markdown via `AppMarkdown`. Inline images upload to the `bug-screenshots` Supabase storage bucket.

**Key files:** `bugs-form.tsx` (description uses `MarkdownEditor`), `bugs-detail.tsx` (renders description with `AppMarkdown`), `bugs-comments.tsx` (add + edit comment forms use `MarkdownEditor`, bodies rendered with `AppMarkdown`), `radix-select.tsx` (inline `maxHeight` + `overflowY` on Content and Viewport), `app/styles/components.css` (scrollbar `!important` overrides to defeat Radix's injected style tag).

### Bug Report Category i18n + Page Selector (2026-02-15)

Categories now translated via `slug` column + `bugs.categories.<slug>` i18n keys. Custom admin-created categories fall back to raw name. Page URL field replaced with dropdown of known site pages + "Custom URL" option. All labels i18n-aware (EN + DE). Admin controls also use translated status/priority labels.

**DB migration:** `bug_reports_v3.sql` (adds `slug` column to categories).
**Key files:** `bugs-form.tsx` (page dropdown), `bugs-list.tsx`/`bugs-detail.tsx`/`bugs-admin-controls.tsx` (translated categories), `domain.ts`/`bugs-types.ts` (new `slug`/`category_slug` fields), `en.json`/`de.json` (new `categories.*` and `pages.*` sections).

### Bug Report List Redesign + Pagination (2026-02-15)

Report list view overhauled: each report is a card (not a table row) showing status/priority badges, description preview, reporter, date, category, comment/screenshot counts. Toolbar (filters + search/sort) is a separate card above the list, with the search field constrained to 260px and grouped with the sort dropdown. Pagination added using `usePagination` + `PaginationBar` (default 15 per page, compact mode).

**Key files:** `app/bugs/bugs-list.tsx` (rewritten), `app/bugs/bugs-client.tsx` (adjusted DataState usage), `app/styles/bugs.css` (new card grid, toolbar, empty state classes).

### Guest Role + Rank (2026-02-15)

Guest role now has the same permissions as member. Guest is selectable in the admin user role dropdown (EN: "Guest", DE: "Gast").

New "guest" rank added below soldier. On the members page, guests appear as the last category with a purple badge. When an admin creates a game account for a guest-role user, the rank defaults to "guest".

**Key files:** `lib/permissions.ts`, `app/admin/admin-types.ts`, `app/admin/tabs/users-tab.tsx`, `app/members/members-client.tsx`.
**DB migration:** `Documentation/migrations/guest_role_permissions.sql` — updates `has_permission()` SQL function.

### Bug Report / Ticket System (2026-02-15)

Full bug reporting system with dedicated `/bugs` page and floating quick-report widget.

**What's included:**

- Dedicated `/bugs` page with list view (filters, search, sort) and detail view (screenshots, comments, admin controls).
- Floating widget button (bottom-right) on every page — auto-captures current URL, opens compact report form. Hidden on `/bugs` and for unauthenticated users.
- Markdown editing for descriptions and comments — uses shared `MarkdownEditor` component (write/preview tabs, formatting toolbar, image paste/drop/upload).
- Screenshot uploads: up to 5 images per report (JPEG, PNG, GIF, WebP; max 5 MB each), stored in Supabase Storage `bug-screenshots` bucket.
- Workflow: Open → Resolved → Closed. Priority (low/medium/high/critical) set by admins only.
- Threaded comments with author display names. Reporters receive notifications when someone comments.
- Admin-managed categories (Bug, Feature Request, UI Issue, Data Problem, Other) with full CRUD via API.
- Sidebar navigation link added to the "Main Menu" section.

**Edit/delete:** Reports can be edited (title, description, category, page URL) and deleted by the author or admins. Comments have inline edit/delete (same pattern as forum). `ConfirmModal` for report deletion. New API: `DELETE /api/bugs/[id]`, `PATCH/DELETE /api/bugs/[id]/comments/[commentId]`.

**Email notifications:** Admins (owner/admin only) can opt in to receive email when a new report is submitted. Toggle in Settings → Notifications ("Bug report email", off by default) — hidden for non-admin users. The API silently ignores `bugs_email_enabled` from non-admins, and the email fan-out only queries owner/admin roles. Sent via Resend API using `lib/email/send-email.ts` (no npm dependency — raw `fetch`). Requires `RESEND_API_KEY` + `RESEND_FROM_EMAIL` env vars; silently skipped if not configured.

**Key files:** `app/bugs/` (7 components + 2 hooks + types), `app/components/bug-report-widget.tsx`, `app/api/bugs/` (6 route files), `lib/email/` (2 files), `app/styles/bugs.css`.

**DB migrations:** `Documentation/migrations/bug_reports.sql` + `bug_reports_v2.sql` (adds `updated_at` to comments, `bugs_email_enabled` to settings, edit/delete RLS policies).

**Permissions added:** `bug:create` and `bug:comment` for guest, member, editor, and moderator roles (`lib/permissions.ts`).

**i18n:** Full English and German translations in `messages/en.json` and `messages/de.json` under the `"bugs"` namespace.

**Layout:** Uses standard `PageShell` with hero banner (`banner_gold_dragon.png`), `AuthActions` profile widget in top bar. Action buttons (New Report / Back) render inside the content area, not the top bar. List view features status, priority, and category filter dropdowns, a search field, and a sort dropdown (newest/oldest/title/priority/status). Sorting is client-side via `useMemo` in `use-bugs.ts`.

### Codebase Audit (2026-02-16)

Comprehensive audit covering security, bugs, performance, code quality, and accessibility. Key changes:

- **Deleted** `/redesign` pages and all exclusive references (public paths, robots.txt, ESLint override, playwright script).
- **Security**: SVG XSS blocked in markdown URLs, LIKE injection fixed in game-accounts, auth-before-parse in admin routes, email validation in sendEmail, CAPTCHA fails in production when unconfigured, reporter emails no longer exposed in bugs API.
- **Bugs**: Banner filename typo fixed (`exhange` -> `exchange`), `statsError` exposed in dashboard hook, hardcoded German strings replaced with i18n.
- **Performance**: Sidebar nav inline object extracted to constant, `loading.tsx` added for `/bugs`.
- **Quality**: Unguarded `console.warn` removed, "Internal server error" punctuation standardized across all API routes.
- **Config**: `no-console` ESLint rule added, `audit:deps` npm script added, CSP `unsafe-inline` documented.
- **Accessibility**: Descriptive alt text on event banners, forum thumbnails, and banner picker.
- **Review fixes**: Stale `statsError` cleared when `clanId` becomes falsy; `tCommon` added to `useCallback` deps in `useSiteContent`; indentation fixed.

**Remaining follow-ups**: Migrate ~130 API error responses from `NextResponse.json({ error })` to shared `apiError()` helper. Split large admin tab components (users-tab ~1270 lines, clans-tab ~1370 lines). Centralize inline Zod schemas into `validation.ts`. Full DE/EN translation key parity audit.

## UI Overhaul — Button & Icon Conventions

All action buttons use `GameButton` (asset-textured, `app/components/ui/game-button.tsx`). Variant conventions:

| Action Type          | GameButton Variant  | Examples                                    |
| -------------------- | ------------------- | ------------------------------------------- |
| Save / Submit / Send | `green`             | Save changes, submit form, send message     |
| Approve / Confirm    | `turquoise`         | Registrierung bestätigen, Genehmigen        |
| Delete / Danger      | `orange`            | Delete event, remove report, danger confirm |
| Primary CTA          | `ornate1`–`ornate3` | New post, reply, retry                      |
| Hero CTA             | `hero`              | Register, join                              |
| Cancel / Secondary   | CSS `.button`       | Cancel buttons (not GameButton)             |

`ConfirmModal` maps variant to GameButton automatically (info→green, danger/warning→orange). Override per-instance with `confirmButtonVariant` prop.

### Icon Conventions (Admin)

| Action               | Icon                            | Notes                                |
| -------------------- | ------------------------------- | ------------------------------------ |
| Add game account     | `icons_plus_3.png`              | Same in Benutzer and Clan-Verwaltung |
| Create clan          | `shield_22.png`                 | Shield = clan/guild                  |
| Edit                 | `icons_pen_2.png`               | Universal edit icon                  |
| Delete               | `icons_paper_cross_1.png`       | Universal delete icon                |
| Confirm registration | `icons_moderator_add.png`       | Distinct from generic checkmark      |
| Save                 | `components_check_box_mark.png` | Checkmark for save actions           |
| Close                | `icons_close.png`               | Close/dismiss                        |
| Remove default       | Star + cross badge              | `.icon-stack` CSS composite          |

All sidebar nav items use game-asset PNG icons via the `vipIcon` prop on `NavItem`. Icons sized 22px (standard) or 34px (`lgIcon: true`). Most nav items use large icons; only Home, Approvals, and Logs use standard size. User menu dropdown icons are 20px. Bottom sidebar action icons (profile, settings) are 28px.

## Pending Tasks

### Other

- Forum could use PostgREST joins for author names (FK constraints added, client migration pending).

## Known Behaviors & Gotchas

### Supabase / RLS

- **Silent delete**: Supabase returns success when RLS blocks a delete. All delete operations chain `.select("id")` and verify `data.length > 0`. Follow this pattern for any new deletes.
- **Enable RLS on `clans` table**: `ALTER TABLE public.clans ENABLE ROW LEVEL SECURITY;` — policies exist but RLS was never enabled on some older setups.
- **Forum comment count**: Maintained by `SECURITY DEFINER` DB triggers, not client-side updates. Client-side count changes would be blocked by RLS.
- **Forum thread auto-linking**: Creating an event or announcement auto-creates a forum thread. Edit and delete sync handled by `SECURITY DEFINER` DB triggers (bidirectional). Client code only handles creation (`lib/forum-thread-sync.ts`).
- **INSERT RLS policies**: Use `WITH CHECK (...)`, not `USING (...)`. PostgreSQL rejects `USING` on INSERT policies. Bug report migration hit this — fixed with `WITH CHECK (true)`.

### Data Formats

- Date pickers display `dd.mm.yyyy`, stored as `YYYY-MM-DD`. Default timestamp display: German format (`dd.MM.yyyy, HH:mm`).

### Radix Select Scrollbar

`@radix-ui/react-select@2.2.6` injects a runtime `<style>` tag that forcibly hides all native scrollbars on the viewport element:

```css
[data-radix-select-viewport] {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
[data-radix-select-viewport]::-webkit-scrollbar {
  display: none;
}
```

Radix expects developers to use `Select.ScrollUpButton` / `Select.ScrollDownButton` instead. We override this with `!important` rules in `app/styles/components.css` to show a visible custom scrollbar. If you upgrade `@radix-ui/react-select`, verify the scrollbar still appears -- the injected style may change between versions.

### Intentional Patterns

- `signOut` uses `window.location.href` (not `router.push`) — full reload clears stale auth state.
- Recurring events store one DB row; occurrences are expanded client-side. `recurrence_parent_id` column is deprecated.
- Default game account (`profiles.default_game_account_id`) takes priority over `localStorage` in sidebar selector.
- `sanitizeMarkdown()` emphasis-fix regexes use `[^\S\n]+` (horizontal whitespace only), not `\s+` — prevents matching across line boundaries.
- API routes bypass the proxy auth redirect entirely. Each route handles its own authentication.
- In-memory rate limiter has per-instance counters — not shared across serverless instances.

### Deep-Link URL Patterns

| Pattern                              | Behavior                             |
| ------------------------------------ | ------------------------------------ |
| `/forum?post=<id>`                   | Opens forum post directly            |
| `/news?article=<id>`                 | Expands and scrolls to article       |
| `/events?date=YYYY-MM-DD&event=<id>` | Navigates calendar, highlights event |
| `/messages?to=<userId>`              | Pre-fills compose recipient          |
| `/messages?tab=notifications`        | Opens notifications tab              |
| `/bugs?report=<id>`                  | Opens specific bug report            |

## Responsive / Mobile

- Primary breakpoint at **900px**: sidebar collapses, `.grid` switches to single column, messages page uses panel-toggle pattern
- Sidebar on compact viewport: forum category sub-items are hidden; bottom controls use a single avatar trigger that opens a fixed account flyout (profile/messages/settings/sign out + DE/EN toggle)
- Messages page on mobile: inbox list and thread panel toggle via `.thread-active` class; "Back to list" button navigates back via `clearSelection()` from `useMessages` hook
- Touch targets: action buttons and delete buttons enlarge on touch devices (`@media (hover: none)`)
- Notification bell panel fluid-width on small screens (<420px)
