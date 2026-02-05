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
  - Tabs: Clan Management, Users, Rules, Audit Logs, Data Import, Data Table.
  - Clan Management manages **game accounts** (not users) and supports assign‑to‑clan modal.
  - Users tab supports search/filters, inline edits, add game accounts, create users (invite), delete users.
  - Global save/cancel applies to user + game account edits.
  - Files: `app/admin/admin-client.tsx`, `app/api/admin/create-user/route.ts`, `app/api/admin/delete-user/route.ts`
- **Data import (Pattern 1)**
  - Creates missing clans, ensures a default game account for uploader.
  - Writes memberships to `game_account_clan_memberships`.
  - `app/data-import/data-import-client.tsx`
- **Data table**
  - Filters, batch ops, select-all, confirmation guards.
  - Clan filter defaults to current clan context.
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
- **Custom dropdowns**
  - Replaced native selects with Radix select styling globally.
  - `app/components/ui/radix-select.tsx`, `app/globals.css`

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
