# Handoff Summary (What’s Done + What’s Next)

This file is a compact context transfer for a new chat.

## Roles & Permissions Refactor (2026-02-09)

- **Dropped 6 unused tables**: `roles`, `ranks`, `permissions`, `role_permissions`, `rank_permissions`, `cross_clan_permissions`.
- **Dropped `profiles.is_admin`** column (redundant with `user_roles.role`).
- **New `lib/permissions.ts`**: static permission map — single source of truth for role → permission mapping. Components use `hasPermission()`, `canDo()`, `isAdmin()`, `isContentManager()`.
- **New `lib/hooks/use-user-role.ts`**: React hook that fetches user role and exposes permission helpers.
- **Simplified `is_any_admin()` SQL function**: now checks `user_roles` only (no `profiles.is_admin`).
- **New `has_permission(text)` SQL function**: mirrors the TypeScript permission map for use in RLS policies.
- **Updated RLS policies**: articles and events now use `has_permission()` for fine-grained access control.
- **Ranks on `game_account_clan_memberships`** are now purely cosmetic (reflect in-game rank, no functional impact).
- **Migration**: `Documentation/migrations/roles_permissions_cleanup.sql`.
- **All ~20 TypeScript files refactored** to use the new permission system instead of hardcoded role checks and `profiles.is_admin`.

## Current State (Implemented)

- **App scaffold + theme** with App Router and global styles.
  - `app/layout.tsx`, `app/globals.css`, `app/page.tsx`
- **"Fortress Sanctum" UI/UX Redesign** (complete)
  - Full visual overhaul using a medieval fantasy "Sanctum" design system.
  - Collapsible sidebar layout with `SidebarProvider` context (`app/components/sidebar-context.tsx`, `app/components/sidebar-shell.tsx`).
  - Gold-accented dark theme applied globally: cards, tables, tabs, selects, inputs, buttons, modals, badges, status indicators, toggles, pagination, scrollbars.
  - VIP assets integrated: `Fontin Sans` heading font, `header_3.png` top bar backgrounds, `button_vip_crown_22x33.png` admin badge, leather button textures.
  - User widget (top-right): restyled dropdown with icons, gold hover links, Sanctum card panel.
  - Notification bell: gold-tinted header, gradient badge, themed items.
  - Sidebar bottom: combined user status (real data), highest rank across all game accounts, and clan/game account selector (native `<select>`).
  - Sidebar collapse toggle at the top of the nav bar.
  - Admin tabs: wrapping segmented control with gold active glow.
  - Select dropdowns: Sanctum gradient backgrounds, gold-accented highlights.
  - Table redesign: dark gradient header with gold divider, alternating rows, gold hover/selection.
  - Status indicators: dark Sanctum-styled badges (gold, amber, red, green).
  - CSS variable `--color-edge` changed from blue to gold-tinted `rgba(201, 163, 74, 0.15)`.
- **Auth** (login/register/forgot/update) wired to Supabase Auth.
- **New User Onboarding Flow** (Feb 2026)
  - After registration, a success panel shows 4 numbered steps: confirm email → log in → create game account → wait for clan assignment.
  - Confirmation email redirects to `/auth/login` (user must authenticate before accessing the platform).
  - Login page detects first-time users (no game accounts in DB) and automatically redirects to `/profile`.
  - Bilingual (DE/EN) Supabase email templates for all auth emails: Confirm Signup, Reset Password, Change Email, Invite User, Magic Link. Dual-theme design: light theme for Outlook (via MSO conditional comments), dark/gold theme for modern clients (Gmail, Apple Mail, etc.). Templates documented in `Documentation/supabase-email-templates.md`.
  - Files: `app/auth/register/page.tsx`, `app/auth/login/page.tsx`, `Documentation/supabase-email-templates.md`
- **Profile + Settings**
  - `/profile` shows user info, game accounts (with approval status), and clan memberships. Compact layout (900px max-width). Primary clan resolved via `default_game_account_id` or first active membership. Membership query uses game account IDs directly (not PostgREST foreign-table filter). Clan memberships show clan names and game account usernames (not raw UUIDs).
  - Users can request new game accounts from the profile page (pending admin approval).
  - `/settings` allows email/password update and notification preference toggles. Compact layout (900px max-width). Language selector uses RadixSelect (same as admin area). Email change passes `emailRedirectTo` and sets fallback cookie.
- **Core model shift**: `user → game_account → clan`.
  - New tables: `game_accounts`, `game_account_clan_memberships`.
  - RLS updated to use game-account memberships.
- **Game Account Approval System**
  - `game_accounts.approval_status` column: `pending`, `approved`, `rejected`.
  - Users can self-request game accounts (created with `pending` status via `/api/game-accounts`).
  - Admins approve/reject via `/api/admin/game-account-approvals`.
  - RLS enforces non-admins can only insert `pending` accounts; trigger prevents non-admins from changing `approval_status`.
  - Duplicate detection: case-insensitive unique index on `game_username` for `pending`/`approved` accounts.
  - Only approved accounts appear in clan context selector and charts.
  - Migration: `Documentation/migrations/game_account_approval.sql`
  - On rejection: the game account row is deleted and a system notification is sent instead.
  - On approval: a system notification is sent to the user.
  - Files: `app/api/game-accounts/route.ts`, `app/api/admin/game-account-approvals/route.ts`, `app/profile/game-account-manager.tsx`
- **Clan context selector**
  - Sidebar bottom section: native `<select>` dropdown for selecting active clan + game account (moved from navbar).
  - Stored in `localStorage`; active clan/account selection is visible in the sidebar.
  - Files: `app/components/sidebar-shell.tsx`, `app/components/use-clan-context.ts`
- **Admin gating**
  - "Verwaltung" (Administration) nav section visible to all authenticated users. Non-admins who click admin links are redirected to `/not-authorized?reason=admin` with a context-specific access denied message.
  - Admin page routes protected by `proxy.ts` middleware (`is_any_admin` RPC check).
  - `proxy.ts` also catches stray PKCE auth codes (when Supabase ignores redirectTo) and redirects to `/auth/callback`. Registration, email change, and forgot-password flows set `auth_redirect_next` fallback cookie.
  - API routes (`/api/`) bypass the proxy auth redirect entirely — each API route handles its own authentication and returns proper JSON error responses (401/403).
  - Admin toggle + safeguard to keep at least one admin.
  - Files: `proxy.ts`, `app/not-authorized/page.tsx`, `lib/supabase/admin-access.ts`
- **Admin UI** (refactored Feb 2026 — modular architecture)
  - Tabs: Clan Management, Users, Validation, Corrections, Audit Logs, Approvals, Data Import, Chest Database, Forum.
  - Clan Management manages **game accounts** (not users) and supports assign‑to‑clan modal.
  - Users tab supports search/filters, inline edits, add game accounts, create users (invite), delete users. Game account status badges (pending/rejected) shown inline.
  - Approvals tab: review and approve/reject pending game account requests from users. Shows requester info, game username, and request date.
  - Global save/cancel applies to user + game account edits.
  - Validation + Correction rules are **global** (not clan-specific). Support: sorting, selection, batch delete, import/export, active/inactive status (corrections).
  - **Architecture**: Slim orchestrator (`admin-client.tsx`, ~140 lines) with `AdminProvider` context, lazy-loaded tabs via `next/dynamic`, and shared hooks/components that eliminate ~900 lines of duplicated patterns (delete modals, sort buttons, pagination, rule list management, import modals).
  - Files:
    - Orchestrator: `app/admin/admin-client.tsx`, `app/admin/admin-context.tsx`, `app/admin/admin-types.ts`
    - Hooks: `app/admin/hooks/use-pagination.ts`, `use-sortable.ts`, `use-confirm-delete.ts`, `use-rule-list.ts`
    - Shared components: `app/admin/components/danger-confirm-modal.tsx`, `sortable-column-header.tsx`, `pagination-bar.tsx`, `rule-import-modal.tsx`
    - Tabs: `app/admin/tabs/clans-tab.tsx`, `users-tab.tsx`, `validation-tab.tsx`, `corrections-tab.tsx`, `logs-tab.tsx`, `approvals-tab.tsx`, `forum-tab.tsx`
    - APIs: `app/api/admin/create-user/route.ts`, `app/api/admin/delete-user/route.ts`, `app/api/admin/game-account-approvals/route.ts`
- **Data import (Pattern 1)**
  - Creates missing clans and commits chest data via an admin API endpoint.
  - Does not validate players against game accounts on import.
  - Auto-correct (toggle) runs before validation (toggle).
  - Per-row actions to add validation/correction rules.
  - Batch edit, multi-select, remove selected rows.
  - Commit warning modal with skip/force options.
  - Filters + sorting + pagination, row numbers, and top scrollbar.
  - Combobox inputs for player/source/chest fields with suggestions from validation rules.
  - Files: `app/data-import/data-import-client.tsx`, `app/api/data-import/commit/route.ts`
- **Chest Database**
  - Filters (including row status + correction status), batch ops, select-all, confirmation modals.
  - Row actions use icon buttons; batch delete/edits are confirmed.
  - Per-row actions to add correction and validation rules.
  - Clan filter defaults to all clans unless manually filtered.
  - Correction rules applied on save; validation uses corrected values.
  - Combobox inputs for player/source/chest fields with suggestions from validation rules.
  - `app/data-table/data-table-client.tsx`
- **CMS (Content Management System)** — Fully refactored inline-editable content for all public pages
  - **STATUS**: Complete. Design document: `Documentation/plans/2026-02-07-cms-refactoring-design.md`.
  - **Architecture**:
    - Two database tables: `site_content` (text fields, bilingual DE/EN) and `site_list_items` (structured list items with sort_order, badges, icons, links).
    - `CmsMarkdown` component for Markdown rendering (`.cms-md` CSS, inherits parent styles). Replaces `ForumMarkdown` in CMS context.
    - `EditableText` with 4 explicit rendering paths: children, singleLine, `markdown={true}` (CmsMarkdown), `markdown={false}` (plain text with `<br>`).
    - `EditableList` with drag-and-drop reordering, preset icon picker (15 icons), custom SVG upload (`cms-icons` bucket), inline edit modal, badges.
    - `useSiteContent(page)` hook loads text + list content in parallel, provides CRUD helpers, error handling, admin-only permission check.
    - Shared sub-components: `LoadingSkeleton` (animated), `ErrorBanner` (with retry), `CmsSection`.
    - `markdown-renderers.tsx` shared between `CmsMarkdown` and `ForumMarkdown` (DRY).
    - `CmsMarkdownToolbar` for CMS editing (separate from forum's `MarkdownToolbar`).
  - **API**:
    - `GET /api/site-content?page=X` — Public (service role client).
    - `PATCH /api/site-content` — Admin-only (upsert/delete).
    - `GET /api/site-list-items?page=X` — Public (service role client).
    - `PATCH /api/site-list-items` — Admin-only (create/update/delete/reorder).
    - Both `/api/site-content` and `/api/site-list-items` are listed in `isPublicPath()` in `proxy.ts`. Note: all `/api/` routes now bypass the proxy auth redirect by default, so these entries are redundant but kept for documentation clarity.
  - **Pages**: Home, About, Contact, Privacy Policy — all use the same `useSiteContent` hook pattern.
  - **Testing**: 40 Playwright tests (API, Markdown rendering, public view, responsive, components).
  - **Migrations**: `site_content.sql`, `site_list_items.sql`, `cms_icons_bucket.sql`, `fix_broken_markdown.sql`.
  - **Cursor rule**: `.cursor/rules/cms-content-management.mdc`.
  - **Files**: `app/components/cms-markdown.tsx`, `app/components/cms-markdown-toolbar.tsx`, `app/components/cms-shared.tsx`, `app/components/editable-text.tsx`, `app/components/editable-list.tsx`, `app/components/use-site-content.ts`, `app/components/markdown-renderers.tsx`, `app/api/site-content/route.ts`, `app/api/site-list-items/route.ts`
- **Branding: [THC] Chiller & Killer**
  - All instances of "The Chillers" replaced with "[THC] Chiller & Killer" across all pages, metadata, descriptions.
  - Sidebar title: `[THC]`, subtitle: `Chiller & Killer`, logo: `/public/assets/ui/chillerkiller_logo.png`.
- **Button & Label Standardization** (Feb 2026)
  - "Jetzt bewerben" / "Mitgliedschaft beantragen" → "Registrieren" / "Register" globally across all pages.
  - "Bei deinem Konto anmelden" → "Einloggen" / "Sign In" globally.
  - "[THC] Chiller & Killer beitreten" → "Registrieren" / "Register" on auth and homepage.
  - "Öffentliche Neuigkeiten" → "Clan-Neuigkeiten" / "Clan News" (section title).
  - "Öffentlich" badge → "Clan-News" / "Clan News" badge.
  - "Mehr über uns erfahren" → "Erfahre mehr über uns" / "Learn More About Us" (moved to "Über uns" section as primary button).
  - Files: `messages/de.json`, `messages/en.json`, `app/home/home-client.tsx`, `app/components/public-auth-actions.tsx`
- **Forum System** (full Reddit-style forum)
  - Categories managed via admin API route `/api/admin/forum-categories` (service role client, bypasses RLS).
  - Posts: title, content (markdown), category, pinning, voting (up/down), view count.
  - Comments: threaded replies with voting. Rich markdown editor shared with Announcements.
  - `ForumMarkdown` renderer: auto-embeds YouTube, images, videos, code, tables. Preview mode for list views.
  - Post thumbnails: extracts first media from content for list previews.
  - Pinned posts always sort first. Pin/unpin via create/edit form (content managers only).
  - Forum Management tab in admin panel for category CRUD and reordering.
  - Files: `app/forum/forum-client.tsx`, `app/forum/forum-markdown.tsx`, `app/forum/markdown-toolbar.tsx`, `app/forum/page.tsx`, `app/api/admin/forum-categories/route.ts`, `app/admin/forum-category-admin.tsx`
  - Migrations: `forum_tables.sql`, `forum_storage.sql`, `forum_seed_categories.sql`
- **Announcements (redesigned with banners, rich editor, edit tracking)**
  - Visually rich cards with banner headers (160px), gold title overlay (1.5rem), expandable content preview (280px).
  - Banner system: 6 templates from `/assets/banners/` + custom upload to Supabase Storage.
  - Rich markdown editor (shared `MarkdownToolbar` + `ForumMarkdown`).
  - `normalizeContent()`: converts `•`/`–`/`—` to markdown lists, preserves single line breaks.
  - Author protection: editing never overwrites `created_by`; `updated_by` tracks last editor.
  - Edit tracking displayed: "bearbeitet von {name} am {date}".
  - Type filter removed — all content is "announcement". Tags, search, date range filters remain.
  - Centered "Weiterlesen" pill button with gold accent, backdrop-blur, hover effect.
  - Migrations: `article_banner.sql` (`banner_url`), `article_updated_by.sql` (`updated_by`).
  - Files: `app/news/news-client.tsx`
- **Default Game Account**
  - Users can set a default game account in profile settings.
  - `profiles.default_game_account_id` prioritized in sidebar selector over localStorage.
  - Migration: `profile_default_game_account.sql`
- **Events (DB-backed, clan-scoped)**
  - Create/edit/delete with collapsible forms.
  - Calendar day click scrolls detail panel into view (`scrollIntoView` with smooth behavior).
  - Events:
    - Past/upcoming separation (collapsible past section), themed Flatpickr datetime pickers.
    - Date + time model with optional duration (hours + minutes) or "open-ended" (default).
    - Optional organizer field (free text or game account from dropdown).
    - Recurring events: daily, weekly, biweekly, monthly with optional end date or "ongoing".
    - Single DB row per recurring event; occurrences computed client-side for display.
    - Upcoming list de-duplicates recurring events (shows next occurrence only).
    - Author display on events and announcements (resolved client-side from `created_by` via profiles).
    - Role-based access: only admins, moderators, and editors can create/edit/delete events and announcements.
    - Confirmation modals for event deletion and template deletion (two-step for templates).
  - Event Templates:
    - Unified template system — all templates are DB-stored, editable, and deletable (no built-in/prebuilt distinction).
    - Templates have the same fields as events: title, description, location, duration/open-ended, organizer, recurrence.
    - Title is used as the template name (no separate "name" field).
    - Save-as-template: one-click from event form or past event cards (auto-fills from form values).
    - Templates don't require an author (`created_by` nullable).
    - Manage templates panel with inline edit form matching the event form layout.
  - Loading states on both pages.
  - Files: `app/events/events-client.tsx`
- **Charts & Stats**
  - Real charts powered by Recharts (dark blue/gold theme).
  - Charts: Clan Score Over Time (line), Top Players (horizontal bar), Chest Type Distribution (pie), Personal Score (line).
  - Summary panel: total chests, total score, avg score, top chest type, unique players.
  - Filters: date range, player, source (all scoped to selected clan context).
  - Player-to-game-account linking via case-insensitive string match (`LOWER(player) = LOWER(game_username)`).
  - API route `/api/charts` fetches and aggregates `chest_entries` server-side (RLS-enforced).
  - Files: `app/charts/charts-client.tsx`, `app/charts/chart-components.tsx`, `app/charts/chart-types.ts`, `app/api/charts/route.ts`
- **Messaging System**
  - Full inbox with private messages, global/clan broadcasts, and system notifications.
  - Flat message model: `messages` table with `sender_id`, `recipient_id`, `message_type` (`private`/`broadcast`/`system`/`clan`).
  - Two-column layout: conversation list (420px, left) with search/filter, thread view (right) with compose.
  - Filter tabs: All, Private, Clan, Broadcast. "Broadcast" filter includes both global broadcasts and legacy system messages. "Clan" filter shows clan-specific broadcasts.
  - Content manager "Broadcast" button sends to all users (global, `message_type: broadcast`) or all active clan members (clan-specific, `message_type: clan`).
  - System messages sent automatically on game account approval/rejection (`message_type: system`, grouped under Broadcast filter).
  - RLS enforces users can only see their own messages; service role inserts system messages.
  - Migration: `Documentation/migrations/messages.sql`
  - Files: `app/messages/page.tsx`, `app/messages/messages-client.tsx`, `app/api/messages/route.ts`, `app/api/messages/[id]/route.ts`, `app/api/messages/broadcast/route.ts`
- **Notification System**
  - Unified bell icon in the top-right header (next to user menu) with unread count badge and dropdown.
  - DB-stored notifications: `notifications` table with types `message`, `news`, `event`, `approval`.
  - Fan-out: news/event creation triggers notifications to all clan members via `/api/notifications/fan-out`.
  - Messages, broadcasts, and approval actions also generate notifications server-side.
  - Dropdown shows recent notifications with type icons, title, time ago, and click-to-navigate.
  - "Mark all read" action and per-notification read tracking.
  - User notification preferences: `user_notification_settings` table with per-type toggles (messages, news, events, system).
  - Preferences managed both in the bell dropdown (inline gear icon with toggles) and on `/settings` page.
  - Polls every 60s for new notifications (no WebSocket).
  - Migration: `Documentation/migrations/notifications.sql`
  - Files: `app/components/notification-bell.tsx`, `app/api/notifications/route.ts`, `app/api/notifications/[id]/route.ts`, `app/api/notifications/mark-all-read/route.ts`, `app/api/notifications/fan-out/route.ts`, `app/api/notification-settings/route.ts`
- **Audit logs**
  - Pagination + filters (action/entity/actor + clan).
- **Toasts**
  - Global toast provider for status messages.
  - `app/components/toast-provider.tsx`
- **Reusable UI components**
  - Standardized icon-only actions and search inputs across admin and data views.
  - Dropdowns and labeled dropdowns share consistent Sanctum styling and behavior.
  - `app/components/ui/icon-button.tsx`, `app/components/ui/search-input.tsx`, `app/components/ui/labeled-select.tsx`, `app/components/ui/radix-select.tsx`
  - `app/components/table-scroll.tsx` (sync top/bottom horizontal scrollbars)
  - `app/components/ui/combobox-input.tsx` (text input with filterable suggestion dropdown)
  - `app/components/date-picker.tsx` (Flatpickr date/datetime picker with optional `enableTime` prop)
  - `app/components/sidebar-context.tsx` (SidebarProvider + useSidebar hook for collapse state)
  - `app/components/sidebar-shell.tsx` (sidebar layout: logo, toggle, nav, user status, clan selector)
  - `app/components/sidebar-nav.tsx` (navigation links with icons)
- **Validation/Correction rules are global**
  - Rules are no longer scoped to a specific clan; they apply across all clans.
  - `clan_id` column is nullable on `validation_rules` and `correction_rules`.
  - Any admin can manage rules; all authenticated users can read them.
  - Validation evaluator no longer indexes by clan ID.
  - `app/components/validation-evaluator.ts`, `lib/correction-applicator.ts`

## Notable Bug Fixes & Changes (Feb 2026)

- **Clan Management**: Fixed init effect re-running, game account deletion refreshing membership list, race condition guards for concurrent fetches.
- **Proxy API route**: All `/api/` paths bypass the proxy auth redirect — each route handles its own auth (401/403 JSON).
- **Password update page**: Redirects to dashboard after 2 seconds on success.
- **Create-user route**: Fixed duplicate variable declaration in `app/api/admin/create-user/route.ts`.
- **RLS**: `clans` table was missing `enable row level security`.
- **UI Cleanup**: Removed `QuickActions` and `ClanScopeBanner` components. Added gold divider below top bar. Messages link moved to user menu dropdown.

## Database Setup

See `Documentation/runbook.md` section 1 for the full migration order. All SQL files are in `Documentation/migrations/`.

## Required Env

`.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Test Suite (2026-02-10)

Comprehensive Playwright test suite covering all page functionality, organized by feature area.

- **~240 tests** across **27 spec files** in `tests/`, running on 4 browser projects (chromium, firefox, webkit, mobile-chrome).
- **Pre-authenticated storageState**: `tests/auth.setup.ts` runs once before all projects, logging in as all 6 test roles and saving browser state to `tests/.auth/{role}.json`. Tests declare their role via `test.use({ storageState: storageStatePath("role") })` — no per-test login overhead.
- **Auth helper** at `tests/helpers/auth.ts` — exports `storageStatePath(role)` (preferred), `loginAs(page, role)` (fallback for per-test role overrides), `TEST_USERS`, `TEST_PASSWORD`, `TestRole`.
- **Test user setup**: `Documentation/test-user-setup.sql` — creates roles for the pre-provisioned test users.
- **Design document**: `Documentation/plans/2026-02-09-test-suite-design.md`.
- **i18n-aware assertions**: All text assertions use regex alternation for German/English (`/erstellen|create/i`).
- **Rate-limit tolerant**: API tests accept both expected status codes and 429 as valid responses.
- **Lazy-load tolerant**: Admin tests use 10-15s timeouts for `next/dynamic` chunk loading.

| Category             | File(s)                     | Tests | Auth  |
| -------------------- | --------------------------- | ----- | ----- |
| Smoke / page loads   | `smoke.spec.ts`             | 3     | No    |
| Auth forms           | `auth.spec.ts`              | 11    | No    |
| Navigation / sidebar | `navigation.spec.ts`        | 6     | Mixed |
| API contracts        | `api-endpoints.spec.ts`     | 18    | No    |
| CMS (5 files)        | `cms-*.spec.ts`             | 36    | Mixed |
| News / Articles      | `news.spec.ts`              | 6     | Yes   |
| Events / Calendar    | `events.spec.ts`            | 6     | Yes   |
| Forum                | `forum.spec.ts`             | 7     | Yes   |
| Messages             | `messages.spec.ts`          | 6     | Yes   |
| Profile & Settings   | `profile-settings.spec.ts`  | 13    | Yes   |
| Charts               | `charts.spec.ts`            | 6     | Yes   |
| Dashboard            | `dashboard.spec.ts`         | 3     | Yes   |
| Admin panel          | `admin.spec.ts`             | 17    | Yes   |
| Admin actions        | `admin-actions.spec.ts`     | 6     | Yes   |
| CRUD flows           | `crud-flows.spec.ts`        | 16    | Yes   |
| Data workflows       | `data-workflows.spec.ts`    | 10    | Yes   |
| Notifications        | `notifications.spec.ts`     | 6     | Yes   |
| i18n                 | `i18n.spec.ts`              | 5     | Yes   |
| Accessibility        | `accessibility.spec.ts`     | 2     | Yes   |
| Permissions unit     | `permissions-unit.spec.ts`  | 34    | No    |
| Role-based E2E       | `roles-permissions.spec.ts` | 17    | Yes   |

Run: `npx playwright test` (set `PLAYWRIGHT_BASE_URL` if not on port 3000).

## Remaining TODOs (Suggested Next Steps)

1. **Dashboard widgets**
   - Add personal/clan stats summary cards to the member dashboard.
2. **Member directory page**
   - Implement member directory with search, filter by clan/rank.
3. **SEO content expansion**
   - Increase word count on thin public pages (home, about, contact) if SEO ranking matters.

## Website Audit (Feb 2026) — Completed

Production audit score: **84/100 (B)**, up from 43/100. Key areas:

- **Security**: API rate limiting, Zod validation, Cloudflare Turnstile CAPTCHA (required on forgot-password when `TURNSTILE_SECRET_KEY` is configured; bypassed otherwise for dev/staging), Sentry with PII filtering, CSP headers.
- **SEO**: `metadataBase`, canonical URLs, Open Graph, Twitter Cards, JSON-LD, sitemap, robots.txt.
- **Legal**: Impressum, cookie consent banner, GDPR privacy policy.
- **UI/UX**: Animated sidebar, mobile menu, skeleton loaders, focus-visible outlines, scroll-to-top, toast animations, empty states, form validation.
- **Code quality**: ~240 Playwright tests, stricter TS/ESLint, image optimization, Husky + lint-staged, GitHub Actions CI.
- **Performance**: LCP preload hints, `priority` on above-fold images, Sharp compression.

## Known Behaviors

- Clan context is stored in `localStorage` and used by announcements/events/data table.
- Messages are global (not clan-scoped). Compose recipient and broadcast clan dropdowns use themed `RadixSelect` (with search on recipient).
- Date pickers display dd.mm.yyyy, stored as YYYY‑MM‑DD. Datetime pickers (events) display dd.mm.yyyy, HH:mm.
- Charts use Recharts; personal score relies on case-insensitive match between `chest_entries.player` and `game_accounts.game_username`.
- Event templates mirror the event data model exactly (same fields). Template "name" is always the same as title.
- Recurring events store a single DB row; occurrences are expanded client-side for calendar/upcoming display.
- `recurrence_parent_id` column on events is deprecated and dropped in the v2 migration. Code no longer references it.
- Author display on events/announcements uses client-side profile resolution (separate query to `profiles` table) rather than FK joins, due to missing FK constraints in the schema.
- i18n uses `next-intl` with `messages/en.json` and `messages/de.json`. All UI strings are translated.
- Announcements page uses server-side pagination with Supabase `.range()` and `{ count: "exact" }`.
- Announcements content uses `ForumMarkdown` for rendering (with `normalizeContent()` in announcements context only).
- Announcements editing sets `updated_by` instead of `created_by` to protect original authorship. Edit info shown in card meta.
- Forum categories are managed via a server-side API route (`/api/admin/forum-categories`) with service role client to bypass RLS restrictions.
- Forum posts support markdown with rich media embeds, thumbnail extraction, and pinned-first sorting.
- Default game account (`profiles.default_game_account_id`) takes priority over localStorage in sidebar selector.
- A decorative gold gradient divider line sits below the top bar on all pages.
- Global `option` CSS ensures dark-themed native `<select>` dropdown menus where RadixSelect is not used.
- Content Security Policy in `next.config.js` allows YouTube embeds and external media sources.
- Branding is "[THC] Chiller & Killer" throughout; sidebar shows logo, title "[THC]", subtitle "Chiller & Killer".
- Navigation: "Truhenauswertung" (formerly "Diagramme"), "Event-Kalender" (formerly "Ereignisse"), "Forum" added to main nav.
- CMS content is loaded via `useSiteContent(page)` hook on all public pages (home, about, contact, privacy-policy). Text fields from `site_content`, list items from `site_list_items`. Falls back to `next-intl` translations if CMS has no data.
- CMS edit controls (pencil buttons) are only visible to admins on hover. All content is publicly visible.
- CMS API uses service role client for reads (bypasses RLS) and admin-checks for writes.
- **API routes bypass proxy redirect**: All `/api/` routes bypass the proxy's auth redirect and handle their own authentication, returning proper JSON error responses. The CMS APIs (`/api/site-content`, `/api/site-list-items`) are also listed in `isPublicPath()` for historical reasons but this is now redundant.
- CMS Markdown rendering uses `CmsMarkdown` (not `ForumMarkdown`). CSS class `.cms-md` inherits parent styles. Built-in `sanitizeCmsMarkdown()` auto-fixes broken emphasis markers (`**word **` → `**word**`).
- Homepage hero background uses `thc_hero.png` at 32% opacity with no blur effect.
- Buttons standardized: "Registrieren"/"Register" for registration, "Einloggen"/"Sign In" for login, across all pages.
- Homepage section renamed: "Clan-Neuigkeiten" (formerly "Öffentliche Neuigkeiten"), badge "Clan-News" (formerly "Öffentlich").
- "Erfahre mehr über uns" primary button in the "Über uns" section links to the About page.

## Important SQL Notes

- All RLS fixes (chest_entries admin access, global rules) are included in the base SQL and migration files.
- **Enable RLS on `clans` table**: `alter table public.clans enable row level security;` (policies exist but RLS was never enabled on some older setups).
