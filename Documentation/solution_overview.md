# Solution Overview And Checklist

This document captures the agreed updates to the PRD, the proposed solution, and the working checklist for implementation and UI prototyping.

## Decisions Logged

- Authentication will use Supabase Auth (email/password) with email verification and password recovery.
- Data import supports Pattern 1 CSV only (DATE, PLAYER, SOURCE, CHEST, SCORE, CLAN), aligned to `Documentation/data_example.csv`.
- Pattern 2 is deprecated and removed from scope.
- Usernames are required and case‑insensitive. Display names are optional.
- Admin routes include data import, data table, and user management.

## Updated PRD Areas

- Auth flows and session handling now reference Supabase Auth.
- Data import/preview and scoring now target Pattern 1 CSV only.
- Parsing feedback and date inference from filename are clarified.

## Suggested Solution (MVP-First)

### Architecture

- **Frontend**: Next.js App Router, server components by default, client components for interactive tables, editors, and charts.
- **Auth**: Supabase Auth with email verification and password reset.
- **Backend**: Supabase Postgres with RLS for clan-scoped data and permissions (via game accounts).
- **Validation/Correction/Scoring**: Zod schemas for import validation; rules stored per clan and applied during preview and re-scoring (validation rules will be refactored to list-based checks).

### Core Data Model (Outline)

- **users**: profile, status, language.
- **game_accounts**: per-user game accounts.
- **game_account_clan_memberships**: clan membership per game account (rank, status).
- **clans**: metadata.
- **roles**: base permissions.
- **ranks**: rank-based permission add-ons.
- **permissions**: canonical permission list and mappings.
- **chest_entries**: CSV data with audit fields.
- **rules**: validation, correction, scoring with precedence.
- **audit_logs**: edit/delete/batch operations tracking.
- **profiles**: user_db (case‑insensitive), username, display_name.
- **user_roles**: global user role per user.
- **clans**: global default flag (`is_default`).
- **articles**: news/announcements per clan.
- **events**: clan events.

## MVP Scope Recommendation

- Public landing, auth, member dashboard.
- Data import + preview (Pattern 1 only).
- Data table (view/edit/batch) with audit log.
- Admin panel for users/clans/ranks/permissions and rule management.
- i18n (de/en) for UI text.

## UI Prototype Checklist

- Public landing: hero, clan overview, recruitment CTA, login/register entry.
- Auth flows: register, email verify, login, forgot password.
- Member dashboard: announcements, news feed, personal stats, clan stats, quick links.
- Data import: upload CSV, parse errors, preview table, corrections, commit confirmation.
- Data table: filters, pagination, inline edit, batch operations, audit log access.
- Admin: users/clans/ranks, permissions, rule management, cross-clan access.

## UI Style Reference (Total Battle Feel)

Reference image: `Documentation/totalbattle_ui.png`

### Theme Direction

- Base theme is dark blue and gold.
- Panel surfaces use layered cards with gold trims and subtle bevels.
- Emphasize ornamented headers, tab bars, and section labels.
- Use rich shadows to lift panels from the background.
- Use warm parchment-like surfaces for data tables to improve contrast.

### Suggested Palette (Initial)

- Background: #0b1622
- Surface: #12273a
- Panel edge: #1f3c57
- Gold primary: #c9a34a
- Gold highlight: #e4c778
- Text primary: #f2e6c9
- Text secondary: #b8a98a
- Accent red: #a33b2b

### UI Treatment Notes

- Buttons: gold outline + dark fill, hover to brighter gold.
- Tabs: pill-like with gold stroke and darker interior for inactive.
- Badges: round medallion style with gold rim.
- Icons: keep flat color fills but with gold or bronze outlines.

## UI Skeleton Preview

- HTML prototype pages in `Documentation/ui_skeleton/`
- Shared styles in `Documentation/ui_skeleton/styles.css`
- Auth screens: `auth-login.html`, `auth-register.html`, `auth-forgot.html`
- Component preview: `Documentation/ui_skeleton/components.html`
- Additional pages: `charts.html`, `events.html`, `messaging.html`

## Next.js App Scaffold

- `app/layout.tsx` and `app/page.tsx` with base layout and dashboard shell.
- `app/globals.css` with enhanced dark blue/gold theme (glassmorphism, transitions, hover states).
- `package.json` scripts for Next.js (`dev`, `build`, `start`, `lint`).
- Route pages: `news`, `charts`, `events`, `messages`, `admin`, `admin/data-import`, `admin/data-table`.
- Supabase Auth wiring in `lib/supabase/` and `app/auth/login`.
- Auth pages: `app/auth/register`, `app/auth/forgot`.
- Proxy guard: `proxy.ts` redirects unauthenticated users to `/home`, enforces admin access for admin routes with `/not-authorized` fallback.
- Added `app/auth/update` for reset flows and `app/components/auth-actions.tsx` for sign-out.
- Protected example: `app/profile` (middleware enforces auth).

## Data Model & Permissions

- See `Documentation/data_model_and_permissions.md` for schema outline and permission matrix.

## Testing Plan

- See `Documentation/testing_plan.md` for parsing, RBAC, and edit test coverage.

## Supabase SQL

- `Documentation/supabase_chest_entries.sql` for `chest_entries` table + RLS policies.
  - Includes audit logs, username system, global default clan, game accounts, news, and events.

## SQL Migration Checklist (re‑run safe)

- Profiles + usernames: `profiles_insert`, `get_email_for_username`, username triggers/indices.
- Audit logs: `audit_logs` table + RLS policies.
- Game account clan memberships: `rank` column.
- Default clan: `clans.is_default` + single‑default trigger.

## Data Import & Table

- Data import commits to Supabase `chest_entries` via an admin API using a service role client.
- Import does not validate players against game accounts; chest data is treated as raw OCR input.
- Data table reads `chest_entries` via server client.
- Data table supports inline edit validation and batch operations.
- Data import and data table use a shared date picker (flatpickr) with dd.mm.yyyy display.
- Data import supports inline edits for date, player, source, chest, score, clan and row removal.

## Admin Enhancements

- Admin user lookup by email via `app/api/admin/user-lookup`.
- Rules currently support create, edit, and delete in admin UI (scheduled for validation-only refactor).
- Admin tabs include Clans & Members, Users, Rules, Audit Logs, Data Import, Data Table.
- Membership table now manages game accounts (game username, clan, rank, status).
- Roles are assigned globally via `user_roles`.
- Clan Management supports assign‑to‑clan modal and batch save/cancel.
- Custom Radix selects replace native dropdowns across the app.
- Global default clan is stored in `clans.is_default`.
- Clan context selector in sidebar scopes clan data views.
- ESLint uses Next.js flat config (`eslint.config.js`); run `npx eslint .`.

## Handoff Summary

- `Documentation/handoff_summary.md` contains current status and next steps.

## Runbook

- `Documentation/runbook.md` includes setup, usage, and troubleshooting.

## Implementation Checklist

- Define permission matrix and RLS policies.
- Implement Supabase Auth and protected routes.
- Build Pattern 1 CSV parser and preview table.
- Implement validation/correction/scoring rules and admin UI.
- Build data table with edit + batch operations + audit logging.
- Add dashboard widgets and basic charts.
- Add i18n for UI strings (de/en).

## Outstanding/Follow-up

- Admin gating is enforced; review if permissions need tightening.
- Implement real charts (Recharts/Nivo).
- Decide messages data model (global per user) and build real UI.
