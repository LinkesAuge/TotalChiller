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
  - `/profile` shows user info, game accounts (with approval status badges), and clan memberships. Compact layout (900px max-width). Primary clan resolved via `default_game_account_id` or first active membership. Membership query uses game account IDs directly (not PostgREST foreign-table filter). Clan memberships show clan names and game account usernames (not raw UUIDs). Status badges ("Standard", "Genehmigt", etc.) use compact `text-[0.75em]` tag style.
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
  - Tabs: Clan Management, Users, Validation, Corrections, Logs, Approvals, Data Import, Chest Database, Forum, Design System.
  - Clan Management manages **game accounts** (not users) and supports assign‑to‑clan modal.
  - Users tab supports search/filters (role, game account presence), inline edits, per-row save/cancel (same pattern as clan management), add game accounts, create users (invite), delete users. Game account status badges (pending/rejected) shown inline.
  - Approvals tab: review and approve/reject pending game account requests from users. Shows requester info, game username, and request date. "Approve All" button to batch-approve all pending requests with confirmation.
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
    - **Unified markdown system** in `lib/markdown/`: `AppMarkdown` component with `variant` prop ("cms" or "forum"), `AppMarkdownToolbar`, shared `sanitizeMarkdown()`, shared `renderers.tsx`.
    - `AppMarkdown variant="cms"` uses `.cms-md` CSS (inherits parent styles). `AppMarkdown variant="forum"` uses `.forum-md` CSS.
    - `EditableText` with 4 explicit rendering paths: children, singleLine, `markdown={true}` (AppMarkdown), `markdown={false}` (plain text with `<br>`).
    - `EditableList` with drag-and-drop reordering, preset icon picker (15 icons), custom SVG upload (`cms-icons` bucket), inline edit modal, badges.
    - `useSiteContent(page)` hook loads text + list content in parallel, provides CRUD helpers, error handling, admin-only permission check.
    - Shared sub-components: `LoadingSkeleton` (animated), `ErrorBanner` (with retry), `CmsSection`.
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
  - **Files**: `lib/markdown/app-markdown.tsx`, `lib/markdown/app-markdown-toolbar.tsx`, `lib/markdown/sanitize-markdown.ts`, `lib/markdown/renderers.tsx`, `app/components/cms-shared.tsx`, `app/components/editable-text.tsx`, `app/components/editable-list.tsx`, `app/components/use-site-content.ts`, `app/api/site-content/route.ts`, `app/api/site-list-items/route.ts`
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
  - **Comment edit/delete**: Users can edit and delete their own comments; admins/moderators can edit/delete any comment. Inline edit form replaces comment text; inline delete confirmation. "Edited" indicator shown on modified comments.
  - **Post edit/delete permissions**: Authors can edit/delete their own posts; moderators/admins can edit/delete any post. RLS policies use `has_permission()` for enforcement.
  - `AppMarkdown` renderer (variant="forum"): auto-embeds YouTube, images, videos, code, tables. Preview mode for list views.
  - Post thumbnails (140x100px, stretches to card height): extracts first media from content for list previews.
  - Pinned posts always sort first. Pin/unpin via create/edit form (content managers only).
  - Comment count: cached on `forum_posts.comment_count`, incremented on new comment, decremented on delete (accounts for nested replies). Post list is reloaded when navigating back from detail view.
  - Visual design: post cards with gold left-border hover accent, detail view with gold top-border, comments wrapped in styled panel with card-like comment items, gold-accented reply indent borders.
  - Forum Management tab in admin panel for category CRUD and reordering.
  - Files: `app/forum/forum-client.tsx`, `app/forum/forum-post-detail.tsx`, `app/forum/forum-post-list.tsx`, `app/forum/forum-types.ts`, `app/forum/page.tsx`, `app/api/admin/forum-categories/route.ts`, `app/admin/forum-category-admin.tsx`
  - Migrations: `forum_tables.sql`, `forum_storage.sql`, `forum_seed_categories.sql`, `forum_rls_permissions.sql`
- **Announcements (redesigned with banners, rich editor, edit tracking)**
  - Visually rich cards with banner headers (160px), gold title overlay (1.5rem), expandable content preview (280px).
  - Banner system: uses shared `BannerPicker` component with 51 game-asset presets + custom upload to Supabase Storage.
  - Rich markdown editor: uses shared `MarkdownEditor` component (write/preview tabs, toolbar, image paste/drop).
  - `sanitizeMarkdown()`: converts `•`/`–`/`—` to markdown lists, preserves single line breaks, fixes broken emphasis.
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
  - **Visual overhaul (Feb 2026)**:
    - Calendar navigation: replaced "Zurück"/"Weiter" text buttons with circular chevron arrow buttons (inline SVG). Added dedicated pill-shaped "Today" button.
    - Calendar background: removed opaque `backs_21.png` background image. Now uses a subtle radial gradient with dark navy tones for a cleaner, more modern look.
    - Calendar grid: refined day cells with subtler borders, improved hover/selected/today states. **All day numbers** now have a circle badge background (dark with subtle border) for readability against any background — today's is gold-filled, selected is gold-outlined, event days are blue-tinted.
    - **Event banner fills entire day cell**: days with banner events use the banner as a CSS `background-image` covering the full cell, with a gradient overlay for text readability.
    - **Event title snippet**: the first event's title appears at the bottom of each day cell (truncated with ellipsis), with a "+N" indicator when multiple events exist.
    - **Hover tooltip**: hovering over a day with events shows a floating info box. Single events display title, time, duration, location, and organizer. Multiple events display a compact list with colored dots, titles, and times.
    - Selected day panel: restructured with header separator, event cards featuring inline edit icon button, icon-prefixed detail rows (clock, map-pin, user SVG icons). Shows full event details including markdown-rendered description, recurrence badge, banner, organizer, location, and author with creation date.
    - Upcoming events sidebar: complete redesign with date badge column (weekday/day/month), structured event cards with icon-prefixed metadata (time, location, organizer), recurrence pills, hover-reveal edit buttons. Clicking an upcoming event navigates the calendar to that day, selects it in the "Selected Day" panel, and **scrolls the day panel into view**. **Pagination** replaces the old "show more" approach — events are shown in fixed-size pages with prev/next controls. The sidebar height aligns with the calendar via `align-items: stretch` on the grid.
    - Calendar toolbar: added bottom border separator, improved spacing and visual hierarchy.
    - Files: `app/events/event-calendar.tsx`, `app/events/upcoming-events-sidebar.tsx`, `app/globals.css`.
  - **Multi-day events (Feb 2026)**:
    - Events can now optionally have an explicit end date/time instead of a duration, enabling multi-day events.
    - Form offers radio toggle between "Duration" (hours/minutes) and "End date & time" (datetime picker) when not open-ended.
    - Multi-day events (>24h) auto-detect explicit end date mode when editing.
    - Multi-day events display on every calendar day they span (existing `getDateRangeKeys` logic).
    - New i18n keys: `durationMode`, `endDateMode`, `endDateAndTime`.
    - No DB migration needed — uses existing `ends_at` column.
  - **Event banners (Feb 2026)**:
    - Events and event templates now support an optional `banner_url` field.
    - 51 predefined banners from `/assets/game/banners/` available in a scrollable picker grid.
    - Custom banner upload via `forum-images` Supabase storage bucket (same pattern as news).
    - Live preview of selected banner in the event form.
    - Calendar day cells show a banner thumbnail strip at the bottom when a day's first event has a banner.
    - Selected day panel shows the full-width banner image at the top of each event card (natural height, min 48px).
    - Upcoming event cards show a full-width banner as a block element above the date-badge/content row (using a `.upcoming-event-body` wrapper for normal flow layout instead of absolute positioning, preventing overlap).
    - Templates carry `banner_url` through save/apply.
    - Migration: `Documentation/migrations/event_banner_url.sql`.
    - Types: `BANNER_PRESETS` and `BannerPreset` in shared `lib/constants/banner-presets.ts`.
    - Shared components: `BannerPicker` (`app/components/banner-picker.tsx`), `MarkdownEditor` (`app/components/markdown-editor.tsx`).
    - Files: `app/events/event-form.tsx`, `app/events/events-client.tsx`, `app/events/event-calendar.tsx`, `app/events/upcoming-events-sidebar.tsx`, `app/events/use-events-data.ts`, `app/events/events-utils.ts`, `app/globals.css`.
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
    - Templates have the same fields as events: title, description, location, duration/open-ended, organizer, recurrence, banner.
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
  - Unified bell icon in the top-right header (next to user menu) with unread count badge and dropdown. Only one panel (bell or user menu) can be open at a time — coordinated via lifted `activePanel` state in `AuthActions`.
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
  - `app/components/banner-picker.tsx` (shared banner image picker with presets, custom upload, live preview)
  - `app/components/markdown-editor.tsx` (shared markdown editor with write/preview tabs, toolbar, image paste/drop)
  - `lib/constants/banner-presets.ts` (shared `BANNER_PRESETS` array and `BannerPreset` type)
  - `app/components/sidebar-context.tsx` (SidebarProvider + useSidebar hook for collapse state)
  - `app/components/sidebar-shell.tsx` (sidebar layout: logo, toggle, nav, user status, clan selector)
  - `app/components/sidebar-nav.tsx` (navigation links with icons)
- **Validation/Correction rules are global**
  - Rules are no longer scoped to a specific clan; they apply across all clans.
  - `clan_id` column is nullable on `validation_rules` and `correction_rules`.
  - Any admin can manage rules; all authenticated users can read them.
  - Validation evaluator no longer indexes by clan ID.
  - `app/components/validation-evaluator.ts`, `lib/correction-applicator.ts`

## Project Audit & Test Coverage Improvement (2026-02-11)

- **Vitest unit testing** added alongside Playwright. 52 unit tests across 4 test files:
  - `lib/supabase/error-utils.test.ts` — all 4 error kinds + i18n key mapping (12 tests)
  - `lib/permissions.test.ts` — roles, validation, permission checks, helpers (30 tests)
  - `lib/date-format.test.ts` — formatting, locale, edge cases (5 tests)
  - `lib/rate-limit.test.ts` — rate limiting, blocking, IP tracking (5 tests)
- **Zod validation** added to 4 API routes:
  - `app/api/notification-settings/route.ts` — Zod schema for PATCH body (replaces `as` cast)
  - `app/api/charts/route.ts` — Zod schema for query params (clanId, dateFrom, dateTo, player, source)
  - `app/api/messages/[id]/route.ts` — UUID validation for route param
  - `app/api/notifications/[id]/route.ts` — UUID validation for route param
- **Shared validation schemas**: `lib/api/validation.ts` — reusable `uuidSchema`, `notificationSettingsSchema`, `chartQuerySchema`.
- **Try/catch wrappers** added to 5 API routes: charts, notifications, notification-settings, messages/[id], notifications/[id].
- **Error consistency**: `use-events-data.ts` now uses `classifySupabaseError` instead of raw `error.message` (same pattern as `events-client.tsx`).
- **i18n for error page**: `app/error.tsx` now uses `next-intl` translations instead of hardcoded German/English strings. New `errorPage` keys in both `messages/en.json` and `messages/de.json`.
- **12 new Playwright API tests** for previously uncovered routes: admin/user-lookup, auth/forgot-password, messages/[id], messages/search-recipients, notifications/[id], notifications/fan-out.
- **Config**: `vitest.config.ts`, `test:unit` / `test:unit:watch` scripts in `package.json`.

## Notable Bug Fixes & Changes (Feb 2026)

- **Dashboard widgets (live data)**: Quick Stats section now shows real data (personal score, clan score, chests, active members) fetched from `/api/charts` for the last 7 days, with week-over-week trend indicators. Week Highlights section replaced "Clan Progress" placeholder with top player, score change, and top chest type. "Coming Soon" badges removed.
- **Member directory**: `/members` page showing active game accounts for the currently selected clan. Uses the div-based grid table layout (`.table.member-dir`) matching the Sanctum table design system. Each row is a game account (primary) with the owning user shown as secondary text below. Rank labels pulled from the shared `RANK_LABELS` / `formatRank()` in `admin-types.ts` (single source of truth for rank translations). No search or filters — displays all members sorted by rank hierarchy then alphabetically. Columns: index, game account identity (game username + user display name), total score, chest count, rank badge, expand caret. Score and chest count are aggregated from `chest_entries` via case-insensitive `game_username`/`player` match and displayed directly in the main row. On mobile (below 768px) these two columns are hidden. Per-rank count chips shown above the table alongside clan name and total count. **Expandable rows**: clicking a row reveals a detail subrow with website role badge (admin/moderator/editor only, using `formatRole()` from `admin-types.ts`) and a "Send message" link navigating to `/messages?to=USER_ID`. Prompts user to select a clan if none is active. Added "Members" nav item in sidebar.
- **Author FK constraints**: Migration `Documentation/migrations/author_fk_constraints.sql` adds FK constraints from `articles.created_by`, `articles.updated_by`, `events.created_by`, `event_templates.created_by`, `forum_posts.author_id`, and `forum_comments.author_id` to `profiles(id)`. Enables PostgREST embedded joins — dashboard, events, and news now resolve author names in a single query instead of separate `resolveAuthorNames()` calls.
- **Events RLS fix**: Old events RLS policies used `is_clan_admin()` (owner/admin only). Updated to `has_permission('event:create')` etc., enabling moderators and editors to create/edit/delete events. Applied via the `roles_permissions_cleanup.sql` migration.
- **Supabase error handling**: New `lib/supabase/error-utils.ts` classifies Supabase errors (RLS/permission, auth, network, unknown) and maps them to user-friendly i18n messages. Events page now shows "You don't have permission" instead of raw "row-level security policy" errors.
- **Clan Management**: Fixed init effect re-running, game account deletion refreshing membership list, race condition guards for concurrent fetches.
- **Proxy API route**: All `/api/` paths bypass the proxy auth redirect — each route handles its own auth (401/403 JSON).
- **Password update page**: Redirects to dashboard after 2 seconds on success.
- **Create-user route**: Fixed duplicate variable declaration in `app/api/admin/create-user/route.ts`.
- **RLS**: `clans` table was missing `enable row level security`.
- **UI Cleanup**: Removed `QuickActions` and `ClanScopeBanner` components. Added gold divider below top bar. Messages link moved to user menu dropdown. Removed standalone "Einstellungen" button from profile top bar (settings accessible via user menu). Profile user menu replaced native `<details>` with React-controlled panel.
- **Autofill CSS**: Added `:-webkit-autofill` overrides to prevent browsers from forcing white backgrounds on input fields (especially password) in the dark theme.
- **Unified markdown system** (Feb 2026): Consolidated 3 separate sanitizers, 2 renderer components, and 2 toolbar components into a single system under `lib/markdown/`. Created `AppMarkdown` (unified renderer with `variant` prop), `AppMarkdownToolbar` (unified toolbar with full feature set + i18n), `sanitizeMarkdown()` (merged sanitizer), and relocated `renderers.tsx`. Migrated all 7 consumer files (editable-text, editable-list, forum-post-detail, forum-post-list, forum-post-form, news-client, messages-client). Deleted 5 old files (cms-markdown.tsx, cms-markdown-toolbar.tsx, forum-markdown.tsx, forum/markdown-toolbar.tsx, app/components/markdown-renderers.tsx). Added 3 new i18n keys (strikethrough, codeBlock, video) to both locale files.
- **Shared BannerPicker + MarkdownEditor components** (Feb 2026): Extracted banner image picker and markdown editor into reusable shared components (`app/components/banner-picker.tsx`, `app/components/markdown-editor.tsx`). Banner presets moved from `events-types.ts` to `lib/constants/banner-presets.ts` (shared `BANNER_PRESETS` constant with 51 game-asset banners). Announcements upgraded from 6 simple templates to the full 51-preset picker. Events upgraded from plain textarea to full markdown editor with write/preview tabs, formatting toolbar, and image paste/drop. Event template editing also uses the shared markdown editor. Event descriptions now rendered with `AppMarkdown` in past events list. CSS consolidated: `.event-banner-*` renamed to `.banner-picker-*`, `.news-banner-*` removed. New i18n namespaces: `bannerPicker`, `markdownEditor`. Both components use `useTranslations` internally for self-contained i18n.
- **List item spacing fix** (two rounds):
  - **Round 1**: Steps 3–4 in `sanitizeMarkdown()` were firing between consecutive list items (e.g. `- item1\n- item2` → `- item1\n\n- item2`), creating loose lists. Fixed by adding `^(?!- )(?!\d+\. )` guards.
  - **Round 2**: Multi-line list items (marker on its own line, content on next: `1.\ncontent\n2.`) still triggered loose lists because step 3 treated the content line as a paragraph and inserted blank lines before the next marker. Fixed with: (a) new step 5 that collapses blank lines between consecutive numbered/dash list items using a regex that handles both bare markers (`1.`) and standard markers (`1. content`); (b) step 6 hard-break exclusion changed from `(?!\d+\. )` (literal space) to `(?!\d+\.\s)` (any whitespace) to also exclude bare markers like `2.\n`; (c) CSS safety net: `.forum-md li > p` and `.cms-md li > p` set to `margin: 0` to prevent excessive spacing even if loose lists slip through.

## Database Setup

See `Documentation/runbook.md` section 1 for the full migration order. All SQL files are in `Documentation/migrations/`.

## Required Env

`.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Test Suite (2026-02-11)

### Unit Tests (Vitest)

- **52 tests** across **4 test files** in `lib/`. Runs via `npm run test:unit`.
- Config: `vitest.config.ts` with `@/` path alias.

| File                               | Tests | Description                             |
| ---------------------------------- | ----- | --------------------------------------- |
| `lib/supabase/error-utils.test.ts` | 12    | Error classification + i18n key mapping |
| `lib/permissions.test.ts`          | 30    | Roles, validation, permission helpers   |
| `lib/date-format.test.ts`          | 5     | Formatting, locale, edge cases          |
| `lib/rate-limit.test.ts`           | 5     | Rate limiting, blocking, IP tracking    |

### E2E Tests (Playwright)

Comprehensive Playwright test suite covering all page functionality, organized by feature area.

- **~250 tests** across **27 spec files** in `tests/`, running on 4 browser projects (chromium, firefox, webkit, mobile-chrome).
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
| API contracts        | `api-endpoints.spec.ts`     | 28    | No    |
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

1. ~~**Dashboard widgets**~~ — Done (2026-02-11). Stats now live from `/api/charts` + member count queries.
2. ~~**Member directory page**~~ — Done (2026-02-11). `/members` with search, clan/rank filters.
3. ~~**Add Vitest to CI**~~ — Done (2026-02-11). Unit tests run in GitHub Actions.
4. ~~**FK constraints**~~ — Done (2026-02-11). Author joins via PostgREST embedded select.

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
- Messages are global (not clan-scoped). Compose recipient and broadcast clan dropdowns use themed `RadixSelect` (with search on recipient). Messages page supports `?to=USER_ID` query param to pre-fill compose form with a specific recipient (used by member directory click-to-message).
- Date pickers display dd.mm.yyyy, stored as YYYY‑MM‑DD. Datetime pickers (events) display dd.mm.yyyy, HH:mm.
- Charts use Recharts; personal score relies on case-insensitive match between `chest_entries.player` and `game_accounts.game_username`.
- Event templates mirror the event data model exactly (same fields). Template "name" is always the same as title.
- Recurring events store a single DB row; occurrences are expanded client-side for calendar/upcoming display.
- `recurrence_parent_id` column on events is deprecated and dropped in the v2 migration. Code no longer references it.
- Author display on events/announcements uses client-side profile resolution (separate query to `profiles` table) rather than FK joins, due to missing FK constraints in the schema.
- i18n uses `next-intl` with `messages/en.json` and `messages/de.json`. All UI strings are translated.
- Announcements page uses server-side pagination with Supabase `.range()` and `{ count: "exact" }`.
- Announcements content uses `AppMarkdown` for rendering (sanitization applied universally via `sanitizeMarkdown()`).
- Announcements editing sets `updated_by` instead of `created_by` to protect original authorship. Edit info shown in card meta.
- Forum categories are managed via a server-side API route (`/api/admin/forum-categories`) with service role client to bypass RLS restrictions.
- Forum posts support markdown with rich media embeds, thumbnail extraction, and pinned-first sorting.
- Forum RLS policies use `has_permission()` for update/delete (migration: `forum_rls_permissions.sql`). Moderators/admins can edit/delete any post or comment; regular users can only manage their own. Members have `forum:edit:own` but not `forum:delete:own`; editors have both.
- Forum comment count is a cached integer on `forum_posts.comment_count`. It is incremented on new comment/reply and decremented on delete (accounting for cascade-deleted nested replies). The post list is reloaded when navigating back from detail view to ensure fresh counts.
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
- **Unified markdown system** (Feb 2026): All markdown rendering uses `AppMarkdown` (`lib/markdown/app-markdown.tsx`) with a `variant` prop. `variant="cms"` uses `.cms-md` CSS (inherits parent styles), `variant="forum"` uses `.forum-md` CSS. All content goes through `sanitizeMarkdown()` (`lib/markdown/sanitize-markdown.ts`) which: (1) normalizes line endings, (2) converts fancy bullets to `- `, (3–4) ensures blank lines before lists when preceded by a non-list paragraph — using `^(?!- )(?!\d+\. )` guards so consecutive list items stay as a tight list, (5) collapses blank lines between consecutive list items that steps 3–4 may have incorrectly created for multi-line list items (bare marker `1.` on own line with content below), (6) converts remaining single newlines to hard breaks (`  \n`) but NOT before list markers (`(?!- )(?!\d+\.\s)` — uses `\s` not literal space to also catch bare markers), (7–8) fixes broken bold/italic emphasis markers. **Critical**: the emphasis fix regexes use `[^\S\n]+` (horizontal whitespace only) instead of `\s+` to prevent matching across line boundaries. `remarkBreaks` plugin is always enabled. Both `.cms-md` and `.forum-md` use `white-space: pre-wrap` + `overflow-wrap: break-word` in CSS. Both variants have `li > p { margin: 0 }` CSS to prevent loose lists from adding excessive vertical spacing.
- `AppMarkdownToolbar` (`lib/markdown/app-markdown-toolbar.tsx`) is the single toolbar for all markdown editing (CMS, forum, news, messages). Supports Bold, Italic, Strikethrough, Heading, Quote, Code, Code Block, Link, Image, Video, List, Numbered List, Divider, and image upload (file picker, paste, drag-and-drop). i18n via `next-intl` (`cmsToolbar` namespace).
- Sidebar expanded width is 280px (CSS variable `--sidebar-width: 280px` and JS constant `EXPANDED_WIDTH = 280`). Collapsed width remains 60px.
- Homepage hero background uses `thc_hero.png` at 32% opacity with no blur effect.
- Buttons standardized: "Registrieren"/"Register" for registration, "Einloggen"/"Sign In" for login, across all pages.
- Homepage section renamed: "Clan-Neuigkeiten" (formerly "Öffentliche Neuigkeiten"), badge "Clan-News" (formerly "Öffentlich").
- "Erfahre mehr über uns" primary button in the "Über uns" section links to the About page.

## Navigation Icons — Medieval Theme Overhaul (In Progress)

**Status**: Preview page created, awaiting icon selection before integration.

### Background

- Sidebar navigation icons are defined as SVG path data in the `ICONS` record in `app/components/sidebar-nav.tsx` (lines 20–43).
- Some nav items already use `vipIcon` (PNG image) instead of SVG (e.g. Chest DB uses `/assets/vip/icons_chest_1.png`).
- **Bug**: Dashboard and Home (Startseite) share the exact same house SVG path — dashboard needs a distinct icon.
- The current generic SVG stroke icons don't match the site's medieval/Total Battle theme.

### Available Assets

- **~260 game-style PNG icons** in `/assets/game/icons/` (swords, scrolls, shields, chests, envelopes, skulls, etc.)
- **6 tier shields** in `/assets/game/shields/`
- **VIP/stat icons** in `/assets/vip/` (armor, damage, heal, crowns, stars)
- **Decorations** in `/assets/game/decorations/` (scrolls, decor elements, light effects)
- **UI assets** in `/assets/ui/` (clan logo, swords, chest, ribbon, shield)

### Preview Page

`public/icon-preview.html` — standalone HTML file, access at `/icon-preview.html` when dev server is running.

Features:

- **Tab 1 "Suggested Nav Replacements"**: Shows each nav item with current SVG icon alongside hand-picked game icon suggestions. Recommended picks marked with green star.
- **Tab 2 "Full Icon Gallery"**: All ~260 game icons with search, category filters, and light-background toggle.
- **Tab 3 "Shields, Decorations & UI"**: Additional decorative assets.
- Click any icon for enlarged preview.

### Task List (Pick Up Here)

- [ ] **1. Review preview page** — Open `/icon-preview.html` in browser, review Tab 1 suggestions and browse Tab 2 gallery. Pick one icon per nav item.
- [ ] **2. Fix Dashboard icon (critical)** — At minimum, change `ICONS.dashboard` in `sidebar-nav.tsx` line 22 to a different SVG path, or add `vipIcon` to the dashboard nav item. This is a bug regardless of whether the full medieval overhaul happens.
- [ ] **3. Decide approach** — Two options:
  - **(A) All PNG game icons**: Replace all SVG icons with game PNG icons via `vipIcon` property on each nav item. Gives full medieval look. Requires ensuring all chosen PNGs render well at 16×16px in sidebar.
  - **(B) Hybrid**: Keep SVG for some items, use game PNGs for others (like Chest DB already does). More conservative.
- [ ] **4. Update `sidebar-nav.tsx`** — For each nav item, either:
  - Change the `ICONS[key]` SVG path data (if sticking with SVG), or
  - Add `vipIcon: "/assets/game/icons/CHOSEN_ICON.png"` to the item in `NAV_SECTIONS` / `SIDEBAR_ADMIN_META`. The existing `NavItemIcon` component (lines 118–137) already handles both SVG and image icons.
- [ ] **5. Test at both sidebar widths** — Verify icons look correct when sidebar is expanded (280px) and collapsed (60px). Check tooltip visibility in collapsed mode.
- [ ] **6. Test light-background rendering** — Some game PNGs have transparent backgrounds and may be hard to see on certain backgrounds. The preview page has a "Light background" toggle to check this.
- [ ] **7. Update `editable-list.tsx` PRESET_ICONS** — If CMS list item icons should also use game assets instead of emojis, update the `PRESET_ICONS` in `app/components/editable-list.tsx`.
- [ ] **8. Remove preview page** — Delete `public/icon-preview.html` before production deployment (it's a dev/design tool only).
- [ ] **9. Add i18n for any new nav labels** — If icon changes coincide with label changes, update `messages/en.json` and `messages/de.json`.

### How to Wire a Game Icon into Nav

To switch any nav item from SVG to a game PNG icon:

```typescript
// In NAV_SECTIONS (main nav items), add vipIcon:
{ href: "/", labelKey: "dashboard", iconKey: "dashboard", vipIcon: "/assets/game/icons/icons_main_menu_rating_1.png" }

// In SIDEBAR_ADMIN_META (admin nav items), add vipIcon:
corrections: { labelKey: "corrections", iconKey: "corrections", vipIcon: "/assets/game/icons/icons_pen_1.png" },
```

The `NavItemIcon` component automatically renders `<Image>` when `vipIcon` is set, or falls back to `<svg>` with the `ICONS[iconKey]` path data.

### Suggested Mapping (from preview page, adjust after review)

| Nav Item           | Recommended Game Icon | Path                                               |
| ------------------ | --------------------- | -------------------------------------------------- |
| Home (Startseite)  | Medieval house        | `/assets/game/icons/icons_card_house_1.png`        |
| Dashboard          | Rating/stats          | `/assets/game/icons/icons_main_menu_rating_1.png`  |
| News               | Scroll                | `/assets/game/icons/icons_scroll_1.png`            |
| Charts             | Points clipboard      | `/assets/game/icons/icons_clip_points_1.png`       |
| Events             | Events banner         | `/assets/game/icons/icons_events_1.png`            |
| Forum              | Message bubble        | `/assets/game/icons/icons_message_1.png`           |
| Messages           | Envelope              | `/assets/game/icons/icons_envelope_1.png`          |
| Members            | Clan menu             | `/assets/game/icons/icons_main_menu_clan_1.png`    |
| Admin: Clans       | Clan menu             | `/assets/game/icons/icons_main_menu_clan_1.png`    |
| Admin: Approvals   | Checkmark             | `/assets/game/icons/icons_check_1.png`             |
| Admin: Users       | Player                | `/assets/game/icons/icons_player_1.png`            |
| Admin: Validation  | Paper saved           | `/assets/game/icons/icons_paper_saved_1.png`       |
| Admin: Corrections | Quill pen             | `/assets/game/icons/icons_pen_1.png`               |
| Admin: Audit Logs  | Log book              | `/assets/game/icons/icons_log.png`                 |
| Admin: Data Import | Paper add             | `/assets/game/icons/icons_paper_add_1.png`         |
| Admin: Forum       | Moderator             | `/assets/game/icons/icons_moderator.png`           |
| Settings           | Gear                  | `/assets/game/icons/icons_options_gear_on_1.png`   |
| Profile            | Captain/helmet        | `/assets/game/icons/icon_battler_captain_menu.png` |

## Design System Asset Manager (Feb 2026)

- **Admin-only tool** at `/design-system` for managing game assets, UI element inventory, and asset-to-element assignments.
- **Three Supabase tables**: `design_assets` (catalog of ~2,359 raw game PNGs), `ui_elements` (inventory of website UI patterns with render type classification), `asset_assignments` (maps assets to UI elements with roles).
- **Render type system**: Each UI element has a `render_type` (`css`, `asset`, `hybrid`, `icon`, `typography`, `composite`) that determines how it's previewed and whether game assets can be assigned to it. Only `asset`, `hybrid`, and `composite` types support asset assignment.
- **Preview system**: Dual approach — inline HTML snippets (`preview_html` column) rendered using the project's CSS for css/icon/typography elements, plus screenshot upload (`preview_image` column) for complex composite components. Scanner auto-generates preview HTML for ~50 elements.
- **Scanner scripts** in `scripts/`:
  - `scan-design-assets.ts` — scans `Design/Resources/Assets`, auto-categorizes by filename patterns (~25 categories), reads dimensions via `image-size`, copies to `public/design-assets/{category}/`, upserts to DB. Flags: `--dry-run`, `--skip-copy`, `--skip-db`.
  - `scan-ui-elements.ts` — scans `globals.css` and component directories for UI patterns, supplements with comprehensive checklist (~80 standard web UI elements). Each element classified with `render_type` and `preview_html`. Upserts to DB. Flag: `--dry-run`.
- **Three-tab UI**: Asset Library (grid with category/tag filters, size picker, light/dark bg), UI Inventory (card grid with live CSS previews per render type, render_type badges/filter, conditional "Assign Assets" button, screenshot upload for composites), Assignments (side-by-side: only assignable elements shown left, paginated asset browser right).
- **Full-screen assignment modal** (`assignment-modal.tsx`): reusable overlay triggered from Inventory and Assignments tabs. Shows element preview in header.
- **Thumbnail size picker** (`thumbnail-size-picker.tsx`): XS/S/M/L/XL for assets, S/M/L for UI element previews.
- **Screenshot upload** API (`/api/design-system/preview-upload`): accepts image file + element_id, stores to `public/design-system-previews/`, updates DB.
- **API routes**: `/api/design-system/assets`, `/api/design-system/ui-elements`, `/api/design-system/assignments`, `/api/design-system/preview-upload` — all admin-protected with Zod validation.
- **Migrations**: `design_system_tables.sql` (base tables), `design_system_render_type.sql` (adds render_type, preview_html, preview_image columns).
- **i18n**: Full German/English translations under `designSystem` namespace in `messages/en.json` and `messages/de.json`. All client components use `useTranslations("designSystem")`, server page uses `getTranslations`.
- **Files**: `app/design-system/page.tsx`, `design-system-client.tsx`, `asset-library-tab.tsx`, `ui-inventory-tab.tsx`, `assignment-tab.tsx`, `assignment-modal.tsx`, `thumbnail-size-picker.tsx`, `design-system-types.ts`.
- `public/design-assets/` is committed to git (serves game asset thumbnails in production). `public/design-system-previews/` is in `.gitignore` (runtime uploads).

## Important SQL Notes

- All RLS fixes (chest_entries admin access, global rules) are included in the base SQL and migration files.
- **Enable RLS on `clans` table**: `alter table public.clans enable row level security;` (policies exist but RLS was never enabled on some older setups).
