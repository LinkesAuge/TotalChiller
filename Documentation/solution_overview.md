# Solution Overview And Checklist

This document captures the agreed updates to the PRD, the proposed solution, and the working checklist for implementation and UI prototyping.

## Decisions Logged

- Authentication will use Supabase Auth (email/password) with email verification and password recovery.
- Data import supports Pattern 1 CSV only (DATE, PLAYER, SOURCE, CHEST, SCORE, CLAN), aligned to `Documentation/data_example.csv`.
- Pattern 2 is deprecated and removed from scope.
- Usernames are required and case‑insensitive. Display names are optional.
- Admin routes include data import, chest database, and user management.
- Rules tab renamed to **Validation**; **Corrections** added as a first‑class admin section.
- Auto‑correct runs before validation; both are toggleable in data import.
- Default timestamp display is German format (`dd.MM.yyyy, HH:mm`).

## Updated PRD Areas

- Auth flows and session handling now reference Supabase Auth.
- Data import/preview and scoring now target Pattern 1 CSV only.
- Parsing feedback is summarized (no per-row error list); batch date override is removed.

## Suggested Solution (MVP-First)

### Architecture

- **Frontend**: Next.js App Router, server components by default, client components for interactive tables, editors, and charts.
- **Auth**: Supabase Auth with email verification and password reset.
- **Backend**: Supabase Postgres with RLS for clan-scoped data and permissions (via game accounts).
- **Validation/Correction/Scoring**: Zod schemas for import validation; validation and correction rules are **global** (not clan-specific) and applied during preview and re-scoring; scoring rules remain per-clan; correction rules support field‑specific and `all` matches with active/inactive status.

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
- Chest database (view/edit/batch) with audit log.
- Admin panel for users/clans/ranks/permissions and rule management.
- i18n (de/en) for UI text.

## UI Prototype Checklist

- Public landing: hero, clan overview, recruitment CTA, login/register entry.
- Auth flows: register, email verify, login, forgot password.
- Member dashboard: announcements, news feed, personal stats, clan stats, quick links.
- Data import: upload CSV, parse errors, preview table, corrections, commit confirmation.
- Chest database: filters, pagination, inline edit, batch operations, audit log access.
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
- `chest_entries` RLS: add `is_any_admin()` to SELECT and INSERT policies.
- Global rules: make `clan_id` nullable on `validation_rules` and `correction_rules`, update RLS policies and index.

## Data Import & Chest Database

- Data import commits to Supabase `chest_entries` via an admin API using a service role client.
- Import does not validate players against game accounts; chest data is treated as raw OCR input.
- Chest database reads `chest_entries` via server client.
- Chest database supports inline edit validation and batch operations.
- Data import supports inline edits for date, player, source, chest, score, clan and row removal.
- Auto‑correct (toggle) runs before validation (toggle); corrected fields are highlighted.
- Data import supports batch edit, commit warning (skip/force invalid), and row-level add‑rule actions.
- Chest database supports per-row correction/validation rule actions, row status and correction status filters.
- Player, source, and chest fields use combobox inputs with suggestions from valid validation rules.
- Tables include row numbers, sortable headers, selection, and consistent pagination placement.

## Admin Enhancements

- Admin user lookup by email via `app/api/admin/user-lookup`.
- Validation + Correction rules are **global** (not clan-specific). Support create, edit, delete, import/export, selection, and sorting.
- Admin tabs include Clans & Members, Users, Validation, Corrections, Audit Logs, Data Import, Chest Database.
- Membership table now manages game accounts (game username, clan, rank, status).
- Roles are assigned globally via `user_roles`.
- Clan Management supports assign‑to‑clan modal and batch save/cancel.
- Reusable UI primitives for filters/actions:
  - `icon-button` for icon-only actions.
  - `search-input` for labeled search fields.
  - `labeled-select` and `radix-select` for consistent dropdowns (with optional search).
  - `combobox-input` for text input with filterable suggestion dropdowns.
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
- Build chest database with edit + batch operations + audit logging.
- Add dashboard widgets and basic charts.
- Add i18n for UI strings (de/en).

## Charts & Stats

- Charts implemented with **Recharts** (dark blue/gold themed).
- API route `/api/charts` aggregates `chest_entries` server-side (RLS-enforced).
- Chart types: Clan Score Over Time (line), Top Players (bar), Chest Type Distribution (pie), Personal Score (line).
- Summary panel with total chests, total score, avg score, top chest type, unique players.
- Filters: date range, player, source, clan context.
- Player-to-game-account linking: case-insensitive match `LOWER(chest_entries.player) = LOWER(game_accounts.game_username)`.
- Files: `app/charts/charts-client.tsx`, `app/charts/chart-components.tsx`, `app/charts/chart-types.ts`, `app/api/charts/route.ts`.

## News & Events Polish

- News: collapsible create/edit form, pinned-first sorting, tag filter, loading state, full-width cards.
- Events: collapsible create/edit form, past/upcoming separation (collapsible past section), themed Flatpickr datetime pickers, loading state, full-width cards.
- DatePicker component extended with `enableTime` prop for datetime support.
- Page shells delegate fully to client components (removed non-functional header buttons).

## Outstanding/Follow-up

- Admin gating is enforced; review if permissions need tightening.
- Decide messages data model (global per user) and build real UI.
- Dashboard widgets (personal/clan stats summary cards).
- i18n for UI strings (German/English).
