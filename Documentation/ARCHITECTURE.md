# Architecture — System Map

> **Purpose**: This is the navigation map for AI agents and developers. Use it to find where things live, how modules connect, and what patterns the codebase follows. For historical changes, see `CHANGELOG.md`. For current status, see `handoff_summary.md`.

> **Maintenance**: Update this file when you add/remove/move files, API routes, DB tables, or change codebase patterns. Keep entries factual and structural — describe _what_ and _where_, not implementation details. If you add a new feature module, add a section under §4 with its files, DB tables, and key patterns.

## 1. Project Identity

**[THC] Chiller & Killer** — A clan management platform for a Total Battle gaming community. Features: messaging, forum, events calendar, announcements, member directory, admin panel. Medieval "Fortress Sanctum" dark theme with gold accents. Analytics, data import, validation, corrections, and chest database features have been removed.

## 2. Tech Stack

| Layer          | Technology                                                    |
| -------------- | ------------------------------------------------------------- |
| Framework      | Next.js 16 (App Router, server + client components)           |
| Language       | TypeScript (strict: `noUncheckedIndexedAccess`)               |
| Database       | Supabase (PostgreSQL + RLS + Storage)                         |
| Auth           | Supabase Auth (email/password, PKCE)                          |
| Styling        | Global CSS (`globals.css`), CSS variables, no Tailwind in app |
| i18n           | `next-intl` with `messages/en.json` + `messages/de.json`      |
| Markdown       | `react-markdown` + `remark-gfm` + `remark-breaks`             |
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
│   ├── hooks/              # App-level React hooks (use-auth, use-supabase, use-clan-context, use-modal-reset, use-dashboard-data)
│   ├── [feature]/          # Feature pages (page.tsx + feature-client.tsx + loading.tsx + error.tsx)
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
│   ├── string-utils.ts     # Shared string normalization helpers
│   └── constants.ts        # Global constants (DATE_REGEX, bucket names, bug screenshot limits, etc.)
├── messages/               # i18n translation files (en.json, de.json)
├── tests/                  # Playwright E2E specs + auth helpers
├── scripts/                # Utility scripts (asset scanner, UI scanner)
├── Documentation/          # This folder — architecture, changelog, runbook, migrations
│   └── migrations/         # SQL migration files (run order in runbook.md)
├── public/assets/          # Static assets (game icons, banners, backgrounds, VIP)
├── proxy.ts                # Middleware: auth redirect, admin gating, PKCE catch
├── next.config.js          # Next.js config (CSP, image domains, redirects)
└── vitest.config.ts        # Unit test config
```

## 4. Feature Modules

Each feature follows the pattern: `app/[feature]/page.tsx` (thin server component) → `app/[feature]/[feature]-client.tsx` (client component with all logic).

### 4.1 Auth (`app/auth/`)

Login, register, forgot password, password update. Supabase Auth with PKCE flow. First-login detection redirects users without game accounts to `/profile`. `proxy.ts` middleware handles auth gating for page routes (API routes are excluded from the matcher and handle their own auth via `requireAuth()`).

| File                                  | Purpose                                      |
| ------------------------------------- | -------------------------------------------- |
| `app/auth/login/page.tsx`             | Login page with first-login redirect         |
| `app/auth/register/page.tsx`          | Registration with 4-step onboarding guide    |
| `app/auth/forgot/page.tsx`            | Forgot password (optional Turnstile CAPTCHA) |
| `app/auth/update/page.tsx`            | Password reset completion                    |
| `app/auth/callback/route.ts`          | PKCE code exchange                           |
| `lib/supabase/browser-client.ts`      | Client-side Supabase singleton               |
| `lib/supabase/server-client.ts`       | Server-side Supabase (cookies, React.cache)  |
| `lib/supabase/service-role-client.ts` | Service role singleton (bypasses RLS)        |

**DB tables**: `profiles`, `user_roles`, `game_accounts`

### 4.2 Messaging (`app/messages/`)

Email-style messaging with Gmail threading. One `messages` row per sent message + N `message_recipients` rows. Broadcasts create one message + N recipients (sender sees one sent entry). Soft delete per-recipient. Inbox groups by `thread_id`. Archive support (hide from inbox/sent, view in archive tab, reversible). Multi-select batch delete/archive with checkboxes.

| File                                          | Purpose                                                         |
| --------------------------------------------- | --------------------------------------------------------------- |
| `app/messages/messages-client.tsx`            | Orchestrator (compose, inbox, thread)                           |
| `app/messages/messages-inbox.tsx`             | Inbox/sent/archive list with multi-select, delete, archive      |
| `app/messages/messages-thread.tsx`            | Thread detail / sent message detail (works in all view modes)   |
| `app/messages/messages-compose.tsx`           | Compose form (direct/clan/global)                               |
| `app/messages/use-messages.ts`                | State hook (data, CRUD, delete, archive, multi-select)          |
| `app/messages/messages-types.ts`              | Local types (ViewMode: inbox/sent/archive, ProfileMap, etc.)    |
| `app/api/messages/route.ts`                   | `GET` inbox (threaded, filters archived), `POST` send           |
| `app/api/messages/sent/route.ts`              | `GET` sent messages (filters archived/deleted)                  |
| `app/api/messages/sent/[id]/route.ts`         | `DELETE` sender soft-delete (`sender_deleted_at`)               |
| `app/api/messages/thread/[threadId]/route.ts` | `GET` full thread + auto mark-read, `DELETE` thread soft-delete |
| `app/api/messages/[id]/route.ts`              | `PATCH` mark read, `DELETE` per-message soft-delete             |
| `app/api/messages/archive/route.ts`           | `GET` archived items (combined), `POST` archive/unarchive batch |
| `app/api/messages/search-recipients/route.ts` | `GET` recipient search (profiles + game accounts)               |

**DB tables**: `messages`, `message_recipients`, `profiles`
**Key patterns**: Nil UUID `00000000-...` as placeholder for broadcast `recipient_ids`; `thread_id`/`parent_id` for threading; `deleted_at` for per-recipient soft delete; `archived_at` on `message_recipients` for inbox archive; `sender_deleted_at`/`sender_archived_at` on `messages` for sender-side operations; `MarkdownEditor` with `storageBucket="message-images"`.

### 4.3 Forum (`app/forum/`)

Reddit-style forum with categories, posts, threaded comments, voting, markdown with rich media embeds, pinned posts, post thumbnails. Deep-link support: `/forum?post=<id>` opens a post directly (used by dashboard and thread-linking buttons).

| File                                      | Purpose                                            |
| ----------------------------------------- | -------------------------------------------------- |
| `app/forum/forum-client.tsx`              | Forum UI (post list, post detail, comments)        |
| `app/forum/use-forum.ts`                  | Forum state hook (data, CRUD, deep-link, URL sync) |
| `app/forum/forum-post-detail.tsx`         | Single post view with comments                     |
| `app/forum/forum-post-list.tsx`           | Post list with thumbnails                          |
| `app/forum/forum-types.ts`                | Forum TypeScript types                             |
| `app/api/admin/forum-categories/route.ts` | Category CRUD (admin, service role)                |

**DB tables**: `forum_categories`, `forum_posts`, `forum_comments`, `forum_votes`, `forum_comment_votes`

### 4.4 Events (`app/events/`)

Calendar with day panel, upcoming sidebar, recurring events (single DB row, client-side expansion), multi-day events, banners, pinned events. Templates share the same data model. Deep-link support: `/events?date=YYYY-MM-DD&event=<id>` navigates the calendar to the date and highlights the specific event.

| File                                     | Purpose                                       |
| ---------------------------------------- | --------------------------------------------- |
| `app/events/events-client.tsx`           | Main events page (form, list, templates)      |
| `app/events/use-events.ts`               | Events state hook (calendar, selection, form) |
| `app/events/event-calendar.tsx`          | Monthly calendar grid + `EventDayPanel`       |
| `app/events/events-list.tsx`             | Orchestrates calendar + day panel display     |
| `app/events/day-panel-event-card.tsx`    | Individual event card in day panel            |
| `app/events/upcoming-events-sidebar.tsx` | Upcoming events list with pagination          |
| `app/events/event-form.tsx`              | Create/edit event form                        |
| `app/events/events-utils.ts`             | Date range, recurrence, time helpers          |
| `app/events/use-events-data.ts`          | Data fetching hook                            |

**DB tables**: `events`, `event_templates`

### 4.5 Announcements / News (`app/news/`)

Rich cards with banner headers, markdown content, server-side pagination, edit tracking (`updated_by`), author protection. Deep-link support: `/news?article=<id>` auto-expands and scrolls to the target article.

| File                       | Purpose                                    |
| -------------------------- | ------------------------------------------ |
| `app/news/news-client.tsx` | Announcements UI (cards, compose, filters) |
| `app/news/use-news.ts`     | News state hook (data, CRUD, deep-link)    |
| `app/news/news-form.tsx`   | Article create/edit form                   |

**DB tables**: `articles`

### 4.6 Analytics (`app/analytics/`)

Placeholder page. Recharts and chest-based analytics have been removed.

| File                                      | Purpose                      |
| ----------------------------------------- | ---------------------------- |
| `app/analytics/page.tsx`                  | Thin server component        |
| `app/analytics/analytics-placeholder.tsx` | "Coming soon" placeholder UI |

**DB tables**: none

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

| File                               | Purpose                                                                                                                             |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `app/admin/admin-client.tsx`       | Tab orchestrator + dynamic imports                                                                                                  |
| `app/admin/admin-context.tsx`      | Shared state (supabase, clans, user, routing)                                                                                       |
| `app/admin/admin-types.ts`         | Types, constants, rank/role formatters (`LOCALIZED_ROLE_LABELS`, `formatRole`, `formatRank`)                                        |
| `app/admin/tabs/clans-tab.tsx`     | Clan management + game account memberships                                                                                          |
| `app/admin/tabs/users-tab.tsx`     | User CRUD, game account management, inline membership editing (clan/rank/status/shadow), email confirmation status + manual confirm |
| `app/admin/tabs/logs-tab.tsx`      | Audit log viewer                                                                                                                    |
| `app/admin/tabs/approvals-tab.tsx` | Split layout: user registration confirmations (left) + game account approval queue (right)                                          |
| `app/admin/tabs/forum-tab.tsx`     | Forum category management                                                                                                           |
| `app/design-system/`               | Design system (assets, inventory, assignments) — linked from admin                                                                  |

**DB tables**: `profiles`, `user_roles`, `game_accounts`, `game_account_clan_memberships`, `clans`, `audit_logs`

**Removed admin sections**: dataImport, validation, corrections, chestDb. Removed: `admin-sub-page-layout.tsx`, `admin-section-tabs.tsx`, `use-rule-list.ts`, `rule-import-modal.tsx`.

### 4.10 Data Import & Chest Database — _removed_

Data import (`app/data-import/`, `app/admin/data-import/`, `app/api/data-import/`), chest database (`app/data-table/`, `app/admin/data-table/`), validation (`app/admin/tabs/validation-tab.tsx`, `lib/validation-evaluator.ts`), and corrections (`app/admin/tabs/corrections-tab.tsx`, `lib/correction-applicator.ts`) have been removed. Tables `chest_entries`, `validation_rules`, `correction_rules`, `scoring_rules` dropped via `Documentation/migrations/drop_chest_data_tables.sql`.

### 4.11 Members (`app/members/`)

Clan member directory. Game accounts sorted by rank, with expandable detail rows. Webmaster/Administrator with no in-game rank show their role name as a rank substitute.

| File                             | Purpose                                                          |
| -------------------------------- | ---------------------------------------------------------------- |
| `app/members/members-client.tsx` | Member table with rank badges, expandable rows                   |
| `app/members/members-utils.ts`   | Pure helpers: colours, sort comparator, role-substitute counting |

**DB tables**: `game_account_clan_memberships`, `game_accounts`, `profiles`

### 4.12 Dashboard (`app/`)

Main landing page after login. Shows announcements, upcoming events, and "coming soon" placeholders for quick stats and week highlights. Items are clickable deep-links: announcements link to `/news?article=<id>`, events link to `/events?date=<YYYY-MM-DD>&event=<id>`. Items with a linked forum thread show a chat icon button linking to `/forum?post=<forum_post_id>`.

| File                              | Purpose                                            |
| --------------------------------- | -------------------------------------------------- |
| `app/dashboard-client.tsx`        | Dashboard UI (announcements, events, placeholders) |
| `app/hooks/use-dashboard-data.ts` | Data fetching hook (articles, events)              |
| `lib/dashboard-utils.ts`          | `toDateString()`, trends, formatting helpers       |

**DB tables**: `articles`, `events`, `game_account_clan_memberships`

### 4.13 Design System (`app/design-system/`)

Admin tool for managing game assets, UI element inventory, and asset assignments.

| File                                         | Purpose                                       |
| -------------------------------------------- | --------------------------------------------- |
| `app/design-system/design-system-client.tsx` | Three-tab UI (assets, inventory, assignments) |
| `scripts/scan-design-assets.ts`              | Scan + categorize game PNGs                   |
| `scripts/scan-ui-elements.ts`                | Scan CSS/components for UI patterns           |

**DB tables**: `design_assets`, `ui_elements`, `asset_assignments`

### 4.14 Bug Reports (`app/bugs/`)

Bug reporting/ticket system. Users submit reports with screenshots; admins manage status, priority, and categories. Floating widget on every page for quick reporting. All tickets visible to all authenticated users.

| File                                        | Purpose                                          |
| ------------------------------------------- | ------------------------------------------------ |
| `app/bugs/bugs-client.tsx`                  | Orchestrator (list ↔ detail ↔ create views)      |
| `app/bugs/bugs-list.tsx`                    | Report list with filters, sort, search, badges   |
| `app/bugs/bugs-detail.tsx`                  | Single report view (info, screenshots, comments) |
| `app/bugs/bugs-form.tsx`                    | Create report form (reused by widget)            |
| `app/bugs/bugs-comments.tsx`                | Comment thread with add-comment form             |
| `app/bugs/bugs-admin-controls.tsx`          | Admin-only status/priority/category controls     |
| `app/bugs/bugs-screenshot-upload.tsx`       | Multi-file upload with previews (max 5)          |
| `app/bugs/bugs-types.ts`                    | Local TypeScript types                           |
| `app/bugs/use-bugs.ts`                      | Report list + CRUD state hook (sort, filter)     |
| `app/bugs/use-bug-comments.ts`              | Comment state hook                               |
| `app/components/bug-report-widget.tsx`      | Floating button + modal (root layout)            |
| `app/api/bugs/route.ts`                     | `GET` list, `POST` create                        |
| `app/api/bugs/[id]/route.ts`                | `GET` detail, `PATCH` update                     |
| `app/api/bugs/[id]/comments/route.ts`       | `GET` comments, `POST` add comment               |
| `app/api/bugs/[id]/comments/[cId]/route.ts` | `PATCH` edit, `DELETE` comment                   |
| `app/api/bugs/categories/route.ts`          | `GET`, `POST`, `PATCH`, `DELETE` (admin CRUD)    |
| `app/api/bugs/screenshots/route.ts`         | `POST` upload screenshot                         |

**DB tables**: `bug_reports`, `bug_report_categories`, `bug_report_comments`, `bug_report_screenshots`
**Key patterns**: Simple workflow (open → resolved → closed); admin-only priority; auto-captured page URL; up to 5 screenshots via Supabase Storage (`bug-screenshots` bucket); threaded comments with notifications; inline comment edit/delete (forum pattern); report edit/delete (author + admin); client-side sorting and priority filter via `useMemo`; hero banner + standard `PageShell` template; markdown editing for descriptions and comments (`MarkdownEditor` + `AppMarkdown`); list card previews strip markdown via `stripMarkdown()` from `lib/markdown/strip-markdown.ts`; opt-in admin email notifications (owner/admin only) via Resend API — toggle hidden for non-admins, API silently ignores unauthorized toggles.

## 5. Shared Components (`app/components/`)

| Component            | File                         | Purpose                                                                                              |
| -------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| SidebarShell         | `sidebar-shell.tsx`          | App chrome wrapper (fixed sidebar + content), user card/menu, compact mobile account flyout          |
| SidebarNav           | `sidebar-nav.tsx`            | Main/admin nav groups, active route logic, forum category sub-items (desktop-expanded only)          |
| ClanAccessGate       | `clan-access-gate.tsx`       | Clan membership gate for scoped pages. Bypasses `/admin` routes. Syncs locale via `router.refresh()` |
| MarkdownEditor       | `markdown-editor.tsx`        | Write/preview tabs, toolbar, image upload. Props: `storageBucket`                                    |
| BannerPicker         | `banner-picker.tsx`          | 51 game-asset presets + custom upload                                                                |
| ConfirmModal         | `confirm-modal.tsx`          | Danger/warning/info variants, optional phrase confirmation                                           |
| FormModal            | `form-modal.tsx`             | Shared modal wrapper (backdrop, form, status)                                                        |
| DataState            | `data-state.tsx`             | Loading/empty/error state wrapper                                                                    |
| PaginationBar        | `pagination-bar.tsx`         | Page controls (compact mode available)                                                               |
| SortableColumnHeader | `sortable-column-header.tsx` | Clickable sort header with direction arrow                                                           |
| NotificationBell     | `notification-bell.tsx`      | Header bell icon + dropdown panel                                                                    |
| DatePicker           | `date-picker.tsx`            | Flatpickr wrapper (date or datetime)                                                                 |
| BugReportWidget      | `bug-report-widget.tsx`      | Floating bug report button + modal (root layout)                                                     |
| SearchInput          | `ui/search-input.tsx`        | Labeled search field                                                                                 |
| RadixSelect          | `ui/radix-select.tsx`        | Styled dropdown select with deterministic trigger/content ids for hydration-safe SSR                 |
| ComboboxInput        | `ui/combobox-input.tsx`      | Text input with suggestion dropdown                                                                  |
| IconButton           | `ui/icon-button.tsx`         | Icon-only action button                                                                              |

## 6. Shared Libraries (`lib/`)

| Module             | File                                | Purpose                                                                                                                                                                                       |
| ------------------ | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth helpers       | `api/require-auth.ts`               | Validates session, returns `{ userId, supabase }` or error                                                                                                                                    |
| Admin helpers      | `api/require-admin.ts`              | Validates admin role (wraps requireAuth)                                                                                                                                                      |
| Zod schemas        | `api/validation.ts`                 | `uuidSchema`, `notificationSettingsSchema`, `messageQuerySchema`, `dateStringSchema`, `bugReportCreateSchema`, `bugReportUpdateSchema`, `bugListQuerySchema`, `apiError()`, `parseJsonBody()` |
| Error logging      | `api/logger.ts`                     | `captureApiError()` — logs to console + Sentry. Use in all API catch blocks.                                                                                                                  |
| String utils       | `string-utils.ts`                   | `normalizeString()` — canonical `trim().toLowerCase()`. Use everywhere instead of inline.                                                                                                     |
| Permissions        | `permissions.ts`                    | Role→permission map. `hasPermission()`, `canDo()`, `isAdmin()`                                                                                                                                |
| Rate limiter       | `rate-limit.ts`                     | `createRateLimiter()` factory. Pre-built: `strictLimiter` (10/min), `standardLimiter` (30/min), `relaxedLimiter` (120/min). Isolated stores per instance.                                     |
| Domain types       | `types/domain.ts`                   | Shared interfaces: `InboxThread`, `SentMessage`, `ThreadMessage`, `ProfileSummary`, `ArchivedItem`, `BugReport`, `BugReportComment`, `BugReportScreenshot`, etc.                              |
| Markdown           | `markdown/app-markdown.tsx`         | Unified renderer (`variant="cms"` or `"forum"`)                                                                                                                                               |
| Markdown toolbar   | `markdown/app-markdown-toolbar.tsx` | Formatting buttons, image upload                                                                                                                                                              |
| Markdown sanitizer | `markdown/sanitize-markdown.ts`     | Normalizes content before rendering                                                                                                                                                           |
| Markdown stripper  | `markdown/strip-markdown.ts`        | Strips markdown syntax to plain text (card previews, search excerpts)                                                                                                                         |
| Date formatting    | `date-format.ts`                    | `formatLocalDateTime()`, `formatTimeAgo()` — shared "time ago" helper with locale fallback                                                                                                    |
| Banner upload      | `hooks/use-banner-upload.ts`        | `useBannerUpload()` — shared hook for uploading banner images with type/size validation                                                                                                       |
| Dashboard utils    | `dashboard-utils.ts`                | `toDateString()`, `extractAuthorName()`, `calculateTrend()`, `formatCompactNumber()`                                                                                                          |
| Error utils        | `supabase/error-utils.ts`           | Classifies Supabase errors → i18n keys                                                                                                                                                        |
| User role hook     | `hooks/use-user-role.ts`            | React hook: fetches role, exposes permission helpers                                                                                                                                          |
| Pagination hook    | `hooks/use-pagination.ts`           | Page state, page count, slice helpers                                                                                                                                                         |
| Sortable hook      | `hooks/use-sortable.ts`             | Sort key + direction + generic comparator                                                                                                                                                     |
| Email (send)       | `email/send-email.ts`               | Lightweight Resend API wrapper (raw `fetch`, no npm dep). Returns silently if env vars missing.                                                                                               |
| Email (bug tpl)    | `email/bug-report-email.ts`         | HTML email template for new bug report notifications                                                                                                                                          |

## 7. API Route Index

| Route                               | Methods                  | Auth         | Rate Limit       | Purpose                                             |
| ----------------------------------- | ------------------------ | ------------ | ---------------- | --------------------------------------------------- |
| `/api/messages`                     | GET, POST                | user         | standard         | Inbox (threaded, filters archived) / Send message   |
| `/api/messages/[id]`                | PATCH, DELETE            | user         | standard         | Mark read / Soft-delete                             |
| `/api/messages/sent`                | GET                      | user         | standard         | Sent messages (filters archived/deleted)            |
| `/api/messages/sent/[id]`           | DELETE                   | user         | standard         | Sender soft-delete (`sender_deleted_at`)            |
| `/api/messages/thread/[threadId]`   | GET, DELETE              | user         | standard         | Full thread + mark-read / Thread soft-delete        |
| `/api/messages/archive`             | GET, POST                | user         | standard         | Archived items (combined) / Archive/unarchive batch |
| `/api/messages/search-recipients`   | GET                      | user         | standard         | Recipient search                                    |
| `/api/notifications`                | GET                      | user         | relaxed          | User notifications                                  |
| `/api/notifications/[id]`           | PATCH                    | user         | standard         | Mark notification read                              |
| `/api/notifications/mark-all-read`  | POST                     | user         | standard         | Mark all read                                       |
| `/api/notifications/fan-out`        | POST                     | user         | strict           | Fan-out to clan members                             |
| `/api/notification-settings`        | GET, PATCH               | user         | standard         | Notification preferences                            |
| `/api/game-accounts`                | GET, POST, PATCH         | user         | standard         | Game account CRUD                                   |
| `/api/site-content`                 | GET, PATCH               | public/admin | relaxed/standard | CMS text content                                    |
| `/api/site-list-items`              | GET, PATCH               | public/admin | relaxed/standard | CMS list items                                      |
| `/api/auth/forgot-password`         | POST                     | public       | standard         | Password reset email                                |
| `/api/admin/create-user`            | POST                     | admin        | strict           | Invite new user                                     |
| `/api/admin/delete-user`            | POST                     | admin        | strict           | Delete user                                         |
| `/api/admin/user-lookup`            | POST                     | admin        | strict           | Lookup user by email                                |
| `/api/admin/email-confirmations`    | GET, POST                | admin        | strict           | Email confirmation status / Manual confirm          |
| `/api/admin/game-account-approvals` | GET, PATCH               | admin        | strict           | Approval queue                                      |
| `/api/admin/forum-categories`       | GET, POST, PATCH, DELETE | admin        | strict           | Forum category CRUD                                 |
| `/api/design-system/assets`         | GET, PATCH               | admin        | relaxed/standard | Design asset library                                |
| `/api/design-system/ui-elements`    | GET, POST, PATCH, DELETE | admin        | relaxed/standard | UI element inventory                                |
| `/api/design-system/assignments`    | GET, POST, DELETE        | admin        | relaxed/standard | Asset assignments                                   |
| `/api/design-system/preview-upload` | POST                     | admin        | standard         | Screenshot upload                                   |
| `/api/bugs`                         | GET, POST                | user         | standard         | Bug report list / Create report                     |
| `/api/bugs/[id]`                    | GET, PATCH, DELETE       | user/admin   | standard/strict  | Report detail / Update / Delete                     |
| `/api/bugs/[id]/comments`           | GET, POST                | user         | standard         | Report comments / Add comment                       |
| `/api/bugs/[id]/comments/[cId]`     | PATCH, DELETE            | user/admin   | standard/strict  | Edit / Delete comment                               |
| `/api/bugs/categories`              | GET, POST, PATCH, DELETE | user/admin   | standard/strict  | Bug report category CRUD                            |
| `/api/bugs/screenshots`             | POST                     | user         | standard         | Upload bug screenshot                               |

## 8. Database Table Index

| Table                           | Purpose                                                                                                         |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `profiles`                      | User profiles (username, display_name, email, default_game_account_id)                                          |
| `user_roles`                    | One global role per user (owner/admin/moderator/editor/member/guest)                                            |
| `game_accounts`                 | Per-user game accounts with approval_status                                                                     |
| `game_account_clan_memberships` | Links game accounts to clans (rank, is_active)                                                                  |
| `clans`                         | Clan metadata (name, is_default, is_unassigned)                                                                 |
| `audit_logs`                    | Action audit trail (entity, action, actor, details)                                                             |
| `messages`                      | One row per authored message (sender, subject, content, type, threading, sender_deleted_at, sender_archived_at) |
| `message_recipients`            | One row per recipient (is_read, deleted_at for soft delete, archived_at for archive)                            |
| `notifications`                 | Notification feed (type, title, body, reference_id, is_read)                                                    |
| `user_notification_settings`    | Per-user per-type notification toggles                                                                          |
| `articles`                      | Announcements (title, content, banner_url, created_by, updated_by)                                              |
| `events`                        | Events (date, time, duration, recurrence, banner_url, is_pinned)                                                |
| `event_templates`               | Reusable event templates (same fields as events)                                                                |
| `forum_categories`              | Forum categories (name, slug, sort_order)                                                                       |
| `forum_posts`                   | Forum posts (title, content, category, is_pinned, vote/view counts)                                             |
| `forum_comments`                | Threaded comments on posts (parent_id for nesting)                                                              |
| `forum_votes`                   | Post upvotes/downvotes                                                                                          |
| `forum_comment_votes`           | Comment upvotes/downvotes                                                                                       |
| `site_content`                  | CMS text content (page, section_key, bilingual)                                                                 |
| `site_list_items`               | CMS structured list items (page, section_key, sort_order)                                                       |
| `design_assets`                 | Game asset catalog (~2,359 PNGs)                                                                                |
| `ui_elements`                   | UI element inventory (render_type, preview)                                                                     |
| `asset_assignments`             | Maps game assets to UI elements                                                                                 |
| `bug_reports`                   | Bug reports (title, description, status, priority, category, page_url, reporter_id)                             |
| `bug_report_categories`         | Admin-managed bug report categories (name, sort_order)                                                          |
| `bug_report_comments`           | Threaded comments on bug reports (report_id, author_id, content)                                                |
| `bug_report_screenshots`        | Screenshot metadata for bug reports (report_id, storage_path, file_name)                                        |

## 9. Conventions & Patterns

### API Routes

- Every route uses `try/catch` returning `{ error: "..." }` on failure.
- Every route calls a rate limiter **before** `try/catch`: `const blocked = limiter.check(request); if (blocked) return blocked;`
- Auth: `requireAuth()` for user routes, `requireAdmin()` for admin routes. Service role client for DB operations that bypass RLS.
- Input validation: Zod schemas for request bodies and route params. Use `parseJsonBody(request, schema)` from `lib/api/validation.ts` for JSON body parsing + validation.
- Error logging: Always use `captureApiError()` from `lib/api/logger.ts` — never raw `console.error` — to ensure errors reach Sentry.
- Error responses: Return generic user-facing messages (e.g. "Failed to load data."), never raw DB error messages.
- Success responses: Wrap in `{ data: ... }` for consistency; use `apiError()` helper for error responses.

### Client Components

- Page pattern: `page.tsx` (server) → `feature-client.tsx` ("use client" with all logic).
- Data fetching: `useCallback` + `useEffect` with `try/finally` for loading states.
- Profile maps merged via `useMemo` to avoid recomputation on every render.
- All user-facing strings use `useTranslations("namespace")` from `next-intl`.

### Permissions

- Roles: owner (Webmaster) > admin (Administrator) > moderator > editor > member > guest. Guest has the same permissions as member.
- The "owner" role is displayed as **Webmaster** (both DE + EN). The "admin" role is displayed as **Administrator**.
- Nobody can change or delete a Webmaster's role. Only the Webmaster can change or delete an Administrator's role. Enforced at both the UI level (`canChangeRoleOf()`) and the database level (two triggers on `user_roles`: `role_change_protection_trigger` for UPDATE, `role_delete_protection_trigger` for DELETE).
- DB helpers: `is_owner()` SQL function mirrors the TypeScript `isOwner()`. `enforce_role_change_protection()` (UPDATE) and `enforce_role_delete_protection()` (DELETE) triggers mirror `canChangeRoleOf()`.
- If a Webmaster or Administrator has no in-game rank (null/"Keine"), the role name is shown in place of the rank on the members page.
- Ranks (cosmetic, on `game_account_clan_memberships`): leader > superior > officer > veteran > soldier > guest.
- Single source of truth: `lib/permissions.ts` (TypeScript) + `has_permission()` SQL function (mirrors it for RLS).
- Key helpers: `isOwner()`, `isAdmin()`, `canChangeRoleOf()`, `isContentManager()`.
- Client-side: `useUserRole()` hook from `lib/hooks/use-user-role.ts`.

### Markdown

- All rendering goes through `AppMarkdown` with `variant` prop ("cms" or "forum").
- All content sanitized via `sanitizeMarkdown()` before rendering.
- Editing uses `MarkdownEditor` component (write/preview tabs, toolbar, image upload).
- Storage buckets: `forum-images` (default), `message-images` (messaging), `bug-screenshots` (bug reports).

### Messaging

- Broadcasts send a nil UUID (`00000000-0000-0000-0000-000000000000`) as `recipient_ids` placeholder; server resolves actual recipients.
- Threading: `thread_id` = root message ID, `parent_id` = direct parent. All replies share `thread_id`.
- No reply on broadcast/clan messages (one-way notifications).
- Soft delete: `deleted_at` on `message_recipients` (per-recipient, message stays for sender/others). `sender_deleted_at` on `messages` (sender outbox only).
- Archive: `archived_at` on `message_recipients` (hides from inbox), `sender_archived_at` on `messages` (hides from outbox). Reversible via unarchive. Archive tab shows combined inbox+sent archived items with source badges.
- Multi-select: Checkboxes on each list item, batch action bar for delete/archive/unarchive. Uses `Promise.allSettled` for parallel API calls.

### i18n

- Two locale files: `messages/en.json` + `messages/de.json`.
- Namespaced: `"messagesPage"`, `"forum"`, `"events"`, `"admin"`, `"common"`, etc.
- Components use `useTranslations("namespace")` (client) or `getTranslations("namespace")` (server).

### Testing

- Unit: Vitest, 654 tests across 32 files colocated as `*.test.ts` in `lib/` and `app/`. Run: `npm run test:unit`.
- E2E: Playwright, 347 tests across 29 specs in `tests/`. Pre-authenticated via `storageState`. Run: `npx playwright test`.
- 6 test roles: owner, admin, moderator, editor, member, guest.
- All `.content-inner` locators use `.first()` (pages render 2+ instances via `PageShell` + client component).
- `tests/messages.spec.ts` includes a mobile-only thread panel flow test (list → thread → back) and seeds a private message via admin API context when inbox data is empty.

### Styling

- All CSS in `app/globals.css` using CSS custom properties (`--color-gold`, `--color-surface`, etc.).
- No Tailwind utility classes in app code; CSS classes follow BEM-like naming (`.messages-email-card`, `.forum-post-item`).
- Sidebar: 240px expanded, 60px collapsed (CSS variable `--sidebar-width`).
- Decorative `next/image` assets that are CSS-resized must keep aspect ratio (`height: auto` when width is CSS-driven, or `fill` with realistic `sizes`).

### Responsive Breakpoints

All sidebar/layout responsive rules live in `layout.css` (consolidated from previously split locations).

- **900px** — Primary breakpoint: sidebar collapses to icon-only strip; `.content` adjusts margin; `.content-inner` padding reduces to `16px 12px 32px`; `.grid` and `.grid-12` switch to 1-column; messages tabs wrap (`flex-wrap`); top-bar wraps; footer padding tightens; action-icons and inline action lists allow wrapping; forum/news/bugs flex containers wrap; sidebar nav sub-items (forum categories) hidden when collapsed — in-page filter pills serve as the mobile alternative; sidebar header logo is hidden; sidebar bottom switches to compact account-trigger pattern (avatar opens a fixed-position flyout with profile/settings/messages/signout and DE/EN toggle); hero headings/subtitles scale+wrap to avoid clipping; dense controls (icon actions, bell, sort toggles, message actions) target ~40px touch areas
- **768px** — Tables: member directory switches layout; events calendar and bugs search go compact
- **720px** — Settings grid switches to single column
- **640px** — News card banner heights; home about section padding
- **480px** — Forum thumbnails shrink; event calendar extra-compact; forum reply indents reduce
- **420px** — Notification bell panel becomes fluid width

Messages mobile pattern: On screens <=900px, the `.messages-layout.thread-active` class hides the list panel and shows the thread panel. A `.messages-back-btn` (hidden on desktop) allows navigating back via `clearSelection()` from the `useMessages` hook. Message tabs use `flex-wrap` to handle narrow viewports. Thread panel has no `max-height` constraint, allowing the page to scroll naturally.

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

| File                            | Purpose                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------ |
| `messages_v2.sql`               | Messages + recipients tables, threading, data migration                        |
| `notifications.sql`             | Notifications + user settings tables                                           |
| `forum_tables.sql`              | Forum categories, posts, comments, votes                                       |
| `forum_rls_permissions.sql`     | Forum RLS using `has_permission()`                                             |
| `game_account_approval.sql`     | Approval workflow for game accounts                                            |
| `roles_permissions_cleanup.sql` | Drop legacy role tables, new permission functions                              |
| `event_templates.sql`           | Event templates table                                                          |
| `event_recurrence.sql`          | Recurrence fields on events                                                    |
| `design_system_tables.sql`      | Design asset management tables                                                 |
| `author_fk_constraints.sql`     | FK constraints enabling PostgREST joins                                        |
| `messages_sender_delete.sql`    | Adds `sender_deleted_at` column + index to messages                            |
| `messages_archive.sql`          | Adds `archived_at` to recipients, `sender_archived_at` to messages + indexes   |
| `bug_reports.sql`               | Bug report tables, RLS policies, indexes, storage bucket, default categories   |
| `bug_reports_v2.sql`            | Comment edit/delete, `bugs_email_enabled` setting, edit/delete RLS policies    |
| `bug_reports_v3.sql`            | Adds `slug` column to `bug_report_categories` for i18n                         |
| `guest_role_permissions.sql`    | Promotes guest to member-level permissions in `has_permission()` SQL function  |
| `drop_chest_data_tables.sql`    | Drops `chest_entries`, `validation_rules`, `correction_rules`, `scoring_rules` |
