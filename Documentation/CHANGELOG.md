# Changelog

> Historical record of all changes. Newest first. For architecture, see `ARCHITECTURE.md`. For current status, see `handoff_summary.md`.

---

## [Unreleased] – 2026-02-17

### Fixed

- **Messages mobile panel switching**: On mobile/tablet (<900px), the inbox list and thread panel now toggle instead of stacking — selecting a message shows the thread with a "Back to list" button; eliminates the need to scroll past the entire inbox to reach the thread/reply area
- **Messages tablet overflow**: Changed fixed 420px list panel to `minmax(280px, 420px)` so it shrinks gracefully on tablets instead of causing horizontal scroll
- **Messages reply form mobile**: Reduced reply textarea height and padding on mobile so thread messages remain scrollable; added iOS safe-area padding; MarkdownEditor in reply context uses smaller `minHeight` (100px vs 200px default)
- **Messages touch targets**: Increased action button size from 26px to 36px on touch devices and mobile; increased delete button padding; improved touch-device action button discoverability (opacity 0.7)
- **Messages thread panel height**: Thread panel on mobile now uses `calc(100vh - 120px)` instead of `calc(100vh - 200px)`, gaining 80px for message content; reply form capped at `40vh` with scrollable overflow so it can't dominate the viewport; textarea capped at `20vh`
- **Messages mobile layout**: Conversation item subject rows wrap on mobile to prevent timestamp overlap; email card padding optimized for small screens
- **Grid responsive**: Added `@media (max-width: 900px)` breakpoint to `.grid` class (single column) — all pages using the 2-column grid now properly stack on mobile
- **Notification bell overflow**: Panel width constrained to `calc(100vw - 32px)` on screens under 420px to prevent clipping

### Added

- `clearSelection` method on `useMessages` hook for programmatic back-navigation
- `backToInbox` i18n key (EN: "Back to list", DE: "Zurück zur Liste")
- `.messages-back-btn` CSS class (hidden on desktop, shown on mobile)

## 2026-02-16

### Fixed

- **Messages tab badges**: Unread-count badges in Posteingang/Benachrichtigungen tabs no longer cause layout shift when they appear/disappear; replaced oversized global `.badge` styling with compact `.messages-tab-badge` class; removed hover jitter (`translateY`) on badges inside tabs; stabilized tab row height with `min-height`

### Removed

- **Datenimport**: Removed all data import routes, components, API endpoints, CSV parser, and import utilities
- **Truhen-Datenbank**: Removed chest database viewer, filters, batch editing, and all related routes
- **Validierung**: Removed validation rules tab, validation evaluator, and all validation rule management
- **Korrekturen**: Removed correction rules tab, correction applicator, and all correction rule management
- **Analytics/Charts**: Removed analytics client, chart components, recharts dependency, and analytics API endpoint
- **Database tables**: Created migration to drop `chest_entries`, `validation_rules`, `correction_rules`, `scoring_rules` (see `Documentation/migrations/drop_chest_data_tables.sql`)
- **Tests**: Removed `charts.spec.ts`, `data-workflows.spec.ts`, `validation-evaluator.test.ts`, `correction-applicator.test.ts`; updated remaining test files to remove references

### Added

- Analytics placeholder page with "coming soon" messaging
- Dashboard stats placeholder cards replacing Quick Stats and Week Highlights sections

### Changed

- Admin panel: Removed dataImport, validation, corrections, chestDb sections; kept clans, users, approvals, forum, designSystem, logs
- Sidebar navigation: Removed entries for data import, validation, corrections, chest DB
- Proxy middleware: Removed /data-import and /data-table redirect logic
- Dashboard: Announcements and events remain functional; stats sections show placeholder
- Translations: Cleaned up de.json and en.json, removed ~300 unused keys

---

## 2026-02-16 — Codebase audit: security, bugs, performance, quality, accessibility

**Deleted:**

- Removed `/redesign` pages (v3a, v3b, v3c, preview, selector, layout) and all exclusive references.

**Security fixes:**

- Block `data:image/svg+xml` in markdown URL sanitizer to prevent XSS via SVG scripts.
- Escape LIKE wildcards in game-accounts search (`escapeLikePattern`).
- Move `requireAdmin()` before body parsing in `admin/create-user` and `admin/resend-invite` routes.
- Validate email recipient in `sendEmail()` to prevent header injection (reject newlines/null bytes).
- Fail CAPTCHA verification in production when `TURNSTILE_SECRET_KEY` is unset instead of silently skipping.
- Remove `email` from bug report/comment API profile selects — only expose `username` and `display_name`.

**Bug fixes:**

- Fix banner preset filename typo: `banner_event_exhange_708.png` renamed to `banner_event_exchange_708.png`.
- Add `statsError` state to `useDashboardData` — stats failures now surface an error instead of silent zeros.
- Replace hardcoded German strings in `useSiteContent` with i18n keys (`loadContentFailed`, `saveFailed`, etc.).

**Performance:**

- Extract inline `HOME_NAV_ITEM` constant in sidebar-nav to avoid re-creating objects on every render.
- Add `loading.tsx` for `/bugs` and `/data-import` routes.

**Code quality:**

- Remove unguarded `console.warn` in `useDashboardData` (announcements/events fetch errors already stored in state).
- Standardize all API "Internal server error" messages to include trailing period across 15+ route files.

**Configuration:**

- Add `no-console` ESLint rule (warn, allowing `warn`/`error`).
- Add `audit:deps` npm script for dependency vulnerability checks.
- Add CSP documentation comment explaining `unsafe-inline` necessity.
- Remove `/redesign` from public paths, robots.txt disallow list, and ESLint overrides.

**Accessibility:**

- Add descriptive `alt` text to event banner images (uses event title).
- Add media-type alt text to forum post thumbnails.
- Add `selectedBanner` alt text to banner picker preview (new i18n key in DE + EN).

**Review fixes:**

- Fix stale `statsError` when `clanId` becomes falsy (add `setStatsError(null)` in early-return branch).
- Add `tCommon` to all `useCallback` dependency arrays in `useSiteContent` for correct locale-aware error messages.
- Fix indentation on two `throw` statements in `useSiteContent`.

**Files changed:** `lib/markdown/renderers.tsx`, `app/api/game-accounts/route.ts`, `app/api/admin/create-user/route.ts`, `app/api/admin/resend-invite/route.ts`, `lib/email/send-email.ts`, `app/api/auth/forgot-password/route.ts`, `app/api/bugs/route.ts`, `app/api/bugs/[id]/route.ts`, `app/api/bugs/[id]/comments/route.ts`, `app/bugs/bugs-types.ts`, `app/bugs/bugs-list.tsx`, `app/bugs/bugs-detail.tsx`, `app/bugs/bugs-comments.tsx`, `lib/constants/banner-presets.ts`, `app/hooks/use-dashboard-data.ts`, `app/components/use-site-content.ts`, `app/components/sidebar-nav.tsx`, `app/components/banner-picker.tsx`, `app/events/upcoming-event-card.tsx`, `app/events/day-panel-event-card.tsx`, `app/forum/forum-icons.tsx`, `lib/public-paths.ts`, `eslint.config.js`, `next.config.js`, `package.json`, `app/robots.ts`, `scripts/playwright/dashboard-workflow.mjs`, `messages/de.json`, `messages/en.json`, `app/bugs/loading.tsx` (new), `app/data-import/loading.tsx` (new), 15+ API route files (error message standardization).

---

## 2026-02-15 — Fix: Bug report email toggle restricted to admins + test coverage

**Bug report email toggle restricted to admins:**

- **UI**: Toggle in Settings now wrapped in `isAdmin` check — hidden for non-admin users.
- **API**: `PATCH /api/notification-settings` silently ignores `bugs_email_enabled` if the caller is not an admin (via `is_any_admin` RPC check).
- **Email query**: Bug report email fan-out now queries only `owner` and `admin` roles (was also including `moderator` and `editor`).

**Test coverage for bug reporting system (new):**

- `tests/bugs.spec.ts`: 27 E2E tests covering: API auth guards (8 endpoints), authenticated CRUD (create, read, update, comment, delete lifecycle), categories admin guard, page UI (load, hero, form, category dropdown, markdown editor, back navigation), floating widget visibility, settings toggle visibility by role, and `bugs_email_enabled` API guard (member silently ignored, admin accepted).
- `lib/api/validation.test.ts`: 4 new unit tests for `bugs_email_enabled` in `notificationSettingsSchema`.
- `lib/markdown/strip-markdown.test.ts`: 16 new unit tests for the extracted `stripMarkdown()` utility (headings, bold, italic, strikethrough, inline code, fenced code blocks, images, links, lists, blockquotes, horizontal rules, whitespace collapsing, mixed input).
- Extracted `stripMarkdown()` from `app/bugs/bugs-list.tsx` to `lib/markdown/strip-markdown.ts` for reusability and testability.

**Files changed:** `app/settings/settings-client.tsx`, `app/api/notification-settings/route.ts`, `app/api/bugs/route.ts`, `tests/bugs.spec.ts` (new), `lib/markdown/strip-markdown.ts` (new), `lib/markdown/strip-markdown.test.ts` (new), `lib/api/validation.test.ts`, `app/bugs/bugs-list.tsx`.

---

## 2026-02-15 — Enhancement: Rename Owner to Webmaster + role protection

**Role rename:**

- "Eigentümer" / "Owner" role renamed to **Webmaster** (both DE and EN). Internal key remains `owner`.
- `ROLE_LABELS` in `lib/permissions.ts` and `LOCALIZED_ROLE_LABELS` in `app/admin/admin-types.ts` updated.
- Sidebar status line now shows the actual localized role name (e.g. "Webmaster", "Administrator") instead of generic "Admin"/"Member".

**Rank fallback for Webmaster/Administrator:**

- On the members page, if a user with role `owner` or `admin` has no in-game rank (null), the role name (e.g. "Webmaster") is displayed in the rank column instead of "No Rank".

**Role change protection:**

- Nobody can change a Webmaster's (owner) role — the dropdown is disabled in the admin Users tab.
- Only the Webmaster can change an Administrator's role.
- Admins can still change roles of moderator, editor, member, and guest.
- New helper: `isOwner()`, `canChangeRoleOf()` in `lib/permissions.ts`.
- `currentUserRole` added to `AdminContextValue` for access in the Users tab.

**Database migration:**

- New migration: `Documentation/migrations/role_change_protection.sql`
  - `is_owner()` SQL function (mirrors TypeScript `isOwner()`).
  - `enforce_role_change_protection()` trigger on `user_roles` BEFORE UPDATE:
    - Blocks any change to the Webmaster (owner) role.
    - Only the Webmaster can change an Administrator (admin) role.
    - Service-role operations are exempt.
  - `enforce_role_delete_protection()` trigger on `user_roles` BEFORE DELETE:
    - Prevents deleting the Webmaster's role row.
    - Only the Webmaster can delete an Administrator's role row.
    - Service-role operations are exempt.

**Files changed:**

- `lib/permissions.ts`: `ROLE_LABELS.owner` → "Webmaster"; new `isOwner()` and `canChangeRoleOf()` helpers.
- `lib/permissions.test.ts`: Tests for `isOwner` and `canChangeRoleOf`.
- `lib/hooks/use-user-role.ts`: Exposes `isOwner` in hook result.
- `app/admin/admin-types.ts`: `LOCALIZED_ROLE_LABELS` — owner → "Webmaster" (DE + EN).
- `app/admin/admin-types.test.ts`: Updated `formatRole` test expectations.
- `app/admin/admin-context.tsx`: Added `currentUserRole` state (fetched during init).
- `app/admin/tabs/users-tab.tsx`: Role dropdown disabled via `canChangeRoleOf()`; save handler blocks unauthorized changes.
- `app/members/members-client.tsx`: Null rank + owner/admin → shows role name; `MembershipSupabaseRow.rank` typed as `string | null`; dead `roleMap` state removed; sort order places rankless Webmaster/Admin after "Vorgesetzter"; Webmaster/Admin chips in rank stats bar with distinct colours.
- `app/components/sidebar-shell.tsx`: Status line uses `formatRole(userRole, locale)` for accurate display.
- `Documentation/ARCHITECTURE.md`: Updated permissions section.
- `Documentation/runbook.md`: Added `role_change_protection.sql` to migration order.

**Review fixes (post-implementation):**

- Removed dead `roleMap` state variable from `members-client.tsx` (was set but never read after refactor).
- Fixed `MembershipSupabaseRow.rank` type from `string` to `string | null` to match actual DB schema.
- Added BEFORE DELETE trigger (`enforce_role_delete_protection`) to the migration — prevents deleting protected role rows via the existing `user_roles_delete` RLS policy.

**Test coverage (post-review):**

- Extracted pure helpers from `members-client.tsx` into `app/members/members-utils.ts` (colours, sort comparator, role-substitute counting, constants).
- Added `app/members/members-utils.test.ts` with 50 tests: `getRoleColor`, `getRankColor`, `compareMemberOrder`, `countRoleSubstitutes`, `RANK_ORDER`, `ROLE_SUBSTITUTE_ORDER`, `NOTABLE_ROLES`, `RANK_SUBSTITUTE_ROLES`, `buildMessageLink`.
- Added ROLE_LABELS assertions to `lib/permissions.test.ts` (verifies "Webmaster" and "Administrator" labels).
- Unit tests: 602 → 654 across 32 files.

---

## 2026-02-15 — Enhancement: Markdown editing for bug reports + scrollbar fix

**Rich text editing (markdown + image upload):**

- Bug report description (create + edit) now uses `MarkdownEditor` with write/preview tabs, formatting toolbar, and image paste/drop/upload — same component used by events, news, and messages.
- Bug comment add form replaced with `MarkdownEditor` (was plain textarea).
- Bug comment inline edit form replaced with `MarkdownEditor`.
- Bug report detail description and comment bodies now rendered with `AppMarkdown` (markdown-to-HTML) instead of plain text.
- Image uploads go to `bug-screenshots` Supabase storage bucket.
- List card description previews strip markdown syntax via `stripMarkdown()` so cards show clean plain text instead of raw `##`, `**`, `![](...)` characters.

**Select dropdown scrollbar fix (`RadixSelect`):**

- `@radix-ui/react-select@2.2.6` injects a `<style>` tag that hides all scrollbars on the viewport (`scrollbar-width: none`, `::-webkit-scrollbar { display: none }`). Radix expects `ScrollUpButton`/`ScrollDownButton` instead of native scrollbars. Our CSS rules had no effect because Radix's injected styles silently overrode them.
- Fixed by overriding every axis with `!important`: `scrollbar-width: thin !important` (Firefox + Chrome 121+), `scrollbar-color` with visible gold colors, and `display: block !important` on `::-webkit-scrollbar` (Chrome < 121 / Safari).
- Also added `max-height` on `Select.Content` to cap the dropdown size and inline `maxHeight` + `overflowY: scroll` on `Select.Viewport` as belt-and-suspenders.

**Files changed:**

- `app/bugs/bugs-form.tsx`: Imports `MarkdownEditor`, `useSupabase`, `useAuth`; description field uses `MarkdownEditor`.
- `app/bugs/bugs-detail.tsx`: Imports `AppMarkdown` (dynamic); description renders as markdown.
- `app/bugs/bugs-comments.tsx`: Imports `MarkdownEditor`, `AppMarkdown`, `useSupabase`; add + edit comment forms use `MarkdownEditor`; comment bodies render as markdown.
- `app/bugs/bugs-list.tsx`: Added `stripMarkdown()` for clean card description previews.
- `app/components/ui/radix-select.tsx`: Inline `maxHeight` + `overflowY: scroll` on `Select.Viewport`; inline `maxHeight` on `Select.Content`.
- `app/styles/components.css`: Scrollbar overrides with `!important` to defeat Radix's injected `<style>` that hides all scrollbars.

---

## 2026-02-15 — Enhancement: Bug report UX improvements (scrollbar, list actions, consistent styling)

**Select dropdown scrollbar (initial attempt):**

- Added custom scrollbar styles to `.select-viewport` (gold-tinted thumb, dark track). Reduced `max-height` from 340px to 280px. Note: these styles alone were insufficient — see the later "Select dropdown scrollbar fix" entry for the root cause (`@radix-ui/react-select` injects a `<style>` tag hiding all scrollbars).

**Edit/delete actions on list cards:**

- Report cards in the overview list now show edit (pencil) and delete (trash) icon buttons on hover (always visible on mobile).
- Actions appear for the report author and content managers, matching the permission model of the detail view.
- Delete from list triggers a `ConfirmModal` before proceeding.
- Edit from list loads the full report, then switches to the edit form.

**Consistent icon/styling patterns:**

- Introduced `.bugs-action-btn` CSS class matching the established `.day-panel-action-btn` / `.news-action-btn` pattern (24px icon buttons, gold border, dark background).
- Detail view edit/delete buttons replaced with icon buttons (were generic `.button` elements with inline font-size).
- Comment action buttons (`.bugs-comment-action-btn`) updated to match `.forum-comment-action-btn` exactly (padding, border-radius, hover background).

**Files changed:**

- `app/styles/components.css`: Custom scrollbar on `.select-viewport`.
- `app/styles/bugs.css`: `.bugs-action-btn`, `.bugs-card-actions`, `.bugs-card-header-left`, updated `.bugs-comment-action-btn`, mobile rule.
- `app/bugs/bugs-list.tsx`: Accepts `onEditReport`, `onDeleteReport`, `currentUserId`, `isContentManager`; renders icon action buttons on cards.
- `app/bugs/bugs-detail.tsx`: Edit/delete buttons replaced with `.bugs-action-btn` icon buttons.
- `app/bugs/bugs-client.tsx`: Wires list-level edit/delete; adds `ConfirmModal` for list deletion; imports `useAuth`/`useUserRole`. Tracks `editOrigin` so the back button and cancel action return to the correct view (list vs detail) depending on where the edit was initiated.

---

## 2026-02-15 — Enhancement: Bug report category i18n + page selector dropdown

**Category translations:**

- Added `slug` column to `bug_report_categories` table. Built-in categories get slugs (`bug`, `feature_request`, `ui_issue`, `data_problem`, `other`).
- Categories are now translated via `bugs.categories.<slug>` in `en.json`/`de.json`, with fallback to raw name for custom admin-created categories.
- Updated all UI displaying category names: list badges, detail view, form dropdown, admin controls dropdown.
- Admin controls status/priority dropdowns also now use i18n strings instead of hardcoded English.

**Page selector dropdown:**

- Replaced the free-text "Page URL" input with a dropdown listing all known site pages: 9 main pages, Profile, Settings, and all 10 admin sub-pages (Clan Management, Approvals, Users, Validation, Corrections, Logs, Forum Management, Data Import, Chest DB, Design System).
- Includes an "Other / Custom URL" option that reveals a text input for arbitrary URLs.
- Auto-detects known pages from `initialPageUrl` (e.g., the floating widget auto-captures the current path; on admin tabs it detects the generic `/admin` since `usePathname()` doesn't include query params).
- Sidebar pages pull labels from `nav.*` translations (single source of truth); extra pages (Profile, Settings, generic Admin) use `bugs.pages.*`.

**DB migration:** `Documentation/migrations/bug_reports_v3.sql` — adds `slug` column and populates it for the 5 seeded categories.

**Files changed:**

- `lib/types/domain.ts`: `BugReportCategory` gains `slug: string | null`.
- `app/bugs/bugs-types.ts`: `BugReportListItem` and `BugReportDetail` gain `category_slug`.
- `app/api/bugs/route.ts`, `app/api/bugs/[id]/route.ts`: Return `category_slug` from joined data.
- `app/api/bugs/categories/route.ts`: Return `slug` in GET/POST/PATCH responses.
- `app/bugs/bugs-form.tsx`: Page dropdown with `SITE_PAGES` constant, `RadixSelect` + conditional custom input.
- `app/bugs/bugs-list.tsx`, `bugs-detail.tsx`, `bugs-admin-controls.tsx`: `translateCategory()` helper for i18n display.
- `messages/en.json`, `messages/de.json`: New `bugs.categories.*` section; `bugs.pages.*` reduced to form strings + 3 extra pages (Profile, Settings, Admin) — sidebar pages now share `nav.*` labels.

---

## 2026-02-15 — Enhancement: Bug Reports list redesign + pagination

**List layout overhaul:**

- Each report is now a distinct card (`.bugs-report-card`) instead of a row inside a single card.
- Cards show status/priority badges, a truncated description preview (120 chars), reporter name, date, category, comment count, and screenshot count.
- Toolbar (filters + search + sort) is its own separate card above the report cards.
- Search field is constrained to 260px max-width and grouped on the same row as the sort dropdown.
- Filter dropdowns (status, priority, category) are on their own row above search/sort.

**Pagination:**

- Integrated existing `usePagination` hook + `PaginationBar` component into the list.
- Default page size: 15 reports. Compact pagination bar with 15/30/50 page size options.
- Toolbar always visible even when results are empty (empty state handled inside `BugsList`).

**Files changed:**

- `app/bugs/bugs-list.tsx`: Rewrote layout — card grid, search+sort row, pagination.
- `app/bugs/bugs-client.tsx`: Removed `isEmpty`/`emptyMessage` from `DataState`; now passed into `BugsList`.
- `app/styles/bugs.css`: New classes for `.bugs-list-wrapper`, `.bugs-toolbar-card`, `.bugs-search-row`, `.bugs-search-field`, `.bugs-report-grid`, `.bugs-report-card`, `.bugs-card-*`, `.bugs-empty-state`. Removed old `.bugs-list-item*` and `.bugs-sort-group` rules. Updated responsive rules.

---

## 2026-02-15 — Enhancement: Guest role + rank

**Guest role promoted to member-level permissions:**
The "guest" role now has the same permissions as "member" (article, forum, messages, data view, bugs). Previously guests could only edit their own profile. Guest is now selectable in the admin user role dropdown with localized labels (EN: "Guest", DE: "Gast").

**Guest rank added:**
New "guest" rank (EN: "Guest", DE: "Gast") added below soldier in the rank hierarchy. On the members page, guests appear as the last category. When an admin creates a game account for a user with the "guest" role, the rank defaults to "guest". Badge color: purple (`#9a8ec2`).

**Changes:**

- `lib/permissions.ts`: Guest permission set matches member.
- `app/admin/admin-types.ts`: Guest added to `roleOptions`, `rankOptions`, `RANK_LABELS`, and `LOCALIZED_ROLE_LABELS`.
- `app/admin/tabs/users-tab.tsx`: Default rank set to "guest" when creating a game account for a guest-role user.
- `app/members/members-client.tsx`: Guest rank color added; sort order automatic via `rankOptions` index.
- `lib/permissions.test.ts`, `app/admin/admin-types.test.ts`: Tests updated.
- **Migration:** `Documentation/migrations/guest_role_permissions.sql` — updates `has_permission()` SQL function. Also syncs `bug:create`/`bug:comment` into all non-admin roles.

---

## 2026-02-15 — Enhancement: Bug Reports edit/delete + admin email notifications

**Report edit/delete:**

- Reports can be edited (title, description, category, page URL) by the author or admins. Edit switches to form view with pre-filled data (like forum post editing).
- Reports can be deleted by the author or admins. Uses `ConfirmModal` with danger variant.
- `DELETE /api/bugs/[id]` route added. Cascades to comments and screenshots.
- `PATCH /api/bugs/[id]` extended: reporters can now update title, category, and page URL (previously only description).
- `bugReportUpdateSchema` extended with `title` and `page_url` fields.

**Comment edit/delete:**

- Inline edit/delete on comments (same pattern as forum comments) for authors and admins.
- New `PATCH` and `DELETE` routes at `/api/bugs/[id]/comments/[commentId]`.
- `BugReportComment` type gains `updated_at` field; "(edited)" indicator shown on modified comments.
- `useBugComments` hook now exposes `editComment` and `deleteComment`.

**Larger text areas:**

- Bug report description: 8 rows (was 6); compact widget: 5 rows (was 4).
- Comment textarea: 5 rows (was 3).

**Admin email notifications:**

- Admins (owner/admin/moderator/editor) can opt in to receive an email when a new bug report is submitted.
- New `bugs_email_enabled` column on `user_notification_settings` (default: `false`).
- Toggle added to the Settings page notification section.
- Email sent via Resend API (no npm dependency — raw `fetch`). Requires `RESEND_API_KEY` and `RESEND_FROM_EMAIL` env vars; silently skipped if not configured.
- HTML email template with dark theme, report details, and direct link.
- Email logic is fire-and-forget; failures are logged but never block the request.

**Migration:** `Documentation/migrations/bug_reports_v2.sql` — adds `updated_at` to comments, `bugs_email_enabled` to settings, plus RLS policies for comment/report edit and delete.

---

## 2026-02-15 — Fix: Project-wide CSS browser compatibility audit

Audited all 9 feature CSS files for five classes of cross-browser issues. Fixed 17 issues across 7 files.

**Messages reply area cutoff (root cause):**

- Reply form clipped or invisible in thread panel. Flexbox `min-height: auto` default prevented `.messages-thread-list` from shrinking, pushing `.messages-reply-form` outside the `overflow: hidden` boundary.
- Added `flex-shrink: 0` to `.messages-reply-form` so it always keeps its full height.
- Mobile (< 900px): removed shared `max-height`, gave each panel its own constraint. Media query placed at end of file to avoid cascade override by base rules.

**Flex shrinking (`min-height: 0`):**

- `layout.css`: `.nav` in sidebar.
- `components.css`: `.notification-bell__list`.
- `messages.css`: `.messages-list-panel`, `.messages-conversation-list`, `.messages-thread-panel`, `.messages-thread-list`.

**Non-standard `word-break: break-word` → `overflow-wrap: break-word`:**

- `forum.css`: `.forum-detail-content`, `.forum-comment-text`; removed redundant `word-break` from `.forum-md`.
- `messages.css`: `.messages-email-body`.

**Border shift (content jump on selection):**

- `tables.css`: added transparent `border-left: 3px` to shared `.table header, .table .row` rule so `.row.selected` and `.row.is-shadow` don't shift content and header/row columns stay aligned.
- `components.css`: `.notification-bell__item` for `.unread` state.
- `messages.css`: `.messages-conversation-item` for `.active` state.

**Hover-only elements invisible on touch (`@media (hover: none)`):**

- `events.css`: `.upcoming-event-actions`.
- `components.css`: `.notification-bell__delete`.
- `design-system.css`: `.editable-text-pencil`, `.editable-list-drag-handle`, `.editable-list-actions`.
- `messages.css`: `.messages-list-action-btn`.

**Missing `-webkit-appearance: none` prefix:**

- `components.css`: global `select` rule.
- `layout.css`: `.sidebar-clan-select select`.
- `messages.css`: `.messages-checkbox`.

---

## 2026-02-15 — Enhancement: Bug Reports page layout & filters

- Added hero banner (gold dragon) and restored `AuthActions` (profile widget + notification bell) in the top bar — page now matches the standard template used by all other sections.
- Moved "New Report" and "Back to list" buttons from the top bar into the content area (top-left), freeing the top bar for navigation controls.
- Added priority filter dropdown alongside existing status and category filters.
- Added sort dropdown (newest, oldest, title A–Z, priority highest, status) — client-side sorting via `useMemo`.
- Added `BugSortOption` type and extended `BugListFilter` with `priority` and `sort` fields.
- Sort group floats right on desktop, goes full-width on mobile.
- Full i18n: added `heroTitle`, `heroSubtitle`, `priority.all`, and `sort.*` keys in EN + DE.

---

## 2026-02-15 — Feature: Bug Report / Ticket System

- Added complete bug reporting system with dedicated `/bugs` page and sidebar navigation link.
- Users can submit reports with title, description, category, page URL, and up to 5 screenshots.
- All tickets visible to all authenticated users (transparent tracking).
- Simple workflow: Open → Resolved → Closed, with admin-only priority (low/medium/high/critical).
- Threaded comments for back-and-forth between reporters and admins.
- Admin-managed categories with CRUD (default: Bug, Feature Request, UI Issue, Data Problem, Other).
- Floating quick-report widget on every page — auto-captures current page URL, doesn't show on `/bugs`.
- Admin controls inline on the bugs page (status, priority, category changes) for content managers.
- Screenshot upload via drag-and-drop with preview thumbnails and lightbox viewer.
- New DB tables: `bug_reports`, `bug_report_categories`, `bug_report_comments`, `bug_report_screenshots`.
- New Supabase Storage bucket: `bug-screenshots`.
- Full i18n support (English + German).
- New permissions: `bug:create`, `bug:comment` (member+), admin wildcard covers `bug:manage`.

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
- Removed auth-gated pages (`/forum`, `/events`, `/analytics`) from sitemap — they redirect unauthenticated crawlers to `/home`, causing duplicate titles and uncrawlable entries.

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

- Dashboard widgets: live data from `/api/analytics`.
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
- Data import, chest database, events calendar, announcements, analytics.
- Notification system, clan context, Design System Asset Manager.
