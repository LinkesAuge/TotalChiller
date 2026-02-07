# Handoff Summary (What’s Done + What’s Next)

This file is a compact context transfer for a new chat.

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
- **Admin UI**
  - Tabs: Clan Management, Users, Validation, Corrections, Audit Logs, Approvals, Data Import, Chest Database.
  - Clan Management manages **game accounts** (not users) and supports assign‑to‑clan modal.
  - Users tab supports search/filters, inline edits, add game accounts, create users (invite), delete users. Game account status badges (pending/rejected) shown inline.
  - Approvals tab: review and approve/reject pending game account requests from users. Shows requester info, game username, and request date.
  - Global save/cancel applies to user + game account edits.
  - Validation + Correction rules are **global** (not clan-specific). Support: sorting, selection, batch delete, import/export, active/inactive status (corrections).
  - Files: `app/admin/admin-client.tsx`, `app/api/admin/create-user/route.ts`, `app/api/admin/delete-user/route.ts`, `app/api/admin/game-account-approvals/route.ts`
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
- **Announcements (formerly "News") + Events (DB-backed, clan-scoped)**
  - Renamed from "news" to "announcements" throughout the app.
  - Create/edit/delete posts and events with collapsible forms.
  - Announcements: pinned-first sorting, full-width article cards, author display.
    - "Beitrag erstellen" button placed in content area (not top bar), guarded by `canManage`.
    - Server-side pagination with page size selector, page number input, and prev/next buttons (matching data-table pattern).
    - Filters section below articles: search (title/content), type filter (news/announcement/all), tag filter, date range picker.
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
  - Files: `app/news/news-client.tsx`, `app/events/events-client.tsx`
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
- **Announcements page rework** (Feb 2026):
  - "Beitrag erstellen" button moved from top bar to content area, maintaining role-based guard.
  - Server-side pagination added (page size selector, page/total display, page jump, prev/next buttons).
  - Filters section moved below article list and expanded: search (title/content), type filter, tag filter, date range picker.
- **Messages page fixes** (Feb 2026):
  - Replaced native `<select>` dropdowns (compose recipient, broadcast clan) with themed `RadixSelect` components.
  - Compose recipient dropdown includes search support.
  - Added `max-height` constraint on messages layout and panels for proper inbox/thread scrolling.
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

## Required Env

`.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Remaining TODOs (Suggested Next Steps)

1. **Dashboard widgets**
   - Add personal/clan stats summary cards to the member dashboard.
2. **Website improvement plan**
   - See `Documentation/plans/2026-02-07-website-improvement-plan.md` for SEO, security, accessibility, and legal compliance improvements.

## Known Behaviors

- Clan context is stored in `localStorage` and used by announcements/events/data table.
- Messages are global (not clan-scoped). Compose recipient and broadcast clan dropdowns use themed `RadixSelect` (with search on recipient).
- Date pickers display dd.mm.yyyy, stored as YYYY‑MM‑DD. Datetime pickers (events) display dd.mm.yyyy, HH:mm.
- Charts use Recharts; personal score relies on case-insensitive match between `chest_entries.player` and `game_accounts.game_username`.
- Event templates mirror the event data model exactly (same fields). Template "name" is always the same as title.
- Recurring events store a single DB row; occurrences are expanded client-side for calendar/upcoming display.
- `recurrence_parent_id` column on events is deprecated and dropped in the v2 migration. Code no longer references it.
- Author display on events/announcements uses client-side profile resolution (separate query to `profiles` table) rather than FK joins, due to missing FK constraints in the schema.
- i18n uses `next-intl` with `messages/en.json` and `messages/de.json`.
- Announcements page uses server-side pagination with Supabase `.range()` and `{ count: "exact" }`.
- A decorative gold gradient divider line sits below the top bar on all pages.
- Global `option` CSS ensures dark-themed native `<select>` dropdown menus where RadixSelect is not used.

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
