# Handoff Summary (What’s Done + What’s Next)

This file is a compact context transfer for a new chat.

## Current State (Implemented)
- **Next.js app scaffold** with app router, theme tokens, and layout.
  - `app/layout.tsx`, `app/globals.css`, `app/page.tsx`
- **Public Home page** at `/home`, protected dashboard at `/`.
  - Middleware redirects: unauthenticated `/` → `/home`, authenticated `/home` → `/`.
  - `middleware.ts`
- **Supabase Auth** wired:
  - Login, register, forgot, update password pages.
  - Profile widget in page headers, sign‑out redirects to `/home`.
- **Profile + Settings**
  - `/profile` shows user info, memberships, and display name editor.
  - `/settings` allows email + password update.
  - Username admin‑only; display name editable by users.
- **Usernames + display names**
  - Profiles include `username`, `username_display`, `display_name`.
  - Login supports email or username (via RPC `get_email_for_username`).
  - Registration requires username; username is case‑insensitive.
- **Admin access + navigation**
  - Admin‑only routes: `/admin`, `/admin/data-import`, `/admin/data-table`.
  - Logged‑out users only see Home in sidebar.
  - Admin tabs include Clans & Members, Rules, Audit Logs, Data Import, Data Table.
- **Data import** (Pattern 1 CSV):
  - CSV parsing + preview table.
  - Zod validation + allowed clan rules.
  - Inline edits for date/player/source/chest/score/clan.
  - Row selection + remove selected rows.
  - Date picker (flatpickr) with dd.mm.yyyy display, stores YYYY‑MM‑DD.
  - Commit to Supabase `chest_entries`.
  - Clan mapping: creates missing clans, ensures memberships.
  - Files: `app/data-import/data-import-client.tsx`, `app/admin/data-import/page.tsx`
- **Data table** with live Supabase data:
  - Inline edit + per‑row validation.
  - Editable date (date picker), clan dropdown.
  - Save per row + Save All.
  - Batch update/delete with audit logs.
  - Pagination + search + page size.
  - Files: `app/data-table/data-table-client.tsx`, `app/admin/data-table/page.tsx`
- **Admin UI**:
  - Single “Clans & Members” section with clan selector + actions row.
  - Membership table with inline editable fields (username, role, email, display name, clan, rank, status).
  - Add member modal (username/email/user id).
  - Rules create/edit/delete (validation/correction/scoring).
  - Audit log viewer.
  - Files: `app/admin/admin-client.tsx`, `app/admin/page.tsx`, `app/api/admin/user-lookup/route.ts`
- **Audit logs**
  - `audit_logs` table + RLS.
  - Inserts on edits/batch updates/deletes for data table and memberships.
- **Global default clan**
  - `clans.is_default` with single‑default trigger.
  - Admin can set/clear default; dropdown preselects default.
- **Docs**:
  - `Documentation/solution_overview.md`
  - `Documentation/ui_prototype_spec.md`
  - `Documentation/ui_component_variants.md`
  - `Documentation/ui_theme_tokens.md`
  - `Documentation/testing_plan.md`
  - `Documentation/data_model_and_permissions.md`
  - `Documentation/supabase_chest_entries.sql`
  - HTML prototypes in `Documentation/ui_skeleton/`

## Supabase SQL (Important)
Run `Documentation/supabase_chest_entries.sql` in Supabase SQL Editor:
- Creates: `clans`, `game_accounts`, `game_account_clan_memberships`, `profiles`, `roles`, `ranks`, `permissions`,
  `role_permissions`, `rank_permissions`, `cross_clan_permissions`,
  `validation_rules`, `correction_rules`, `scoring_rules`, `chest_entries`, `audit_logs`
- Adds RLS policies and `updated_at` triggers.
- Adds trigger to sync `auth.users` → `profiles`.
- Adds username casing enforcement and admin‑only username change trigger.
- Adds `get_email_for_username` RPC for username login.
- Adds global default clan (`clans.is_default`) + single‑default trigger.
- Adds `rank` column on `game_account_clan_memberships`.

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
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Remaining TODOs (Suggested Next Steps)
1. **RLS tightening**
   - Restrict clans/roles/permissions tables to owner/admin only.
2. **Admin rules UX**
   - Add edit/delete confirmations and pagination.
3. **Charts implementation**
   - Replace placeholders with real charts (Recharts/Nivo).
4. **Membership UX**
   - Add search/filter in members table and inline validation.
5. **Data table UX**
   - Optional select‑all + bulk actions confirmation.

## Known Behaviors
- `chest_entries` now uses `clan_id` (UUID) not clan name.
- Data import auto-creates clans by name and upserts membership for uploader.
- Admin rule editing uses client-side fetch; relies on RLS policies.
- Data import and data table are admin‑only routes.
- Date pickers display dd.mm.yyyy, stored as YYYY‑MM‑DD.

## Critical SQL updates to run (if not yet run)
- `profiles_insert` policy.
- `get_email_for_username` RPC + grant.
- `is_any_admin` + `prevent_username_change` trigger.
- `clans.is_default` column + single‑default trigger.
- `rank` column on `game_account_clan_memberships`.

