# Handoff Summary (What’s Done + What’s Next)

This file is a compact context transfer for a new chat.

## Current State (Implemented)

- **App scaffold + theme** with App Router and global styles.
  - `app/layout.tsx`, `app/globals.css`, `app/page.tsx`
- **Auth** (login/register/forgot/update) wired to Supabase Auth.
- **Profile + Settings**
  - `/profile` shows user info + game-account memberships.
  - `/settings` allows email/password update.
- **Core model shift**: `user → game_account → clan`.
  - New tables: `game_accounts`, `game_account_clan_memberships`.
  - RLS updated to use game-account memberships.
- **Clan context selector**
  - Sidebar dropdown selects current clan + game account (custom Radix select).
  - Stored in `localStorage`; `ClanScopeBanner` shows current context.
  - Files: `app/components/sidebar-nav.tsx`, `app/components/clan-scope-banner.tsx`, `app/components/use-clan-context.ts`
- **Admin gating**
  - Admin routes protected by `proxy.ts` with `/not-authorized` fallback.
  - Admin toggle + safeguard to keep at least one admin.
  - Files: `proxy.ts`, `app/not-authorized/page.tsx`, `lib/supabase/admin-access.ts`
- **Admin UI**
  - Tabs: Clan Management, Users, Validation, Corrections, Audit Logs, Data Import, Chest Database.
  - Clan Management manages **game accounts** (not users) and supports assign‑to‑clan modal.
  - Users tab supports search/filters, inline edits, add game accounts, create users (invite), delete users.
  - Global save/cancel applies to user + game account edits.
  - Validation + Correction rules support: sorting, selection, batch delete, import/export, active/inactive status (corrections).
  - Files: `app/admin/admin-client.tsx`, `app/api/admin/create-user/route.ts`, `app/api/admin/delete-user/route.ts`
- **Data import (Pattern 1)**
  - Creates missing clans and commits chest data via an admin API endpoint.
  - Does not validate players against game accounts on import.
  - Auto-correct (toggle) runs before validation (toggle).
  - Per-row actions to add validation/correction rules.
  - Batch edit, multi-select, remove selected rows.
  - Commit warning modal with skip/force options.
  - Filters + sorting + pagination, row numbers, and top scrollbar.
  - Files: `app/data-import/data-import-client.tsx`, `app/api/data-import/commit/route.ts`
- **Chest Database**
  - Filters, batch ops, select-all, confirmation modals.
  - Row actions use icon buttons; batch delete/edits are confirmed.
  - Clan filter defaults to all clans unless manually filtered.
  - Correction rules applied on save; validation uses corrected values.
  - `app/data-table/data-table-client.tsx`
- **News + Events (DB-backed, clan-scoped)**
  - Create/edit/delete posts and events.
  - News tags + tag filter.
  - Files: `app/news/news-client.tsx`, `app/events/events-client.tsx`
- **Audit logs**
  - Pagination + filters (action/entity/actor + clan).
- **Toasts**
  - Global toast provider for status messages.
  - `app/components/toast-provider.tsx`
- **Reusable UI components**
  - Standardized icon-only actions and search inputs across admin and data views.
  - Dropdowns and labeled dropdowns share consistent styling and behavior.
  - `app/components/ui/icon-button.tsx`, `app/components/ui/search-input.tsx`, `app/components/ui/labeled-select.tsx`, `app/components/ui/radix-select.tsx`
  - `app/components/table-scroll.tsx` (sync top/bottom horizontal scrollbars)

## Recent UI Fixes

- Admin users table: header/rows align on small screens (horizontal scroll fixes).
- Admin data table: header alignment fixed under vertical scrollbar.
- Radix select trigger keeps icon inside on small screens.
- Removed hover effects from non-interactive containers (cards/rows/lists).
- Added row numbers to tables and standardized pagination placement.
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
- Adds `status` column to `correction_rules` + index on `(clan_id, field, match_value)`.
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

## Required Env

`.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Remaining TODOs (Suggested Next Steps)

1. **Charts implementation**
   - Replace placeholders with real charts.
2. **Messages**
   - Decide data model (global per user) and build real UI.

## Known Behaviors

- Clan context is stored in `localStorage` and used by news/events/data table.
- Messages are global (not clan-scoped).
- Date pickers display dd.mm.yyyy, stored as YYYY‑MM‑DD.

## Critical SQL updates to run (if not yet run)

- `profiles_insert` policy.
- `get_email_for_username` RPC + grant.
- `is_any_admin` + `prevent_username_change` trigger.
- `clans.is_default` column + single‑default trigger.
- `rank` column on `game_account_clan_memberships`.
