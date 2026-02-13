# Architecture — System Map

> **Purpose**: This is the navigation map for AI agents and developers. Use it to find where things live, how modules connect, and what patterns the codebase follows. For historical changes, see `CHANGELOG.md`. For current status, see `handoff_summary.md`.

> **Maintenance**: Update this file when you add/remove/move files, API routes, DB tables, or change codebase patterns. Keep entries factual and structural — describe _what_ and _where_, not implementation details. If you add a new feature module, add a section under §4 with its files, DB tables, and key patterns.

## 1. Project Identity

**[THC] Chiller & Killer** — A clan management platform for a Total Battle gaming community. Features: messaging, forum, events calendar, chest data analytics, announcements, member directory, admin panel with data import/validation/correction workflows. Medieval "Fortress Sanctum" dark theme with gold accents.

## 2. Tech Stack

| Layer          | Technology                                                    |
| -------------- | ------------------------------------------------------------- |
| Framework      | Next.js 15 (App Router, server + client components)           |
| Language       | TypeScript (strict: `noUncheckedIndexedAccess`)               |
| Database       | Supabase (PostgreSQL + RLS + Storage)                         |
| Auth           | Supabase Auth (email/password, PKCE)                          |
| Styling        | Global CSS (`globals.css`), CSS variables, no Tailwind in app |
| i18n           | `next-intl` with `messages/en.json` + `messages/de.json`      |
| Markdown       | `react-markdown` + `remark-gfm` + `remark-breaks`             |
| Charts         | Recharts (dark blue/gold theme)                               |
| Unit tests     | Vitest (`npm run test:unit`)                                  |
| E2E tests      | Playwright (`npx playwright test`)                            |
| Linting        | ESLint (flat config) + Prettier + Husky pre-commit            |
| Error tracking | Sentry (client + server + edge configs)                       |
| Rate limiting  | Custom in-memory sliding window (`lib/rate-limit.ts`)         |

## 3. Directory Map

```
d:\Chiller\
├── app/                    # Next.js App Router — pages, components, API routes
│   ├── api/                # Server-side API routes (see §7)
│   ├── admin/              # Admin panel (modular tabs, see §4.9)
│   ├── components/         # Shared UI components (see §5)
│   ├── hooks/              # App-level React hooks (use-auth, use-supabase)
│   ├── [feature]/          # Feature pages (page.tsx + feature-client.tsx)
│   ├── globals.css         # All CSS (Fortress Sanctum design system)
│   ├── layout.tsx          # Root layout (sidebar, providers, fonts)
│   └── error.tsx           # Global error boundary (i18n)
├── lib/                    # Shared logic — no React, importable everywhere
│   ├── api/                # API helpers: requireAuth, requireAdmin, Zod schemas
│   ├── constants/          # Shared constants (banner-presets)
│   ├── hooks/              # Shared React hooks (pagination, sortable, roles)
│   ├── markdown/           # Unified markdown system (renderer, toolbar, sanitizer)
│   ├── supabase/           # Supabase clients (browser, server, service-role)
│   ├── types/              # Shared TypeScript types (domain.ts)
│   ├── permissions.ts      # Role → permission map (single source of truth)
│   ├── rate-limit.ts       # Rate limiter factory (isolated stores per instance)
│   ├── date-format.ts      # Date formatting helpers
│   ├── correction-applicator.ts  # Correction rule engine
│   └── constants.ts        # Global constants (DATE_REGEX, etc.)
├── messages/               # i18n translation files (en.json, de.json)
├── tests/                  # Playwright E2E specs + auth helpers
├── scripts/                # Utility scripts (asset scanner, UI scanner)
├── Documentation/          # This folder — architecture, changelog, plans, migrations
│   ├── migrations/         # SQL migration files (run order in runbook.md)
│   └── plans/              # Design documents for major features
├── public/assets/          # Static assets (game icons, banners, backgrounds, VIP)
├── proxy.ts                # Middleware: auth redirect, admin gating, PKCE catch
├── next.config.js          # Next.js config (CSP, image domains, redirects)
└── vitest.config.ts        # Unit test config
```

## 4. Feature Modules

Each feature follows the pattern: `app/[feature]/page.tsx` (thin server component) → `app/[feature]/[feature]-client.tsx` (client component with all logic).

### 4.1 Auth (`app/auth/`)

Login, register, forgot password, password update. Supabase Auth with PKCE flow. First-login detection redirects users without game accounts to `/profile`. `proxy.ts` middleware handles auth gating for page routes; API routes handle their own auth via `requireAuth()`.

| File                                  | Purpose                                      |
| ------------------------------------- | -------------------------------------------- |
| `app/auth/login/page.tsx`             | Login page with first-login redirect         |
| `app/auth/register/page.tsx`          | Registration with 4-step onboarding guide    |
| `app/auth/forgot/page.tsx`            | Forgot password (optional Turnstile CAPTCHA) |
| `app/auth/update/page.tsx`            | Password reset completion                    |
| `app/auth/callback/route.ts`          | PKCE code exchange                           |
| `lib/supabase/browser-client.ts`      | Client-side Supabase instance                |
| `lib/supabase/server-client.ts`       | Server-side Supabase (cookies)               |
| `lib/supabase/service-role-client.ts` | Service role client (bypasses RLS)           |

**DB tables**: `profiles`, `user_roles`, `game_accounts`

### 4.2 Messaging (`app/messages/`)

Email-style messaging with Gmail threading. One `messages` row per sent message + N `message_recipients` rows. Broadcasts create one message + N recipients (sender sees one sent entry). Soft delete per-recipient. Inbox groups by `thread_id`.

| File                                          | Purpose                                                            |
| --------------------------------------------- | ------------------------------------------------------------------ |
| `app/messages/messages-client.tsx`            | Full messaging UI (inbox, sent, compose, thread, reply)            |
| `app/api/messages/route.ts`                   | `GET` inbox (threaded), `POST` send (private/broadcast/clan/reply) |
| `app/api/messages/sent/route.ts`              | `GET` sent messages with recipient lists                           |
| `app/api/messages/thread/[threadId]/route.ts` | `GET` full thread + auto mark-read                                 |
| `app/api/messages/[id]/route.ts`              | `PATCH` mark read, `DELETE` soft-delete                            |
| `app/api/messages/search-recipients/route.ts` | `GET` recipient search (profiles + game accounts)                  |

**DB tables**: `messages`, `message_recipients`, `profiles`
**Key patterns**: Nil UUID `00000000-...` as placeholder for broadcast `recipient_ids`; `thread_id`/`parent_id` for threading; `deleted_at` for soft delete; `MarkdownEditor` with `storageBucket="message-images"`.

### 4.3 Forum (`app/forum/`)

Reddit-style forum with categories, posts, threaded comments, voting, markdown with rich media embeds, pinned posts, post thumbnails.

| File                                      | Purpose                                     |
| ----------------------------------------- | ------------------------------------------- |
| `app/forum/forum-client.tsx`              | Forum UI (post list, post detail, comments) |
| `app/forum/forum-post-detail.tsx`         | Single post view with comments              |
| `app/forum/forum-post-list.tsx`           | Post list with thumbnails                   |
| `app/forum/forum-types.ts`                | Forum TypeScript types                      |
| `app/api/admin/forum-categories/route.ts` | Category CRUD (admin, service role)         |

**DB tables**: `forum_categories`, `forum_posts`, `forum_comments`, `forum_votes`, `forum_comment_votes`

### 4.4 Events (`app/events/`)

Calendar with day panel, upcoming sidebar, recurring events (single DB row, client-side expansion), multi-day events, banners, pinned events. Templates share the same data model.

| File                                     | Purpose                                  |
| ---------------------------------------- | ---------------------------------------- |
| `app/events/events-client.tsx`           | Main events page (form, list, templates) |
| `app/events/event-calendar.tsx`          | Monthly calendar grid                    |
| `app/events/upcoming-events-sidebar.tsx` | Upcoming events list with pagination     |
| `app/events/event-form.tsx`              | Create/edit event form                   |
| `app/events/events-utils.ts`             | Date range, recurrence, time helpers     |
| `app/events/use-events-data.ts`          | Data fetching hook                       |

**DB tables**: `events`, `event_templates`

### 4.5 Announcements / News (`app/news/`)

Rich cards with banner headers, markdown content, server-side pagination, edit tracking (`updated_by`), author protection.

| File                       | Purpose                                    |
| -------------------------- | ------------------------------------------ |
| `app/news/news-client.tsx` | Announcements UI (cards, compose, filters) |

**DB tables**: `articles`

### 4.6 Charts & Stats (`app/charts/`)

Recharts-powered analytics: clan score over time, top players, chest distribution, personal score. Server-side aggregation from `chest_entries`.

| File                              | Purpose                     |
| --------------------------------- | --------------------------- |
| `app/charts/charts-client.tsx`    | Charts UI with filters      |
| `app/charts/chart-components.tsx` | Recharts wrapper components |
| `app/api/charts/route.ts`         | `GET` aggregated chest data |

**DB tables**: `chest_entries`, `game_accounts`

### 4.7 CMS (`app/components/editable-*`)

Inline-editable content for public pages (home, about, contact, privacy). Two tables: `site_content` (text) + `site_list_items` (structured lists). `useSiteContent(page)` hook loads both.

| File                                 | Purpose                                         |
| ------------------------------------ | ----------------------------------------------- |
| `app/components/editable-text.tsx`   | Inline text editor (markdown/plain/single-line) |
| `app/components/editable-list.tsx`   | Drag-and-drop list editor with icons/badges     |
| `app/components/use-site-content.ts` | CMS data hook (load, save, delete)              |
| `app/api/site-content/route.ts`      | `GET` public, `PATCH` admin upsert/delete       |
| `app/api/site-list-items/route.ts`   | `GET` public, `PATCH` admin CRUD/reorder        |

**DB tables**: `site_content`, `site_list_items`

### 4.8 Notifications (`app/components/notification-bell.tsx`)

Bell icon in header with dropdown. DB-stored, polls every 60s. Fan-out on news/event creation. Per-type user preferences.

| File                                           | Purpose                                       |
| ---------------------------------------------- | --------------------------------------------- |
| `app/components/notification-bell.tsx`         | Bell UI, dropdown, preferences                |
| `app/api/notifications/route.ts`               | `GET` notifications (filtered by preferences) |
| `app/api/notifications/fan-out/route.ts`       | `POST` fan-out to clan members                |
| `app/api/notifications/mark-all-read/route.ts` | `POST` mark all read                          |
| `app/api/notification-settings/route.ts`       | `GET`/`PATCH` user preferences                |

**DB tables**: `notifications`, `user_notification_settings`

### 4.9 Admin Panel (`app/admin/`)

Modular tab-based admin. Slim orchestrator (`admin-client.tsx`, ~140 lines) with `AdminProvider` context. Each tab lazy-loaded via `next/dynamic`.

| File                                 | Purpose                                       |
| ------------------------------------ | --------------------------------------------- |
| `app/admin/admin-client.tsx`         | Tab orchestrator + dynamic imports            |
| `app/admin/admin-context.tsx`        | Shared state (supabase, clans, user, routing) |
| `app/admin/admin-types.ts`           | Types, constants, rank/role formatters        |
| `app/admin/tabs/clans-tab.tsx`       | Clan management + game account memberships    |
| `app/admin/tabs/users-tab.tsx`       | User CRUD, game account management            |
| `app/admin/tabs/validation-tab.tsx`  | Validation rules (global)                     |
| `app/admin/tabs/corrections-tab.tsx` | Correction rules (global)                     |
| `app/admin/tabs/logs-tab.tsx`        | Audit log viewer                              |
| `app/admin/tabs/approvals-tab.tsx`   | Game account approval queue                   |
| `app/admin/tabs/forum-tab.tsx`       | Forum category management                     |

**DB tables**: `profiles`, `user_roles`, `game_accounts`, `game_account_clan_memberships`, `clans`, `validation_rules`, `correction_rules`, `audit_logs`

### 4.10 Data Import & Chest Database

| File                                      | Purpose                                          |
| ----------------------------------------- | ------------------------------------------------ |
| `app/data-import/data-import-client.tsx`  | CSV import with preview, corrections, validation |
| `app/data-table/data-table-client.tsx`    | Chest database viewer/editor                     |
| `app/api/data-import/commit/route.ts`     | `POST` commit import data                        |
| `lib/correction-applicator.ts`            | Correction rule engine                           |
| `app/components/validation-evaluator.tsx` | Validation rule evaluator                        |

**DB tables**: `chest_entries`, `validation_rules`, `correction_rules`, `clans`

### 4.11 Members (`app/members/`)

Clan member directory. Game accounts sorted by rank, with expandable detail rows.

| File                             | Purpose                                        |
| -------------------------------- | ---------------------------------------------- |
| `app/members/members-client.tsx` | Member table with rank badges, expandable rows |

**DB tables**: `game_account_clan_memberships`, `game_accounts`, `profiles`, `chest_entries`

### 4.12 Design System (`app/design-system/`)

Admin tool for managing game assets, UI element inventory, and asset assignments.

| File                                         | Purpose                                       |
| -------------------------------------------- | --------------------------------------------- |
| `app/design-system/design-system-client.tsx` | Three-tab UI (assets, inventory, assignments) |
| `scripts/scan-design-assets.ts`              | Scan + categorize game PNGs                   |
| `scripts/scan-ui-elements.ts`                | Scan CSS/components for UI patterns           |

**DB tables**: `design_assets`, `ui_elements`, `asset_assignments`

## 5. Shared Components (`app/components/`)

| Component              | File                            | Purpose                                                           |
| ---------------------- | ------------------------------- | ----------------------------------------------------------------- |
| MarkdownEditor         | `markdown-editor.tsx`           | Write/preview tabs, toolbar, image upload. Props: `storageBucket` |
| BannerPicker           | `banner-picker.tsx`             | 51 game-asset presets + custom upload                             |
| ConfirmModal           | `confirm-modal.tsx`             | Danger/warning/info variants, optional phrase confirmation        |
| FormModal              | `form-modal.tsx`                | Shared modal wrapper (backdrop, form, status)                     |
| AddCorrectionRuleModal | `add-correction-rule-modal.tsx` | Shared correction rule creation modal                             |
| AddValidationRuleModal | `add-validation-rule-modal.tsx` | Shared validation rule creation modal                             |
| DataState              | `data-state.tsx`                | Loading/empty/error state wrapper                                 |
| PaginationBar          | `pagination-bar.tsx`            | Page controls (compact mode available)                            |
| SortableColumnHeader   | `sortable-column-header.tsx`    | Clickable sort header with direction arrow                        |
| NotificationBell       | `notification-bell.tsx`         | Header bell icon + dropdown panel                                 |
| DatePicker             | `date-picker.tsx`               | Flatpickr wrapper (date or datetime)                              |
| SearchInput            | `ui/search-input.tsx`           | Labeled search field                                              |
| RadixSelect            | `ui/radix-select.tsx`           | Styled dropdown select                                            |
| ComboboxInput          | `ui/combobox-input.tsx`         | Text input with suggestion dropdown                               |
| IconButton             | `ui/icon-button.tsx`            | Icon-only action button                                           |

## 6. Shared Libraries (`lib/`)

| Module             | File                                | Purpose                                                                                                                                                  |
| ------------------ | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth helpers       | `api/require-auth.ts`               | Validates session, returns `{ userId, supabase }` or error                                                                                               |
| Admin helpers      | `api/require-admin.ts`              | Validates admin role (wraps requireAuth)                                                                                                                 |
| Zod schemas        | `api/validation.ts`                 | `uuidSchema`, `notificationSettingsSchema`, `chartQuerySchema`, `dateStringSchema`                                                                       |
| Permissions        | `permissions.ts`                    | Role→permission map. `hasPermission()`, `canDo()`, `isAdmin()`                                                                                           |
| Rate limiter       | `rate-limit.ts`                     | `createRateLimiter()` factory. Pre-built: `strictLimiter` (10/min), `standardLimiter` (30/min), `relaxedLimiter` (60/min). Isolated stores per instance. |
| Domain types       | `types/domain.ts`                   | Shared interfaces: `InboxThread`, `SentMessage`, `ThreadMessage`, `ProfileSummary`, etc.                                                                 |
| Markdown           | `markdown/app-markdown.tsx`         | Unified renderer (`variant="cms"` or `"forum"`)                                                                                                          |
| Markdown toolbar   | `markdown/app-markdown-toolbar.tsx` | Formatting buttons, image upload                                                                                                                         |
| Markdown sanitizer | `markdown/sanitize-markdown.ts`     | Normalizes content before rendering                                                                                                                      |
| Date formatting    | `date-format.ts`                    | `formatLocalDateTime()`                                                                                                                                  |
| Dashboard utils    | `dashboard-utils.ts`                | `toDateString()`, `extractAuthorName()`, `calculateTrend()`, `formatCompactNumber()`                                                                     |
| Corrections        | `correction-applicator.ts`          | Applies correction rules to chest data                                                                                                                   |
| Dashboard utils    | `dashboard-utils.ts`                | Score/trend/highlight helpers                                                                                                                            |
| Error utils        | `supabase/error-utils.ts`           | Classifies Supabase errors → i18n keys                                                                                                                   |
| User role hook     | `hooks/use-user-role.ts`            | React hook: fetches role, exposes permission helpers                                                                                                     |
| Pagination hook    | `hooks/use-pagination.ts`           | Page state, page count, slice helpers                                                                                                                    |
| Sortable hook      | `hooks/use-sortable.ts`             | Sort key + direction + generic comparator                                                                                                                |
| Rule processing    | `hooks/use-rule-processing.ts`      | Evaluator/applicator/suggestion computation                                                                                                              |

## 7. API Route Index

| Route                               | Methods                  | Auth         | Rate Limit | Purpose                         |
| ----------------------------------- | ------------------------ | ------------ | ---------- | ------------------------------- |
| `/api/messages`                     | GET, POST                | user         | standard   | Inbox (threaded) / Send message |
| `/api/messages/[id]`                | PATCH, DELETE            | user         | standard   | Mark read / Soft-delete         |
| `/api/messages/sent`                | GET                      | user         | standard   | Sent messages                   |
| `/api/messages/thread/[threadId]`   | GET                      | user         | standard   | Full thread + auto mark-read    |
| `/api/messages/search-recipients`   | GET                      | user         | standard   | Recipient search                |
| `/api/notifications`                | GET                      | user         | relaxed    | User notifications              |
| `/api/notifications/[id]`           | PATCH                    | user         | standard   | Mark notification read          |
| `/api/notifications/mark-all-read`  | POST                     | user         | standard   | Mark all read                   |
| `/api/notifications/fan-out`        | POST                     | user         | strict     | Fan-out to clan members         |
| `/api/notification-settings`        | GET, PATCH               | user         | standard   | Notification preferences        |
| `/api/charts`                       | GET                      | user         | relaxed    | Aggregated chest data           |
| `/api/game-accounts`                | GET, POST, PATCH         | user         | standard   | Game account CRUD               |
| `/api/site-content`                 | GET, PATCH               | public/admin | standard   | CMS text content                |
| `/api/site-list-items`              | GET, PATCH               | public/admin | standard   | CMS list items                  |
| `/api/auth/forgot-password`         | POST                     | public       | standard   | Password reset email            |
| `/api/data-import/commit`           | POST                     | admin        | strict     | Commit imported data            |
| `/api/admin/create-user`            | POST                     | admin        | strict     | Invite new user                 |
| `/api/admin/delete-user`            | POST                     | admin        | strict     | Delete user                     |
| `/api/admin/user-lookup`            | POST                     | admin        | strict     | Lookup user by email            |
| `/api/admin/game-account-approvals` | GET, PATCH               | admin        | strict     | Approval queue                  |
| `/api/admin/forum-categories`       | GET, POST, PATCH, DELETE | admin        | strict     | Forum category CRUD             |
| `/api/design-system/assets`         | GET, PATCH               | admin        | standard   | Design asset library            |
| `/api/design-system/ui-elements`    | GET, POST, PATCH, DELETE | admin        | standard   | UI element inventory            |
| `/api/design-system/assignments`    | GET, POST, DELETE        | admin        | standard   | Asset assignments               |
| `/api/design-system/preview-upload` | POST                     | admin        | standard   | Screenshot upload               |

## 8. Database Table Index

| Table                           | Purpose                                                                  |
| ------------------------------- | ------------------------------------------------------------------------ |
| `profiles`                      | User profiles (username, display_name, email, default_game_account_id)   |
| `user_roles`                    | One global role per user (owner/admin/moderator/editor/member/guest)     |
| `game_accounts`                 | Per-user game accounts with approval_status                              |
| `game_account_clan_memberships` | Links game accounts to clans (rank, is_active)                           |
| `clans`                         | Clan metadata (name, is_default, is_unassigned)                          |
| `chest_entries`                 | Imported chest data (date, player, source, chest, score, clan_id)        |
| `validation_rules`              | Global validation rules for chest data                                   |
| `correction_rules`              | Global correction rules for chest data                                   |
| `audit_logs`                    | Action audit trail (entity, action, actor, details)                      |
| `messages`                      | One row per authored message (sender, subject, content, type, threading) |
| `message_recipients`            | One row per recipient (is_read, deleted_at for soft delete)              |
| `notifications`                 | Notification feed (type, title, body, reference_id, is_read)             |
| `user_notification_settings`    | Per-user per-type notification toggles                                   |
| `articles`                      | Announcements (title, content, banner_url, created_by, updated_by)       |
| `events`                        | Events (date, time, duration, recurrence, banner_url, is_pinned)         |
| `event_templates`               | Reusable event templates (same fields as events)                         |
| `forum_categories`              | Forum categories (name, slug, sort_order)                                |
| `forum_posts`                   | Forum posts (title, content, category, is_pinned, vote/view counts)      |
| `forum_comments`                | Threaded comments on posts (parent_id for nesting)                       |
| `forum_votes`                   | Post upvotes/downvotes                                                   |
| `forum_comment_votes`           | Comment upvotes/downvotes                                                |
| `site_content`                  | CMS text content (page, section_key, bilingual)                          |
| `site_list_items`               | CMS structured list items (page, section_key, sort_order)                |
| `design_assets`                 | Game asset catalog (~2,359 PNGs)                                         |
| `ui_elements`                   | UI element inventory (render_type, preview)                              |
| `asset_assignments`             | Maps game assets to UI elements                                          |

## 9. Conventions & Patterns

### API Routes

- Every route uses `try/catch` returning `{ error: "..." }` on failure.
- Every route calls a rate limiter as the first line: `const blocked = limiter.check(request); if (blocked) return blocked;`
- Auth: `requireAuth()` for user routes, `requireAdmin()` for admin routes. Service role client for DB operations that bypass RLS.
- Input validation: Zod schemas for request bodies and route params.

### Client Components

- Page pattern: `page.tsx` (server) → `feature-client.tsx` ("use client" with all logic).
- Data fetching: `useCallback` + `useEffect` with `try/finally` for loading states.
- Profile maps merged via `useMemo` to avoid recomputation on every render.
- All user-facing strings use `useTranslations("namespace")` from `next-intl`.

### Permissions

- Roles: owner > admin > moderator > editor > member > guest.
- Single source of truth: `lib/permissions.ts` (TypeScript) + `has_permission()` SQL function (mirrors it for RLS).
- Client-side: `useUserRole()` hook from `lib/hooks/use-user-role.ts`.

### Markdown

- All rendering goes through `AppMarkdown` with `variant` prop ("cms" or "forum").
- All content sanitized via `sanitizeMarkdown()` before rendering.
- Editing uses `MarkdownEditor` component (write/preview tabs, toolbar, image upload).
- Storage buckets: `forum-images` (default), `message-images` (messaging).

### Messaging

- Broadcasts send a nil UUID (`00000000-0000-0000-0000-000000000000`) as `recipient_ids` placeholder; server resolves actual recipients.
- Threading: `thread_id` = root message ID, `parent_id` = direct parent. All replies share `thread_id`.
- No reply on broadcast/clan messages (one-way notifications).
- Soft delete: `deleted_at` on `message_recipients` (message stays for sender/others).

### i18n

- Two locale files: `messages/en.json` + `messages/de.json`.
- Namespaced: `"messagesPage"`, `"forum"`, `"events"`, `"admin"`, `"common"`, etc.
- Components use `useTranslations("namespace")` (client) or `getTranslations("namespace")` (server).

### Testing

- Unit: Vitest, files colocated as `*.test.ts` in `lib/`. Run: `npm run test:unit`.
- E2E: Playwright, files in `tests/`. Pre-authenticated via `storageState`. Run: `npx playwright test`.
- 6 test roles: owner, admin, moderator, editor, member, guest.

### Styling

- All CSS in `app/globals.css` using CSS custom properties (`--color-gold`, `--color-surface`, etc.).
- No Tailwind utility classes in app code; CSS classes follow BEM-like naming (`.messages-email-card`, `.forum-post-item`).
- Sidebar: 280px expanded, 60px collapsed (CSS variable `--sidebar-width`).

## 10. Environment

```env
NEXT_PUBLIC_SUPABASE_URL=...        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # Supabase anon key (client-safe)
SUPABASE_SERVICE_ROLE_KEY=...       # Service role key (server-only)
TURNSTILE_SECRET_KEY=...            # Optional: Cloudflare CAPTCHA for forgot-password
SENTRY_DSN=...                      # Optional: Sentry error tracking
```

## 11. SQL Migrations

All migrations are in `Documentation/migrations/`. Run order documented in `Documentation/runbook.md` section 1. Key migrations:

| File                            | Purpose                                                 |
| ------------------------------- | ------------------------------------------------------- |
| `messages_v2.sql`               | Messages + recipients tables, threading, data migration |
| `notifications.sql`             | Notifications + user settings tables                    |
| `forum_tables.sql`              | Forum categories, posts, comments, votes                |
| `forum_rls_permissions.sql`     | Forum RLS using `has_permission()`                      |
| `game_account_approval.sql`     | Approval workflow for game accounts                     |
| `roles_permissions_cleanup.sql` | Drop legacy role tables, new permission functions       |
| `event_templates.sql`           | Event templates table                                   |
| `event_recurrence.sql`          | Recurrence fields on events                             |
| `design_system_tables.sql`      | Design asset management tables                          |
| `author_fk_constraints.sql`     | FK constraints enabling PostgREST joins                 |
