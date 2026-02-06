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
  - Validation + Correction rules are **global** (not clan-specific). Support: sorting, selection, batch delete, import/export, active/inactive status (corrections).
  - Files: `app/admin/admin-client.tsx`, `app/api/admin/create-user/route.ts`, `app/api/admin/delete-user/route.ts`
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
- **News + Events (DB-backed, clan-scoped)**
  - Create/edit/delete posts and events with collapsible forms.
  - News: pinned-first sorting, tag filter, full-width article cards.
  - Events: past/upcoming separation (collapsible past section), themed Flatpickr datetime pickers.
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
  - `app/components/ui/combobox-input.tsx` (text input with filterable suggestion dropdown)
  - `app/components/date-picker.tsx` (Flatpickr date/datetime picker with optional `enableTime` prop)
- **Validation/Correction rules are global**
  - Rules are no longer scoped to a specific clan; they apply across all clans.
  - `clan_id` column is nullable on `validation_rules` and `correction_rules`.
  - Any admin can manage rules; all authenticated users can read them.
  - Validation evaluator no longer indexes by clan ID.
  - `app/components/validation-evaluator.ts`, `lib/correction-applicator.ts`

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

## Required Env

`.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Remaining TODOs (Suggested Next Steps)

1. **Messages**
   - Decide data model (global per user) and build real UI.
2. **Dashboard widgets**
   - Add personal/clan stats summary cards to the member dashboard.
3. **i18n**
   - Add German/English translations for UI strings.

## Known Behaviors

- Clan context is stored in `localStorage` and used by news/events/data table.
- Messages are global (not clan-scoped).
- Date pickers display dd.mm.yyyy, stored as YYYY‑MM‑DD. Datetime pickers (events) display dd.mm.yyyy, HH:mm.
- Charts use Recharts; personal score relies on case-insensitive match between `chest_entries.player` and `game_accounts.game_username`.

## Critical SQL updates to run (if not yet run)

- `profiles_insert` policy.
- `get_email_for_username` RPC + grant.
- `is_any_admin` + `prevent_username_change` trigger.
- `clans.is_default` column + single‑default trigger.
- `rank` column on `game_account_clan_memberships`.
- `chest_entries` RLS: add `is_any_admin()` to SELECT and INSERT policies (see migration below).

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
