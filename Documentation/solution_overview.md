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
- **Auth**: Supabase Auth with email verification and password reset. New user onboarding: confirm email → log in → auto-redirect to profile → create game account → admin assigns clan. First-login detection in login page redirects users without game accounts to `/profile`. Bilingual (DE/EN) email templates with dual-theme design (light for Outlook, dark for modern clients) configured in Supabase Dashboard (see `Documentation/supabase-email-templates.md`).
- **Backend**: Supabase Postgres with RLS for clan-scoped data and permissions (via game accounts).
- **Validation/Correction/Scoring**: Zod schemas for import validation; validation and correction rules are **global** (not clan-specific) and applied during preview and re-scoring; scoring rules remain per-clan; correction rules support field‑specific and `all` matches with active/inactive status.

### Core Data Model (Outline)

- **users**: profile, status, language.
- **game_accounts**: per-user game accounts with approval workflow (`approval_status`: pending/approved/rejected).
- **game_account_clan_memberships**: clan membership per game account (rank, status).
- **clans**: metadata.
- **user_roles**: one global role per user (owner, admin, moderator, editor, member, guest). Permission map in `lib/permissions.ts`.
- **chest_entries**: CSV data with audit fields.
- **rules**: validation, correction, scoring with precedence.
- **audit_logs**: edit/delete/batch operations tracking.
- **profiles**: user_db (case‑insensitive), username, display_name, `default_game_account_id` (nullable FK to game_accounts).
- **clans**: global default flag (`is_default`).
- **articles**: announcements per clan (formerly "news"). All content is type "announcement". Includes `created_by` for author display, `updated_by` for edit tracking, `banner_url` for header banner images.
- **events**: clan events with date+time, optional duration (or open-ended), optional organizer, recurrence support (daily/weekly/biweekly/monthly with end date or ongoing). Single row per recurring event; occurrences computed client-side.
- **event_templates**: reusable event templates per clan. Same fields as events (title, description, location, duration/open-ended, organizer, recurrence). `created_by` is nullable. Title serves as template name.
- **messages**: private messages, broadcasts, and system notifications (flat model, conversations derived by grouping sender/recipient).
- **notifications**: unified notification feed (types: message, news, event, approval) with per-user read tracking.
- **user_notification_settings**: per-user toggles for message, news, event, and system notification types.

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

## UI Style Reference — "Fortress Sanctum" Design System

### Theme Direction

- Medieval fantasy "Sanctum" aesthetic: dark backgrounds with gold accents and subtle gradients.
- Panel surfaces use layered cards with gold-tinted borders and rich shadows.
- Collapsible sidebar layout (Discord-like) with icon/text navigation.
- VIP assets integrated for visual richness (custom fonts, decorative images, leather textures).
- All interactive elements (selects, inputs, tabs, toggles, checkboxes) use consistent gold-accented styling.

### Active Palette (CSS Variables)

- Background: `#080d14` (--color-bg)
- Surface: `rgba(18, 39, 58, 0.7)` (--color-surface)
- Surface solid: `#12273a` (--color-surface-solid)
- Edge: `rgba(201, 163, 74, 0.15)` (--color-edge) — gold-tinted
- Gold primary: `#c9a34a` (--color-gold)
- Gold highlight: `#e4c778` (--color-gold-2)
- Gold light: `#f5dda3` (--color-gold-3)
- Gold dark: `#8a6d2f` (--color-gold-dark)
- Text primary: `#f2e6c9` (--color-text)
- Text secondary: `#b8a888` (--color-text-2)
- Text muted: `#6b5e4a` (--color-text-muted)
- Accent red: `#c94a3a` (--color-accent-red)
- Accent green: `#4a9960` (--color-accent-green)
- Accent blue: `#4a6ea0` (--color-accent-blue)

### Fonts

- Headings: `Fontin Sans` (loaded from `/fonts/fontin_sans_cr_sc_regular.otf`)
- Body: `Inter` (Google Fonts)

### UI Treatment Notes

- Buttons: gold border + dark gradient fill, hover lifts with gold glow. Primary variant uses deeper warm gradient. Leather variant uses VIP texture background.
- Tabs: segmented control with dark inner background, gold active state with text-shadow glow, wrapping support.
- Badges: round medallion style with gold gradient background and rim glow.
- Selects: gradient trigger with gold border, dropdown panel with gold-highlighted items.
- Inputs: gradient backgrounds with gold-tinted borders, gold focus ring.
- Status indicators: dark badges with colored borders/glow (gold, amber, red, green).
- Toggle switches: dark gradient track, gold gradient checked state with glow.
- Cards: dark gradient with gold-tinted border, hover lifts with gold border.
- Tables: dark gradient header with gold divider, alternating row backgrounds, gold hover tint.

## Next.js App Scaffold

- `app/layout.tsx` with collapsible sidebar layout via `SidebarProvider` context.
- `app/globals.css` with Fortress Sanctum design system (gold-accented dark theme, gradient surfaces, VIP assets).
- `app/components/sidebar-context.tsx` and `app/components/sidebar-shell.tsx` for sidebar state and rendering.
- `app/components/sidebar-nav.tsx` for navigation links with icons.
- `package.json` scripts for Next.js (`dev`, `build`, `start`, `lint`).
- Route pages: `news`, `forum`, `charts`, `events`, `messages`, `admin`, `admin/data-import`, `admin/data-table`, `design-system`.
- Supabase Auth wiring in `lib/supabase/` and `app/auth/login`. Error classification utility in `lib/supabase/error-utils.ts` (maps RLS/auth/network errors to i18n keys).
- Auth pages: `app/auth/register`, `app/auth/login`, `app/auth/forgot`, `app/auth/update`.
- Auth callback: `app/auth/callback/route.ts` — exchanges PKCE code for session, redirects to `next` query parameter.
- Registration success panel shows 4-step onboarding guide (confirm email → log in → create game account → wait for clan assignment).
- Login page first-login detection: queries `game_accounts` for the authenticated user; redirects to `/profile` if none exist, otherwise to `/`.
- Proxy guard: `proxy.ts` redirects unauthenticated users to `/home` for page routes, enforces admin access for admin routes with `/not-authorized?reason=admin` redirect (context-specific access denied message). Catches stray PKCE auth codes (when Supabase ignores redirectTo) and redirects to `/auth/callback`; registration, email change, and forgot-password set `auth_redirect_next` fallback cookie. API routes (`/api/`) bypass the proxy auth redirect entirely — each API route handles its own authentication and returns JSON error responses.
- Added `app/auth/update` for reset flows and `app/components/auth-actions.tsx` for sign-out (restyled with Sanctum dropdown panel, icons, and dividers).
- Protected example: `app/profile` (middleware enforces auth).
- Bilingual email templates (DE/EN) with dual-theme design (light for Outlook, dark for modern clients) for Supabase Dashboard: `Documentation/supabase-email-templates.md`.

## Data Model & Permissions

- See `Documentation/data_model_and_permissions.md` for schema outline and permission matrix.

## Testing

- **Test suite design**: `Documentation/plans/2026-02-09-test-suite-design.md` — full architecture, file listing, coverage summary, design decisions.
- **Vitest unit tests** (added 2026-02-11): 52 tests across 4 files in `lib/` covering `error-utils`, `permissions`, `date-format`, and `rate-limit`. Config: `vitest.config.ts`. Run: `npm run test:unit`.
- **~250 Playwright E2E tests** across 27 spec files covering all features.
- **Pre-authenticated storageState**: `tests/auth.setup.ts` pre-authenticates 6 roles; tests use `test.use({ storageState: storageStatePath("role") })` — no per-test login overhead.
- **Accessibility**: `@axe-core/playwright` audits on public and authenticated pages.
- **i18n**: Language switching, cookie handling, URL stability tests.
- **Code quality**: Stricter TypeScript (`noUncheckedIndexedAccess`), stricter ESLint (`no-explicit-any`, `jsx-a11y/*`), Prettier, Husky pre-commit hooks.
- **API input validation**: All API routes use Zod schemas for body/param validation (shared schemas in `lib/api/validation.ts`). All routes wrapped in try/catch for consistent error responses.
- Run: `npx playwright test` (E2E) or `npm run test:unit` (unit). See `Documentation/runbook.md` section 15 for details.

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
- Game account approval: `Documentation/migrations/game_account_approval.sql` — adds `approval_status` column, RLS policy updates, approval trigger, and duplicate-prevention index.
- Messaging system: `Documentation/migrations/messages.sql` — creates `messages` table with RLS policies, indexes, and type constraints.
- Notification system: `Documentation/migrations/notifications.sql` — creates `notifications` and `user_notification_settings` tables with RLS policies and indexes.
- Event recurrence: `Documentation/migrations/event_recurrence.sql` — adds `recurrence_type`, `recurrence_end_date` to events.
- Event organizer: `Documentation/migrations/event_organizer.sql` — adds `organizer` to events.
- Event templates: `Documentation/migrations/event_templates.sql` — creates `event_templates` table with all fields (title, description, location, duration, is_open_ended, organizer, recurrence) and RLS policies.
- Forum system: `Documentation/migrations/forum_tables.sql` — creates `forum_categories` and `forum_posts` tables. `Documentation/migrations/forum_storage.sql` — creates storage bucket. `Documentation/migrations/forum_seed_categories.sql` — seeds default categories.
- Profile default game account: `Documentation/migrations/profile_default_game_account.sql` — adds `default_game_account_id` column to profiles.
- Article banner: `Documentation/migrations/article_banner.sql` — adds `banner_url` column to articles.
- Article edit tracking: `Documentation/migrations/article_updated_by.sql` — adds `updated_by` column to articles.
- Design system base tables: `Documentation/migrations/design_system_tables.sql` — creates `design_assets`, `ui_elements`, `asset_assignments` tables with admin-only RLS policies.
- Design system render types: `Documentation/migrations/design_system_render_type.sql` — adds `render_type`, `preview_html`, `preview_image` columns to `ui_elements`.

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
- Admin tabs include Clans & Members, Users, Validation, Corrections, Logs, Approvals, Data Import, Chest Database, Forum, Design System.
- Membership table now manages game accounts (game username, clan, rank, status).
- Roles are assigned globally via `user_roles`.
- Clan Management supports assign‑to‑clan modal and batch save/cancel.
- Reusable UI primitives for filters/actions:
  - `icon-button` for icon-only actions.
  - `search-input` for labeled search fields.
  - `labeled-select` and `radix-select` for consistent dropdowns (with optional search).
  - `combobox-input` for text input with filterable suggestion dropdowns.
- Global default clan is stored in `clans.is_default`.
- Clan context selector in sidebar bottom section (native `<select>`) scopes clan data views. `ClanScopeBanner` removed; context visible in sidebar only.
- Removed `QuickActions` top-bar buttons from all pages. Deleted `app/components/quick-actions.tsx` and `app/components/clan-scope-banner.tsx`.
- Decorative gold gradient divider line below `.top-bar` on all pages (CSS pseudo-element `::after`). Hero banner margin removed for seamless layout.
- Settings language selector uses RadixSelect (same as admin area). Global `option` CSS styling ensures dark-themed native dropdown menus where `RadixSelect` is not used.
- ESLint uses Next.js flat config (`eslint.config.js`) with `@typescript-eslint` plugin; run `npm run lint` (which calls `eslint .`).

### Admin Panel Architecture (refactored Feb 2026)

The admin panel was refactored from a monolithic 6,286-line `admin-client.tsx` into a modular, code-split architecture:

```
app/admin/
  admin-client.tsx            # Slim orchestrator (~140 lines) — tab bar + dynamic imports
  admin-context.tsx           # Shared state context (supabase, clans, user, section routing)
  admin-types.ts              # Types, constants, pure utility functions
  hooks/
    use-pagination.ts         # Pagination state + derived values
    use-sortable.ts           # Sort key + direction toggle + generic comparator
    use-confirm-delete.ts     # 3-step delete flow state machine
    use-rule-list.ts          # Shared validation/correction rule management hook
  components/
    danger-confirm-modal.tsx  # Reusable 2-step delete confirmation modal
    sortable-column-header.tsx # Sortable table header button with direction indicator
    pagination-bar.tsx        # Reusable pagination controls (page size, jump, prev/next)
    rule-import-modal.tsx     # Shared CSV/TXT import preview modal
  tabs/
    clans-tab.tsx             # Clan management + membership table
    users-tab.tsx             # User management + game account CRUD
    validation-tab.tsx        # Validation rule list (uses useRuleList hook)
    corrections-tab.tsx       # Correction rule list (uses useRuleList hook)
    logs-tab.tsx              # Audit log viewer with filters + pagination
    approvals-tab.tsx         # Pending game account approval queue
    forum-tab.tsx             # Forum category management (wraps ForumCategoryAdmin)
```

**Key design principles:**

- **Code splitting**: Each tab is lazy-loaded via `next/dynamic`, so only the active tab's JS ships to the browser.
- **Deduplication**: 5 duplicated patterns (~900 lines) eliminated via shared hooks and components:
  - Delete confirmation modals → `useConfirmDelete` + `DangerConfirmModal`
  - Sort buttons → `useSortable` + `SortableColumnHeader`
  - Pagination UI → `usePagination` + `PaginationBar`
  - Rule list management → `useRuleList` (validation + correction tabs share one configurable hook)
  - Import modals → `RuleImportModal`
- **Context-based state sharing**: `AdminProvider` context exposes supabase client, clan data, section routing, and global status — no prop drilling.
- **Self-contained tabs**: Each tab owns its local state and effects, calling `useAdminContext()` for shared data.

## Handoff Summary

- `Documentation/handoff_summary.md` contains current status and next steps.

## Runbook

- `Documentation/runbook.md` includes setup, usage, and troubleshooting.

## Charts & Stats

- Charts implemented with **Recharts** (dark blue/gold themed).
- API route `/api/charts` aggregates `chest_entries` server-side (RLS-enforced).
- Chart types: Clan Score Over Time (line), Top Players (bar), Chest Type Distribution (pie), Personal Score (line).
- Summary panel with total chests, total score, avg score, top chest type, unique players.
- Filters: date range, player, source, clan context.
- Player-to-game-account linking: case-insensitive match `LOWER(chest_entries.player) = LOWER(game_accounts.game_username)`.
- Files: `app/charts/charts-client.tsx`, `app/charts/chart-components.tsx`, `app/charts/chart-types.ts`, `app/api/charts/route.ts`.

## Branding

- Project branded as **[THC] Chiller & Killer** (formerly "The Chillers").
- Sidebar title: `[THC]`, subtitle: `Chiller & Killer`.
- Logo: `/public/assets/ui/chillerkiller_logo.png` displayed prominently above sidebar title.
- All page metadata, descriptions, and placeholder text use "[THC] Chiller & Killer" branding.

## Forum System

- Full Reddit-style forum with categories, posts, comments, voting, and markdown support.
- **Forum Categories**: admin-managed via dedicated API route (`/api/admin/forum-categories`) using service role client (bypasses RLS). Categories have name, description, and sort order.
- **Forum Posts**: title, content (markdown), category, pinned status, voting (up/down), view count. Pinned posts always appear at top regardless of sort order.
- **Forum Comments**: threaded replies with voting.
- **Rich Markdown Editor**: `MarkdownToolbar` component with text formatting, image upload (paste/drag-drop to Supabase Storage), video/link insertion. Shared between Forum and Announcements.
- **ForumMarkdown**: Renders markdown with auto-embedded YouTube videos, direct images/videos, code blocks, blockquotes, tables. Supports `preview` mode for truncated list views.
- **Post Thumbnails**: Extracts first media (image/YouTube/video/link) from post content for Reddit-style thumbnail previews in post lists.
- **Pinned Posts**: `is_pinned` field on forum posts. Only content managers can pin/unpin via the create/edit form. Pinned posts always sort first.
- **Forum Admin**: Tab in admin panel for managing forum categories (create, edit, delete, reorder).
- Files: `app/forum/forum-client.tsx`, `app/forum/forum-markdown.tsx`, `app/forum/markdown-toolbar.tsx`, `app/forum/page.tsx`, `app/api/admin/forum-categories/route.ts`, `app/admin/forum-category-admin.tsx`

## Announcements & Events

- **Announcements** (formerly "News"): redesigned with visually rich cards featuring banner headers, rich markdown content, and edit tracking.
  - **Banner System**: Uses shared `BannerPicker` component (`app/components/banner-picker.tsx`) with 51 game-asset presets from `BANNER_PRESETS` (`lib/constants/banner-presets.ts`) + custom upload to Supabase Storage. Default banner shown if none selected.
  - **Rich Markdown Editor**: Uses shared `MarkdownEditor` component (`app/components/markdown-editor.tsx`) with write/preview tabs, `AppMarkdownToolbar`, image paste/drop. Supports images, videos, links, text formatting.
  - **Content Normalization**: `normalizeContent()` pre-processes plain text before markdown rendering — converts `•`/`–`/`—` bullets to markdown list items, preserves single line breaks as `<br>`, ensures proper paragraph spacing.
  - **Card Design**: Banner header with overlay gradient, gold title (1.5rem), author/date meta, pinned/status badges, expandable content preview (280px max-height) with fade gradient and centered "Weiterlesen" pill button. Full content view on click.
  - **Author Protection**: Editing a post no longer overwrites the original `created_by`. Instead, `updated_by` tracks the last editor.
  - **Edit Tracking**: "bearbeitet von {name} am {date}" displayed in card meta when a different user edits.
  - Role-based access: only admins, moderators, and editors can create/edit/delete. "Beitrag erstellen" button placed in content area, guarded by `canManage`.
  - Server-side pagination with page size selector (10/25/50), page number input, and prev/next buttons (matching data-table pattern). Uses Supabase `.range()` with `{ count: "exact" }`.
  - Filters section below article list: search (title/content via `ilike`), tag filter, date range picker. All filters reset page to 1. Type filter removed (all content is announcements).
  - Files: `app/news/news-client.tsx`
- **Events**: collapsible create/edit form, past/upcoming separation (collapsible past section), themed Flatpickr datetime pickers, loading state.
  - Date + time model with optional duration (hours + minutes) or "open-ended" (default).
  - Optional organizer field (free text or game account dropdown).
  - Recurring events: daily, weekly, biweekly, monthly with optional end date or "ongoing". Single DB row per recurring event; occurrences computed client-side.
  - Upcoming events list de-duplicates recurring events (shows only next occurrence per event).
  - Calendar view (monthly overview) with day-detail panel. Side-by-side layout on wide screens.
  - **Banner & Editor**: Uses shared `BannerPicker` (51 game-asset presets + custom upload) and `MarkdownEditor` (write/preview tabs, toolbar, image paste/drop) components. Event descriptions rendered with `AppMarkdown`.
  - Author display resolved client-side from `created_by` via profiles table.
  - Role-based access: only admins, moderators, and editors can create/edit/delete.
  - Confirmation modals: simple confirmation for event deletion, two-step confirmation for template deletion.
  - **Pinned events**: `is_pinned` boolean on `events` table. Pinned events sort first in day panel and calendar cells. Pin toggle UI in day panel (star icon, role-gated). Migration: `Documentation/migrations/event_is_pinned.sql`.
  - **Day panel** (`EventDayPanel`): collapsed card style matches "anstehend" sidebar (banner strip, date badge, structured meta). First event auto-expanded. Expanded view: full banner, markdown description, author/date. Pin/edit/delete action buttons (role-gated).
  - **Calendar cells**: show event time below title. Prefer pinned event for banner/title display.
  - **Tooltip**: `position: fixed`, rendered outside calendar body. `.event-calendar-card:hover { transform: none }` prevents containing-block offset.
  - **Upcoming sidebar**: delete button alongside edit button. Both role-gated via `canManage`.
  - Files: `app/events/events-client.tsx`, `app/events/event-calendar.tsx`, `app/events/upcoming-events-sidebar.tsx`, `app/events/events-types.ts`, `app/events/events-utils.ts`, `app/events/use-events-data.ts`
- **Event Templates**: unified DB-stored templates with same fields as events (title, description, location, duration/open-ended, organizer, recurrence).
  - No separate "name" field — title is the template name.
  - No built-in/prebuilt distinction — all templates are regular DB rows, fully editable and deletable.
  - `created_by` is nullable (templates don't require an author).
  - Save-as-template: one-click from event form or past event cards (auto-fills all fields from current values).
  - Manage templates panel with inline edit form matching event form layout.
  - Template selector dropdown in event creation form to pre-fill fields.
  - Migration: `Documentation/migrations/event_templates.sql`.
- DatePicker component extended with `enableTime` prop for datetime support.
- Page shells delegate fully to client components.

## Messaging System

- Flat message model: `messages` table with `message_type` (`private`, `broadcast`, `system`, `clan`).
- Private messages: sender_id = user, recipient_id = user.
- Global broadcasts: sender_id = admin, one row per user, message_type = `broadcast`. Sent when `clan_id: "all"`.
- Clan broadcasts: sender_id = admin, one row per clan member, message_type = `clan`. Sent when targeting a specific clan.
- System notifications: sender_id = null, recipient_id = user, message_type = `system`. Sent on game account approval/rejection. Displayed under the "Broadcast" filter in the UI (merged with broadcasts).
- UI filter tabs: All, Private, Clan, Broadcast. The "Broadcast" filter includes both `broadcast` and legacy `system` messages. The "Clan" filter shows only `clan`-type messages.
- Conversations derived by grouping messages between two users (no separate conversation table).
- Two-column UI: conversation list (420px) with search/filter, thread view with compose.
- Compose recipient and broadcast clan dropdowns use themed `RadixSelect` (no native `<select>`). Recipient dropdown includes search support.
- Messages layout uses `max-height: calc(100vh - 200px)` for proper inbox/thread scrolling with many messages.
- No real-time updates (messages load on page visit / manual refresh).
- Files: `app/messages/page.tsx`, `app/messages/messages-client.tsx`, `app/api/messages/route.ts`, `app/api/messages/[id]/route.ts`, `app/api/messages/broadcast/route.ts`.

## Notification System

- Unified bell icon in the top-right header widget (next to user avatar/menu).
- DB-stored notifications: `notifications` table with types `message`, `news`, `event`, `approval`.
- Fan-out: news/event creation triggers notifications to all clan members via `POST /api/notifications/fan-out`. Not admin-only; verifies caller is the `created_by` of the referenced record.
- Messages, broadcasts, and approval actions also generate notifications server-side.
- Dropdown panel shows recent notifications with type-specific icons, title, body preview, and relative timestamp.
- "Mark all read" button and per-notification read tracking.
- User notification preferences: `user_notification_settings` table with per-type toggles (messages, news, events, system/approvals).
- Preferences managed both in the bell dropdown (inline gear icon with toggles) and on the Settings page; GET /api/notifications filters by user preferences.
- Polls every 60s for updates (no WebSocket for MVP).
- Files: `app/components/notification-bell.tsx`, `app/api/notifications/route.ts`, `app/api/notifications/[id]/route.ts`, `app/api/notifications/mark-all-read/route.ts`, `app/api/notifications/fan-out/route.ts`, `app/api/notification-settings/route.ts`.

## API Validation & Error Handling (2026-02-11)

- **Shared Zod schemas** in `lib/api/validation.ts`:
  - `uuidSchema` — validates UUID format (used for route params like `[id]`)
  - `notificationSettingsSchema` — validates notification settings PATCH body (at least one toggle required)
  - `chartQuerySchema` — validates chart query params (clanId required, optional dateFrom/dateTo/player/source)
- **Validated API routes**: `notification-settings`, `charts`, `messages/[id]`, `notifications/[id]`.
- **Try/catch wrappers** on all API routes for consistent 500 error responses.
- **Supabase error classification** (`lib/supabase/error-utils.ts`): Classifies `PostgrestError` into `SupabaseErrorKind` (rls, auth, network, validation, unknown) and maps to i18n keys. Used in `events-client.tsx` and `use-events-data.ts`.
- **i18n error page**: `app/error.tsx` uses `next-intl` translations (keys under `errorPage`).

## Bug Fixes

- **Clan Management**: Fixed init effect re-running on every clan selection change (caused the dropdown to snap back to the default clan). Removed `selectedClanId` from init deps so it runs once on mount.
- **Clan Management**: Deleting a game account now refreshes the clan membership list.
- **Clan Management**: Switching clans clears stale membership edits and errors; added race condition guards for concurrent fetches.
- **RLS**: `clans` table was missing `enable row level security` — policies existed but had no effect. Run `alter table public.clans enable row level security;` to fix.
- **Proxy API redirect** (Feb 2026): API routes (`/api/`) were being redirected to `/home` by the proxy for unauthenticated requests, causing them to return HTML instead of JSON error responses. Fixed by exempting all `/api/` paths from the proxy auth redirect — each API route handles its own authentication.
- **Create-user variable redeclaration** (Feb 2026): `app/api/admin/create-user/route.ts` had a duplicate `const { data: userData }` declaration in the same function scope (once for auth check, once for invite). Renamed the second to `inviteData`/`inviteError`.

## Content Security Policy

- `next.config.js` defines CSP headers:
  - `frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com` — allows YouTube video embeds.
  - `media-src 'self' https: blob:` — allows media from any HTTPS source and blob URLs.

## Navigation (i18n keys)

- Main nav items: Dashboard, Ankündigungen, Forum, Truhenauswertung (formerly "Diagramme"), Event-Kalender (formerly "Ereignisse"), Verwaltung section (with sub-items, visible to all authenticated users — non-admins are redirected to `/not-authorized?reason=admin` with an admin-specific access denied message). Design System link added to the admin section.
- Sidebar: Title `[THC]`, subtitle `Chiller & Killer`, logo `/assets/ui/chillerkiller_logo.png`.
- Navbar text size: `1.0rem`, icon size: `18px`.

## Default Game Account

- Users can select a default game account in their profile settings.
- `profiles.default_game_account_id` (nullable FK to `game_accounts`).
- Sidebar clan/game account selector prioritizes: 1) DB default, 2) localStorage, 3) first available.
- Primary clan on profile: resolved via default account's active clan membership, falls back to first active membership. Membership query uses game account IDs directly (not PostgREST foreign-table filter).
- Migration: `Documentation/migrations/profile_default_game_account.sql`.

## Event Calendar: Scroll to Day

- Clicking a day in the calendar auto-scrolls the detail panel into view via `scrollIntoView({ behavior: "smooth", block: "nearest" })`.

## Website Audit (Feb 2026) — Completed

A comprehensive audit was performed covering security, architecture, SEO, accessibility, legal compliance, UI/UX, and code quality. Production audit score: **84/100 (B)**, up from 68/100. Key improvements:

- **Security**: API rate limiting, Zod validation, Cloudflare Turnstile CAPTCHA (required on forgot-password when `TURNSTILE_SECRET_KEY` is configured; bypassed otherwise for dev/staging), Sentry with PII filtering, CSP headers.
- **Architecture**: Component extraction, Tailwind CSS v4 migration, server/client splits, Supabase client dedup.
- **SEO**: `metadataBase`, canonical URLs, Open Graph, Twitter Cards, JSON-LD (WebSite + Organization), sitemap, robots.txt.
- **Legal**: Impressum page, cookie consent banner, GDPR-compliant privacy policy.
- **UI/UX**: Animated sidebar, mobile hamburger menu, skeleton loaders, focus-visible outlines, scroll-to-top, toast animations, empty states, form validation.
- **Code quality**: ~250 Playwright E2E tests + 52 Vitest unit tests, Zod validation on all API routes, stricter TS/ESLint, image optimization, i18n coverage.
- **Performance**: LCP preload hints, `priority` on above-fold images, image compression.

## Member Directory

- `/members` page: searchable table of all active clan members.
- Filters: search by game username/display name, filter by clan (defaults to selected clan context), filter by rank.
- Columns: Game Username, Display Name, Clan, Rank (with colored badge).
- Data: `game_account_clan_memberships` joined with `game_accounts` and `clans`, profiles resolved via batch query.
- Ranks displayed with color-coded badges: Leader (gold), Superior (dark gold), Officer (blue), Veteran (green), Soldier (muted).
- Added "Members" nav item in sidebar (between Messages and Administration).
- Files: `app/members/page.tsx`, `app/members/members-client.tsx`

## Author FK Constraints & PostgREST Joins

- Migration: `Documentation/migrations/author_fk_constraints.sql` — adds FK constraints to `profiles(id)` for: `articles.created_by`, `articles.updated_by`, `events.created_by`, `event_templates.created_by`, `forum_posts.author_id`, `forum_comments.author_id`.
- Enables PostgREST embedded joins, eliminating the separate `resolveAuthorNames()` pattern.
- Dashboard, events (`use-events-data.ts`), and news (`news-client.tsx`) now resolve author/editor names in a single query via `author:profiles!fk_name(display_name,username)`.

## Design System Asset Manager

- Admin-only tool at `/design-system` for managing the game asset library, UI element inventory, and asset-to-element assignments.
- **Database**: `design_assets`, `ui_elements` (with `render_type`, `preview_html`, `preview_image`), `asset_assignments` tables (admin-only RLS). Migrations: `design_system_tables.sql`, `design_system_render_type.sql`.
- **Render type system**: Each UI element classified as `css`, `asset`, `hybrid`, `icon`, `typography`, or `composite`. Only `asset`/`hybrid`/`composite` types can have game assets assigned.
- **Preview system**: Inline HTML snippets (auto-generated by scanner) for CSS-based elements, screenshot upload for composite components.
- **Scanner scripts**: `scan-design-assets.ts` (auto-categorizes ~2,359 game PNGs) and `scan-ui-elements.ts` (classifies UI patterns with render types and preview HTML).
- **Three-tab UI**: Asset Library (size picker, filters), UI Inventory (cards with live CSS previews, render_type badges/filter, conditional Assign button), Assignments (assignable elements only, paginated assets).
- **API routes**: `/api/design-system/assets`, `/api/design-system/ui-elements`, `/api/design-system/assignments`, `/api/design-system/preview-upload`.
- **i18n**: Full DE/EN translations under `designSystem` namespace. All components use `useTranslations` / `getTranslations`.
- Protected via `proxy.ts` admin path check. Nav link in sidebar admin section.
- `public/design-assets/` committed to git for production deployment. `public/design-system-previews/` gitignored (runtime uploads).

## Outstanding/Follow-up

- Admin panel refactoring is complete (Feb 2026). All 7 tabs extracted, shared hooks and components created. See "Admin Panel Architecture" section above.
- Forum could be refactored to use PostgREST joins for author names (FK constraints already added, code migration pending).

## Shared Components (Feb 2026)

- **BannerPicker** (`app/components/banner-picker.tsx`): Reusable banner image picker with live preview, scrollable preset grid, and custom upload. Props: `presets`, `value`, `onChange`, `onUpload`, `isUploading`, `fileRef`, `labelId`. Uses `useTranslations("bannerPicker")` for self-contained i18n. CSS classes: `.banner-picker-*`.
- **MarkdownEditor** (`app/components/markdown-editor.tsx`): Reusable markdown editor with write/preview tabs, formatting toolbar (`AppMarkdownToolbar`), image paste/drop support. Props: `id`, `value`, `onChange`, `supabase`, `userId`, `placeholder`, `rows`, `minHeight`. Manages own `isPreviewMode` and `isImageUploading` state. Uses `useTranslations("markdownEditor")` for self-contained i18n. CSS classes: `.forum-editor-*` (shared with forum).
- **BANNER_PRESETS** (`lib/constants/banner-presets.ts`): Shared constant with 51 game-asset banner presets and `BannerPreset` interface. `isCustomBanner()` utility exported.
- **Consumers**: `EventForm`, `ManageTemplates` (events), `NewsClient` (announcements). Both events and announcements use the same 51-preset list.
- **i18n namespaces**: `bannerPicker` and `markdownEditor` in both `messages/en.json` and `messages/de.json`.
