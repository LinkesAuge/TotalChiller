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
- **Profile + Settings**
  - `/profile` shows user info, game accounts (with approval status), and clan memberships.
  - Users can request new game accounts from the profile page (pending admin approval).
  - `/settings` allows email/password update and notification preference toggles.
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
  - Admin routes protected by `proxy.ts` with `/not-authorized` fallback.
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
    - **CRITICAL**: Both `/api/site-content` and `/api/site-list-items` must be in `isPublicPath()` in `proxy.ts`.
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
  - Full inbox with private messages, admin clan broadcasts, and system notifications.
  - Flat message model: `messages` table with `sender_id`, `recipient_id`, `message_type` (`private`/`broadcast`/`system`).
  - Two-column layout: conversation list (left) with search/filter, thread view (right) with compose.
  - Admin-only "Broadcast" button sends to all active clan members.
  - System messages sent automatically on game account approval/rejection.
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

## Recent UI Fixes

- **Sanctum Redesign** (Feb 2026):
  - Complete "Fortress Sanctum" UI/UX rework across all pages.
  - Collapsible sidebar with real user data, rank resolution, and integrated clan selector.
  - All admin pages, tables, tabs, selects, inputs, badges, toggles, and modals restyled to Sanctum theme.
  - User widget and notification bell panels elevated (z-index 200) with Sanctum gradient styling.
  - Modal backdrop z-index 300 with blur overlay.
  - Status indicators converted from light-background to dark Sanctum-styled variants.
  - `--color-edge` unified to gold tint across all elements.
  - Breadcrumb text brightened and uppercased.
  - Sidebar, nav labels, and muted text colors brightened.
- Admin users table: header/rows align on small screens (horizontal scroll fixes).
- Admin data table: header alignment fixed under vertical scrollbar.
- Radix select trigger keeps icon inside on small screens.
- Added row numbers to tables and standardized pagination placement.
- **Clan Management fixes**: clan switching now works correctly; deleting a game account refreshes the membership list; edit state is cleared when switching clans; race condition guards added for concurrent fetches.
- **Navigation**: Messages link moved from sidebar to user menu dropdown. Notification bell with unread badge replaces the old sidebar unread count.
- **UI Cleanup** (Feb 2026):
  - Removed `QuickActions` top-bar buttons ("CSV hochladen", "Regeln überprüfen", "Veranstaltungskalender") from all pages.
  - Removed `ClanScopeBanner` ("Anzeige THC username") from all pages.
  - Deleted unused component files: `app/components/quick-actions.tsx`, `app/components/clan-scope-banner.tsx`.
  - Added decorative gold divider line (gradient pseudo-element) below `.top-bar` to close the nav-to-content gap.
  - Reduced `.hero-banner` margin-top to 0 for seamless layout.
  - Global `option` element styling ensures dark theme for any remaining native `<select>` dropdowns.
- **Announcements major overhaul** (Feb 2026):
  - Complete card redesign with banner headers, rich markdown editor, content normalization.
  - Banner picker in create/edit form (6 templates + custom upload).
  - Author protection: `created_by` never overwritten; `updated_by` tracks editor.
  - Centered "Weiterlesen" pill button with gold styling.
  - Type field removed; all content is "announcement".
  - Server-side pagination, filters (search, tag, date range).
- **Forum system** (Feb 2026):
  - Full forum with categories, posts, comments, voting, markdown, thumbnails.
  - Admin tab for category management via service role API route.
  - Rich `MarkdownToolbar` and `ForumMarkdown` components shared with Announcements.
- **CMS system — full refactoring** (Feb 2026):
  - Complete CMS overhaul: new `CmsMarkdown`, `CmsMarkdownToolbar`, `EditableList`, `LoadingSkeleton`, `ErrorBanner` components.
  - `normalizeContent()` removed entirely — was the root cause of Markdown rendering issues.
  - `EditableText` refactored with 4 explicit rendering paths: children, singleLine, `markdown={true}` (CmsMarkdown), `markdown={false}` (plain text with `<br>`).
  - New `site_list_items` database table for structured list data (sort_order, badges, icons, links).
  - `EditableList` with drag-and-drop reordering (native HTML Drag API), preset icon picker, custom SVG upload, inline edit modal.
  - `useSiteContent(page)` hook extended with parallel data loading, list CRUD helpers, error state, admin-only permission check.
  - Shared `markdown-renderers.tsx` extracts common embed utilities (YouTube, images, videos) for both `CmsMarkdown` and `ForumMarkdown`.
  - Permission model unified: admin-only (`is_admin`) on both client and server — no more `getIsContentManager()`.
  - All public pages (Home, About, Contact, Privacy) follow the same pattern with `LoadingSkeleton` and `ErrorBanner`.
  - Homepage "Über uns" section with THC hero background image (opacity 0.32, no blur).
  - "Erfahre mehr über uns" button in Über uns section (primary button style, centered).
  - "Clan-Neuigkeiten" replaces "Öffentliche Neuigkeiten" as section title.
  - **Proxy**: Both `/api/site-content` and `/api/site-list-items` whitelisted in `isPublicPath()` in `proxy.ts`.
  - 40 Playwright tests covering API, Markdown rendering, public view, responsive, and component tests.
- **Branding update** (Feb 2026):
  - "The Chillers" → "[THC] Chiller & Killer" across all pages and metadata.
  - Sidebar: title "[THC]", subtitle "Chiller & Killer", logo added.
  - Navigation: "Diagramme" → "Truhenauswertung", "Ereignisse" → "Event-Kalender", Forum added.
  - Navbar text size increased to 1.0rem, icons to 18px.
- **Default game account** (Feb 2026):
  - `profiles.default_game_account_id` column for user's preferred game account.
  - Sidebar selector prioritizes: DB default → localStorage → first available.
- **Event calendar scroll-to-day** (Feb 2026):
  - Clicking a day in calendar scrolls detail panel into view.
- **Content Security Policy** (Feb 2026):
  - `next.config.js` CSP headers for YouTube embeds (`frame-src`) and media sources (`media-src`).
- **Messages page fixes** (Feb 2026):
  - Replaced native `<select>` dropdowns (compose recipient, broadcast clan) with themed `RadixSelect` components.
  - Compose recipient dropdown includes search support.
  - Added `max-height` constraint on messages layout and panels for proper inbox/thread scrolling.
- **Admin panel refactoring** (Feb 2026):
  - Broke monolithic `admin-client.tsx` (6,286 lines) into modular architecture.
  - Slim orchestrator (`admin-client.tsx`, ~140 lines) with `AdminProvider` context.
  - 7 lazy-loaded tab components via `next/dynamic` for code splitting.
  - 4 shared hooks (`usePagination`, `useSortable`, `useConfirmDelete`, `useRuleList`) eliminating ~900 lines of duplication.
  - 4 shared components (`DangerConfirmModal`, `SortableColumnHeader`, `PaginationBar`, `RuleImportModal`).
  - Updated Playwright tests with async assertions and 15s timeouts for lazy-loaded content.
- **Linting**
  - ESLint configured with Next.js flat config.
  - Run `npx eslint .`
  - `eslint.config.js`

## Supabase SQL (Important)

Run `Documentation/supabase_chest_entries.sql` in Supabase SQL Editor:

- Creates: `clans`, `game_accounts`, `game_account_clan_memberships`, `profiles`, `roles`, `ranks`, `permissions`,
  `role_permissions`, `rank_permissions`, `cross_clan_permissions`, `user_roles`, `validation_rules`,
  `correction_rules`, `scoring_rules`, `chest_entries`, `audit_logs`, `articles`, `events`
- Adds RLS policies and `updated_at` triggers.
- Adds trigger to sync `auth.users` → `profiles`.
- Adds username casing enforcement and admin‑only username change trigger.
- Adds `get_email_for_username` RPC for username login.
- Adds global default clan (`clans.is_default`) + single‑default trigger.
- Adds `rank` column on `game_account_clan_memberships`.
- Adds `status` column to `correction_rules` + index on `(field, match_value)`.
- Validation/correction rules `clan_id` is nullable (rules are global, not clan-specific).
- Moves roles to `user_roles` (no membership role column).

## SQL Migrations Checklist (re‑run safe)

Run these if the base SQL has not been run or if upgrades were applied incrementally:

1. **Profiles + usernames**
   - `profiles_insert` policy.
   - `get_email_for_username` RPC + grant.
   - `is_any_admin` + `prevent_username_change` trigger.
   - Username case‑insensitive unique index + length constraint.
2. **Audit logs**
   - `audit_logs` table + RLS policies.
3. **Game account clan memberships**
   - `rank` column on `game_account_clan_memberships`.
4. **Global default clan**
   - `clans.is_default` column + single‑default trigger.
5. **Game account approval system**
   - Run `Documentation/migrations/game_account_approval.sql`.
   - Adds `approval_status` column, check constraint, index, updated RLS policies, and approval trigger.
6. **Messaging system**
   - Run `Documentation/migrations/messages.sql`.
   - Creates `messages` table with RLS policies, indexes, and type constraints.
7. **Notification system**
   - Run `Documentation/migrations/notifications.sql`.
   - Creates `notifications` and `user_notification_settings` tables with RLS policies and indexes.
8. **Event recurrence**
   - Run `Documentation/migrations/event_recurrence.sql`.
   - Adds `recurrence_type`, `recurrence_end_date` columns to events.
9. **Event organizer**
   - Run `Documentation/migrations/event_organizer.sql`.
   - Adds `organizer` column to events.
10. **Event templates**
    - Run `Documentation/migrations/event_templates.sql`.
    - Creates `event_templates` table with all columns (title, description, location, duration, is_open_ended, organizer, recurrence_type, recurrence_end_date), RLS policies, and indexes.
    - `created_by` is nullable (templates don't require an author). Content managers (owner/admin/moderator/editor) can manage templates.
11. **Forum tables**
    - Run `Documentation/migrations/forum_tables.sql`.
    - Creates `forum_categories` and `forum_posts` tables with RLS policies.
12. **Forum storage**
    - Run `Documentation/migrations/forum_storage.sql`.
    - Creates `forum-images` storage bucket.
13. **Forum seed categories**
    - Run `Documentation/migrations/forum_seed_categories.sql`.
    - Seeds default forum categories.
14. **Profile default game account**
    - Run `Documentation/migrations/profile_default_game_account.sql`.
    - Adds `default_game_account_id` column to profiles.
15. **Article banner**
    - Run `Documentation/migrations/article_banner.sql`.
    - Adds `banner_url` column to articles.
16. **Article edit tracking**
    - Run `Documentation/migrations/article_updated_by.sql`.
    - Adds `updated_by` column to articles.
17. **Site content (CMS)**
    - Run `Documentation/migrations/site_content.sql`.
    - Creates `site_content` table with `page`, `section_key`, `field_key`, `content_de`, `content_en`, `updated_by`, `updated_at`.
    - RLS: public read, admin-only write.
    - Seeds initial homepage content (aboutUs, whyJoin, publicNews, howItWorks, contact sections).
18. **Site list items (CMS lists)**
    - Run `Documentation/migrations/site_list_items.sql`.
    - Creates `site_list_items` table with `page`, `section_key`, `sort_order`, `text_de/en`, `badge_de/en`, `link_url`, `icon`, `icon_type`.
    - Composite index on `(page, section_key, sort_order)`.
    - RLS: public read, admin-only write via `is_any_admin()`.
    - Seeds list data migrated from `site_content` entries (whyJoin, publicNews, contact sections).
19. **CMS icons storage bucket**
    - Follow `Documentation/migrations/cms_icons_bucket.sql` to manually create the `cms-icons` Supabase Storage bucket.
    - Public bucket, max 50KB, allowed MIME type: `image/svg+xml`.
    - RLS: public read, admin-only insert/delete.
20. **Fix broken Markdown in CMS content**
    - Run `Documentation/migrations/fix_broken_markdown.sql`.
    - Fixes `**word **` → `**word**` and `*word *` → `*word*` in `site_content` and `site_list_items` tables.
    - Safe to re-run (idempotent).

## Required Env

`.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Test Suite (2026-02-09, updated 2026-02-10)

Comprehensive Playwright test suite covering all page functionality, organized by feature area.

- **~253 tests** across 22 spec files in `tests/`.
- **Shared auth helper** at `tests/helpers/auth.ts` — `loginAs(page, role)` logs in as one of 6 test users (owner, admin, moderator, editor, member, guest).
- **Test user setup**: `Documentation/test-user-setup.sql` — creates roles for the pre-provisioned test users.
- **Design document**: `Documentation/plans/2026-02-09-test-suite-design.md`.
- **Admin tests updated** for lazy-loaded tab architecture — uses Playwright's auto-retrying `toContainText` assertions with 15s timeouts to wait for `next/dynamic` chunks. Added tests for logs and forum tabs.

| Category                               | File                           | Auth  |
| -------------------------------------- | ------------------------------ | ----- |
| Smoke / page loads                     | `smoke.spec.ts`                | No    |
| Auth forms                             | `auth.spec.ts`                 | No    |
| Navigation / sidebar                   | `navigation.spec.ts`           | Mixed |
| API contracts                          | `api-endpoints.spec.ts`        | No    |
| CMS pages                              | `cms-pages.spec.ts`            | Mixed |
| CMS API/components/responsive/markdown | `cms-*.spec.ts` (pre-existing) | No    |
| News / Articles                        | `news.spec.ts`                 | Yes   |
| Events / Calendar                      | `events.spec.ts`               | Yes   |
| Forum                                  | `forum.spec.ts`                | Yes   |
| Messages                               | `messages.spec.ts`             | Yes   |
| Profile & Settings                     | `profile-settings.spec.ts`     | Yes   |
| Charts                                 | `charts.spec.ts`               | Yes   |
| Dashboard                              | `dashboard.spec.ts`            | Yes   |
| Admin panel                            | `admin.spec.ts`                | Yes   |
| Permissions unit                       | `permissions-unit.spec.ts`     | No    |
| Role-based E2E                         | `roles-permissions.spec.ts`    | Yes   |

Run: `npx playwright test` (set `PLAYWRIGHT_BASE_URL` if not on port 3000).

## Remaining TODOs (Suggested Next Steps)

1. **Dashboard widgets**
   - Add personal/clan stats summary cards to the member dashboard.
2. **Member directory page**
   - Implement member directory with search, filter by clan/rank.
3. **Website improvement plan**
   - See `Documentation/plans/2026-02-07-website-improvement-plan.md` for SEO, security, accessibility, and legal compliance improvements.
   - Batch 2 (Image optimization) and Batch 3 (Security hardening) are partially implemented — `next/image` migration, CSP headers, API rate limiting, Sentry error monitoring, Zod input validation are done.
   - Remaining: SEO metadata (Batch 1), CAPTCHA (Batch 3b), E-E-A-T & Legal (Batch 5), UI/UX polish (Batch 6).

## Completed (Feb 2026)

- **Admin panel architecture refactoring** — monolithic 6,286-line `admin-client.tsx` refactored into modular architecture with shared hooks, components, context, and lazy-loaded tabs. See "Admin UI" section above for full file listing.
- **Website improvement plan — partial implementation**:
  - API rate limiting (sliding-window, strict/standard/relaxed tiers) — `lib/rate-limit.ts`
  - Zod input validation on all API routes
  - Sentry error monitoring (client, server, edge) — `sentry.*.config.ts`
  - `next/image` migration for decorative images across 18+ pages
  - Content-Security-Policy headers in `next.config.js`
  - `@next/bundle-analyzer` integration
  - Custom error page (`app/error.tsx`) and 404 page (`app/not-found.tsx`)
  - Route-level loading UI (`app/loading.tsx`)
  - React Suspense streaming for admin, profile, messages pages
  - Stricter TypeScript (`strict: true` in `tsconfig.json`)
  - Developer tooling: Prettier, Husky pre-commit hooks, lint-staged, GitHub Actions CI
  - Playwright E2E test suite (~253 tests across 22 spec files)
  - Accessibility tests with `@axe-core/playwright`
  - Internationalization of hardcoded German strings in `editable-text.tsx` and `editable-list.tsx`

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
- **CMS API must be in public paths**: Both `/api/site-content` and `/api/site-list-items` are whitelisted in `isPublicPath()` in `proxy.ts`. Without this, unauthenticated users get redirected and see only fallback content.
- CMS Markdown rendering uses `CmsMarkdown` (not `ForumMarkdown`). CSS class `.cms-md` inherits parent styles. Built-in `sanitizeCmsMarkdown()` auto-fixes broken emphasis markers (`**word **` → `**word**`).
- Homepage hero background uses `thc_hero.png` at 32% opacity with no blur effect.
- Buttons standardized: "Registrieren"/"Register" for registration, "Einloggen"/"Sign In" for login, across all pages.
- Homepage section renamed: "Clan-Neuigkeiten" (formerly "Öffentliche Neuigkeiten"), badge "Clan-News" (formerly "Öffentlich").
- "Erfahre mehr über uns" primary button in the "Über uns" section links to the About page.

## Critical SQL updates to run (if not yet run)

- `profiles_insert` policy.
- `get_email_for_username` RPC + grant.
- `is_any_admin` + `prevent_username_change` trigger.
- `clans.is_default` column + single‑default trigger.
- `rank` column on `game_account_clan_memberships`.
- `chest_entries` RLS: add `is_any_admin()` to SELECT and INSERT policies (see migration below).
- **Enable RLS on `clans` table**: `alter table public.clans enable row level security;` (policies exist but RLS was never enabled).

## chest_entries RLS admin fix (run in Supabase SQL Editor)

```sql
drop policy if exists "chest_entries_select_by_membership" on public.chest_entries;
create policy "chest_entries_select_by_membership"
on public.chest_entries
for select
to authenticated
using (
  public.is_any_admin()
  or exists (
    select 1
    from public.game_account_clan_memberships
    join public.game_accounts on game_accounts.id = game_account_clan_memberships.game_account_id
    where game_account_clan_memberships.clan_id = chest_entries.clan_id
      and game_accounts.user_id = auth.uid()
      and game_account_clan_memberships.is_active = true
  )
);

drop policy if exists "chest_entries_insert_by_membership" on public.chest_entries;
create policy "chest_entries_insert_by_membership"
on public.chest_entries
for insert
to authenticated
with check (
  auth.uid() = created_by
  and auth.uid() = updated_by
  and (
    public.is_any_admin()
    or exists (
      select 1
      from public.game_account_clan_memberships
      join public.game_accounts on game_accounts.id = game_account_clan_memberships.game_account_id
      where game_account_clan_memberships.clan_id = chest_entries.clan_id
        and game_accounts.user_id = auth.uid()
        and game_account_clan_memberships.is_active = true
    )
  )
);
```

## Make validation/correction rules global (not clan-specific) — run in Supabase SQL Editor

```sql
-- 1. Make clan_id nullable on both tables
alter table public.validation_rules alter column clan_id drop not null;
alter table public.correction_rules alter column clan_id drop not null;

-- 2. Clear existing clan_id values (rules are now global)
update public.validation_rules set clan_id = null;
update public.correction_rules set clan_id = null;

-- 3. Replace the old clan-scoped index with a global one
drop index if exists correction_rules_clan_field_match_idx;
create index if not exists correction_rules_field_match_idx
  on public.correction_rules (field, match_value);

-- 4. Update SELECT policies: all authenticated users can read rules
drop policy if exists "validation_rules_select" on public.validation_rules;
create policy "validation_rules_select"
on public.validation_rules
for select
to authenticated
using (true);

drop policy if exists "correction_rules_select" on public.correction_rules;
create policy "correction_rules_select"
on public.correction_rules
for select
to authenticated
using (true);

-- 5. Update write policies: any admin can manage rules (not clan-specific)
drop policy if exists "validation_rules_write" on public.validation_rules;
create policy "validation_rules_write"
on public.validation_rules
for insert
to authenticated
with check (public.is_any_admin());

drop policy if exists "validation_rules_update" on public.validation_rules;
create policy "validation_rules_update"
on public.validation_rules
for update
to authenticated
using (public.is_any_admin())
with check (public.is_any_admin());

drop policy if exists "validation_rules_delete" on public.validation_rules;
create policy "validation_rules_delete"
on public.validation_rules
for delete
to authenticated
using (public.is_any_admin());

drop policy if exists "correction_rules_write" on public.correction_rules;
create policy "correction_rules_write"
on public.correction_rules
for insert
to authenticated
with check (public.is_any_admin());

drop policy if exists "correction_rules_update" on public.correction_rules;
create policy "correction_rules_update"
on public.correction_rules
for update
to authenticated
using (public.is_any_admin())
with check (public.is_any_admin());

drop policy if exists "correction_rules_delete" on public.correction_rules;
create policy "correction_rules_delete"
on public.correction_rules
for delete
to authenticated
using (public.is_any_admin());
```
