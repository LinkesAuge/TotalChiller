# Architecture

> Primary reference for AI agents and developers. Describes what the app is, where things live, how modules connect, and what patterns to follow. For change history see `CHANGELOG.md`. For setup instructions see `runbook.md`.
>
> **Keep this file current.** Update it when you add/remove/move files, API routes, DB tables, or change patterns.

## 1. Project Identity

**[THC] Chiller & Killer** is a clan management platform for a Total Battle gaming community. Medieval "Fortress Sanctum" dark theme with gold accents.

**Features:** messaging (private + broadcast), forum, events calendar, announcements, member directory, bug reports, admin panel, CMS-editable public pages, notification system, design system asset manager.

**Removed features:** validation rules, correction rules, scoring rules, analytics/charts. Legacy tables `validation_rules`, `correction_rules`, `scoring_rules` have been dropped.

**Data pipeline (new):** ChillerBuddy desktop app exports OCR-extracted game data (chests, members, events) as JSON. The website accepts this via file import or API push, stages it for review, and promotes approved data to production tables. Validation/correction lists sync bidirectionally. See `Documentation/ChillerBuddy/2026-02-21-data-pipeline-overview.md` for the full design.

## 2. Tech Stack

| Layer          | Technology                                                  |
| -------------- | ----------------------------------------------------------- |
| Framework      | Next.js 16 (App Router, server + client components)         |
| Language       | TypeScript (strict, `noUncheckedIndexedAccess`)             |
| Database       | Supabase (PostgreSQL + RLS + Storage)                       |
| Auth           | Supabase Auth (email/password, PKCE)                        |
| Styling        | CSS modules under `app/styles/`, CSS variables, no Tailwind |
| i18n           | `next-intl` with `messages/en.json` + `messages/de.json`    |
| Markdown       | `react-markdown` + `remark-gfm` + `remark-breaks`           |
| Unit tests     | Vitest (`npm run test:unit`)                                |
| E2E tests      | Playwright (`npx playwright test`)                          |
| Linting        | ESLint (flat config) + Prettier + Husky pre-commit          |
| Error tracking | Sentry (client + server + edge) + Vercel Web Analytics      |
| Rate limiting  | Custom in-memory sliding window (`lib/rate-limit.ts`)       |

## 3. Directory Map

```
├── app/                    # Next.js App Router
│   ├── api/                # Server-side API routes (see §7)
│   ├── admin/              # Admin panel (modular tabs, see §4.9)
│   ├── components/         # Shared UI components (see §5)
│   ├── hooks/              # App-level hooks/providers (auth, dashboard, supabase, clan-context)
│   ├── styles/             # CSS modules (theme, layout, components, feature CSS)
│   ├── [feature]/          # Feature pages (page.tsx + feature-client.tsx + loading.tsx + error.tsx)
│   ├── globals.css         # CSS entry point (imports all style modules)
│   ├── layout.tsx          # Root layout (sidebar, providers, fonts)
│   └── error.tsx           # Global error boundary
├── lib/                    # Shared logic (no React, importable everywhere)
│   ├── api/                # API helpers: requireAuth, requireAdmin, Zod schemas, logger
│   ├── constants/          # Shared constants (banner-presets)
│   ├── hooks/              # Shared React hooks (pagination, sortable, roles, auth-state)
│   ├── markdown/           # Unified markdown system (renderer, toolbar, sanitizer, stripper)
│   ├── messages/           # Messaging helpers (profile maps, broadcast targeting)
│   ├── supabase/           # Supabase clients (browser, server, service-role)
│   ├── types/              # Shared types (domain.ts, messages-api.ts)
│   ├── permissions.ts      # Role → permission map (single source of truth)
│   ├── rate-limit.ts       # Rate limiter factory
│   └── date-format.ts      # Date formatting helpers
├── messages/               # i18n translation files (en.json, de.json)
├── tests/                  # Playwright E2E specs + auth helpers
├── scripts/                # Utility scripts (asset scanner, UI scanner)
├── Documentation/          # Architecture, changelog, runbook, migrations
│   └── migrations/         # SQL migration files (run order in runbook.md)
├── public/assets/          # Static assets (game icons, banners, backgrounds)
├── proxy.ts                # Middleware: auth redirect, admin gating, PKCE catch
└── next.config.js          # Next.js config (CSP, image domains)
```

## 4. Feature Modules

Each feature follows: `app/[feature]/page.tsx` (thin server component) → `app/[feature]/[feature]-client.tsx` ("use client" with all logic).

### 4.1 Auth (`app/auth/`)

Login, register, forgot password, password update. Supabase Auth with PKCE flow. First-login detection redirects users without game accounts to `/profile`. `proxy.ts` handles page-level auth gating; API routes handle their own auth via `requireAuth()`.

| File                                  | Purpose                               |
| ------------------------------------- | ------------------------------------- |
| `app/auth/login/page.tsx`             | Login with first-login redirect       |
| `app/auth/register/page.tsx`          | Registration with onboarding guide    |
| `app/auth/forgot/page.tsx`            | Password reset (optional CAPTCHA)     |
| `app/auth/update/page.tsx`            | Password reset completion             |
| `app/auth/callback/route.ts`          | PKCE code exchange                    |
| `lib/supabase/browser-client.ts`      | Client-side Supabase singleton        |
| `lib/supabase/server-client.ts`       | Server-side Supabase (cookies)        |
| `lib/supabase/service-role-client.ts` | Service role singleton (bypasses RLS) |

**DB tables:** `profiles`, `user_roles`, `game_accounts`

### 4.2 Messaging (`app/messages/`)

Chat-style messaging with flat threading. Two delivery paths:

- **Private/system messages** use `message_recipients` rows (one per recipient).
- **Broadcasts** (`broadcast`, `clan` types) use **pull-based visibility**: targeting criteria (`target_ranks`, `target_roles`, `target_clan_id`) stored on the message row. Visibility resolved at read time against user's current rank/clan/role. No `message_recipients` rows for broadcasts.

Thread detail renders as a chat timeline (own messages right, received left). Subject shown once in thread header. Leadership (leader/superior/Webmaster) or the original sender can reply-all to broadcast threads. Archive, multi-select batch delete/archive, rank filtering when composing broadcasts.

| File                                  | Purpose                                      |
| ------------------------------------- | -------------------------------------------- |
| `app/messages/messages-client.tsx`    | Orchestrator (compose, inbox, thread)        |
| `app/messages/messages-inbox.tsx`     | Inbox/sent/archive list with multi-select    |
| `app/messages/messages-thread.tsx`    | Thread detail (chat timeline)                |
| `app/messages/messages-compose.tsx`   | Compose form with rank filter for broadcasts |
| `app/messages/rank-filter.tsx`        | Rank filter dropdown (Radix Popover)         |
| `app/messages/use-messages.ts`        | State hook (data, CRUD, delete, archive)     |
| `lib/messages/profile-utils.ts`       | Shared profile map + label helpers           |
| `lib/messages/broadcast-targeting.ts` | Broadcast visibility, recipient resolution   |
| `lib/types/messages-api.ts`           | Shared DTO contracts for API responses       |

**DB tables:** `messages`, `message_recipients`, `message_reads`, `message_dismissals`

**Key patterns:**

- Nil UUID `00000000-...` as broadcast `recipient_ids` placeholder
- `thread_id` = root message ID for flat threading
- `loadUserBroadcastContext()` + `userMatchesBroadcastTargetingSync()` for O(1) per-message inbox filtering
- Soft delete: `deleted_at` on recipients (private), `message_dismissals` (broadcast), `sender_deleted_at` (outbox)
- Archive: `archived_at` on recipients/dismissals, `sender_archived_at` on messages. Reversible.

### 4.3 Forum (`app/forum/`)

Reddit-style forum with categories, posts, threaded comments, voting, markdown, pinned posts, thumbnails. Deep-link: `/forum?post=<id>`.

| File                              | Purpose                            |
| --------------------------------- | ---------------------------------- |
| `app/forum/forum-client.tsx`      | Forum UI (list, detail, comments)  |
| `app/forum/use-forum.ts`          | State hook (data, CRUD, deep-link) |
| `app/forum/forum-post-detail.tsx` | Single post with comments          |
| `app/forum/forum-post-list.tsx`   | Post list with thumbnails          |

**DB tables:** `forum_categories`, `forum_posts`, `forum_comments`, `forum_votes`, `forum_comment_votes`

### 4.4 Events (`app/events/`)

Calendar with day panel, upcoming sidebar, recurring events (single DB row, client-side expansion), multi-day events, banners, pinned events, templates. Deep-link: `/events?date=YYYY-MM-DD&event=<id>`.

| File                                     | Purpose                         |
| ---------------------------------------- | ------------------------------- |
| `app/events/events-client.tsx`           | Main events page                |
| `app/events/use-events.ts`               | State hook (calendar, form)     |
| `app/events/event-calendar.tsx`          | Monthly calendar grid           |
| `app/events/day-panel-event-card.tsx`    | Event card in day panel         |
| `app/events/upcoming-events-sidebar.tsx` | Upcoming events with pagination |
| `app/events/events-utils.ts`             | Date range, recurrence helpers  |

**DB tables:** `events`, `event_templates`

### 4.5 Announcements (`app/news/`)

Rich cards with banner headers, markdown content, server-side pagination, edit tracking, author protection. Deep-link: `/news?article=<id>`.

| File                       | Purpose                  |
| -------------------------- | ------------------------ |
| `app/news/news-client.tsx` | Announcements UI         |
| `app/news/use-news.ts`     | State hook (data, CRUD)  |
| `app/news/news-form.tsx`   | Article create/edit form |

**DB tables:** `articles`

### 4.6 Bug Reports (`app/bugs/`)

Bug reporting/ticket system. Users submit reports with screenshots; admins manage status/priority/categories. Floating widget on every page for quick reporting. All tickets visible to authenticated users. Workflow: Open → Resolved → Closed. Admin-only priority. Markdown editing. Opt-in admin email notifications via Resend API.

| File                                          | Purpose                              |
| --------------------------------------------- | ------------------------------------ |
| `app/bugs/bugs-client.tsx`                    | Orchestrator (list, detail, create)  |
| `app/bugs/bugs-list.tsx`                      | Report list with filters/sort/search |
| `app/bugs/bugs-detail.tsx`                    | Single report view                   |
| `app/bugs/bugs-form.tsx`                      | Create form (reused by widget)       |
| `app/bugs/bugs-comments.tsx`                  | Comment thread                       |
| `app/bugs/bugs-admin-controls.tsx`            | Admin status/priority controls       |
| `app/bugs/use-bugs.ts`                        | Report list state hook               |
| `app/components/bug-report-widget.tsx`        | Floating button + modal              |
| `app/components/bug-report-widget-loader.tsx` | Dynamic loader (deferred bundle)     |

**DB tables:** `bug_reports`, `bug_report_categories`, `bug_report_comments`, `bug_report_screenshots`

### 4.7 CMS (`app/components/editable-*`)

Inline-editable content for public pages (home, about, contact, privacy). `useSiteContent(page)` hook loads text and structured lists.

| File                                 | Purpose                   |
| ------------------------------------ | ------------------------- |
| `app/components/editable-text.tsx`   | Inline text editor        |
| `app/components/editable-list.tsx`   | Drag-and-drop list editor |
| `app/components/use-site-content.ts` | CMS data hook             |

**DB tables:** `site_content`, `site_list_items`

### 4.8 Notifications (`app/components/notification-bell.tsx`)

Bell icon in header with dropdown. DB-stored, polls every 60s. Fan-out on news/event creation. Per-type user preferences.

**DB tables:** `notifications`, `user_notification_settings`

### 4.9 Admin Panel (`app/admin/`)

Modular tab-based admin. Slim orchestrator (`admin-client.tsx`) with `AdminProvider` context. Each tab lazy-loaded via `next/dynamic`.

| Tab         | File                                 | Purpose                                             |
| ----------- | ------------------------------------ | --------------------------------------------------- |
| Clans       | `app/admin/tabs/clans-tab.tsx`       | Clan management + game account memberships          |
| Users       | `app/admin/tabs/users-tab.tsx`       | User CRUD, game accounts, inline membership editing |
| Approvals   | `app/admin/tabs/approvals-tab.tsx`   | Registration confirmations + game account approvals |
| Forum       | `app/admin/tabs/forum-tab.tsx`       | Forum category management                           |
| Logs        | `app/admin/tabs/logs-tab.tsx`        | Audit log viewer                                    |
| Import      | `app/admin/tabs/import-tab.tsx`      | ChillerBuddy JSON file import (dropzone + preview)  |
| Submissions | `app/admin/tabs/submissions-tab.tsx` | Review/approve imported data (inline list + detail) |

**DB tables:** `profiles`, `user_roles`, `game_accounts`, `game_account_clan_memberships`, `clans`, `audit_logs`, `data_submissions`, `staged_*_entries`

New tabs go in `app/admin/tabs/`, registered in `admin-client.tsx`'s `TAB_MAP`. Shared state lives in `admin-context.tsx`.

### 4.10 Members (`app/members/`)

Clan member directory. Game accounts sorted by rank. Webmaster/Administrator with no in-game rank show role name as rank substitute.

**DB tables:** `game_account_clan_memberships`, `game_accounts`, `profiles`

### 4.11 Dashboard (`app/`)

Landing page after login. Shows announcements, upcoming events, stat cards. Items link to `/news?article=<id>`, `/events?date=...&event=<id>`, `/forum?post=<id>`.

### 4.12 Design System (`app/design-system/`)

Admin tool for managing game assets, UI element inventory, and asset assignments.

**DB tables:** `design_assets`, `ui_elements`, `asset_assignments`

### 4.13 Submission Detail (`app/submissions/[id]/`)

Standalone admin-gated page for deep-linking into a specific submission's staged entries. Server component checks `is_any_admin()` and redirects non-admins. Linked from the admin Submissions tab and used for detailed entry review with bulk/per-item actions.

**DB tables:** `data_submissions`, `staged_chest_entries`, `staged_member_entries`, `staged_event_entries`

## 5. Shared Components (`app/components/`)

| Component            | File                         | Purpose                                                                              |
| -------------------- | ---------------------------- | ------------------------------------------------------------------------------------ |
| SidebarShell         | `sidebar-shell.tsx`          | App chrome (fixed sidebar + content), user menu, mobile flyout                       |
| SidebarNav           | `sidebar-nav.tsx`            | Main/admin nav groups, active route logic                                            |
| ClanAccessGate       | `clan-access-gate.tsx`       | Clan membership gate for scoped pages                                                |
| MarkdownEditor       | `markdown-editor.tsx`        | Write/preview tabs, toolbar, image upload                                            |
| BannerPicker         | `banner-picker.tsx`          | Game-asset banner presets + custom upload                                            |
| ConfirmModal         | `confirm-modal.tsx`          | Danger/warning/info variants with GameButton confirm                                 |
| FormModal            | `form-modal.tsx`             | Modal wrapper with form + GameButton submit                                          |
| DataState            | `data-state.tsx`             | Loading/empty/error state wrapper                                                    |
| PaginationBar        | `pagination-bar.tsx`         | Page controls with compact mode                                                      |
| SortableColumnHeader | `sortable-column-header.tsx` | Clickable sort header with direction arrow                                           |
| NotificationBell     | `notification-bell.tsx`      | Header bell icon + dropdown panel                                                    |
| DatePicker           | `date-picker.tsx`            | Flatpickr wrapper                                                                    |
| GameButton           | `ui/game-button.tsx`         | Themed button (9 variants: ornate1-3, hero, green/orange/purple/turquoise, standard) |
| GameIcon             | `ui/game-icon.tsx`           | Game-asset icon (5 sizes, raw-path support)                                          |
| GameAlert            | `ui/game-alert.tsx`          | Themed alert (info/warn/error/success)                                               |
| RadixSelect          | `ui/radix-select.tsx`        | Styled dropdown (hydration-safe SSR)                                                 |

## 6. Shared Libraries (`lib/`)

| Module              | File                              | Purpose                                                                                |
| ------------------- | --------------------------------- | -------------------------------------------------------------------------------------- |
| Auth helpers        | `api/require-auth.ts`             | Validates session, returns `{ userId, supabase }`                                      |
| Admin helpers       | `api/require-admin.ts`            | Validates admin role (wraps requireAuth)                                               |
| Zod schemas         | `api/validation.ts`               | Input validation schemas + `apiError()` + `parseJsonBody()`                            |
| Error logging       | `api/logger.ts`                   | `captureApiError()` — logs to console + Sentry                                         |
| Permissions         | `permissions.ts`                  | Role→permission map, `hasPermission()`, `isOwner()`, `canChangeRoleOf()`               |
| Rate limiter        | `rate-limit.ts`                   | Factory with pre-built limiters: strict (10/min), standard (30/min), relaxed (120/min) |
| Domain types        | `types/domain.ts`                 | Shared interfaces for all features                                                     |
| Message API DTOs    | `types/messages-api.ts`           | Response contracts for `/api/messages*`                                                |
| Message helpers     | `messages/profile-utils.ts`       | Profile map loading, label fallback logic                                              |
| Broadcast targeting | `messages/broadcast-targeting.ts` | Visibility checking, recipient resolution, reply-all auth                              |
| Markdown renderer   | `markdown/app-markdown.tsx`       | Unified renderer (variant: "cms" or "forum")                                           |
| Markdown sanitizer  | `markdown/sanitize-markdown.ts`   | Content normalization before rendering                                                 |
| Markdown stripper   | `markdown/strip-markdown.ts`      | Strips markdown to plain text (card previews)                                          |
| Error utils         | `supabase/error-utils.ts`         | Classifies Supabase errors → i18n keys                                                 |
| Auth state          | `hooks/auth-state-context.ts`     | Shared app-wide auth/role context                                                      |
| User role hook      | `hooks/use-user-role.ts`          | Role/permission helpers for components                                                 |
| Email               | `email/send-email.ts`             | Resend API wrapper (raw fetch, no npm dep)                                             |

## 7. API Route Index

| Route                                 | Methods                  | Auth         | Rate Limit       | Purpose                             |
| ------------------------------------- | ------------------------ | ------------ | ---------------- | ----------------------------------- |
| `/api/messages`                       | GET, POST                | user         | standard         | Inbox (dual-path) / Send            |
| `/api/messages/[id]`                  | PATCH, DELETE            | user         | standard         | Mark read / Soft-delete             |
| `/api/messages/sent`                  | GET                      | user         | standard         | Sent messages                       |
| `/api/messages/sent/[id]`             | DELETE                   | user         | standard         | Sender soft-delete                  |
| `/api/messages/thread/[threadId]`     | GET, DELETE              | user         | standard         | Thread + mark-read / Thread delete  |
| `/api/messages/archive`               | GET, POST                | user         | standard         | Archived items / Archive batch      |
| `/api/messages/search-recipients`     | GET                      | user         | standard         | Recipient search                    |
| `/api/notifications`                  | GET                      | user         | relaxed          | User notifications                  |
| `/api/notifications/[id]`             | PATCH, DELETE            | user         | standard         | Mark read / Delete                  |
| `/api/notifications/mark-all-read`    | POST                     | user         | standard         | Mark all read                       |
| `/api/notifications/fan-out`          | POST                     | user         | strict           | Fan-out to clan members             |
| `/api/notifications/delete-all`       | POST                     | user         | standard         | Delete all                          |
| `/api/notification-settings`          | GET, PATCH               | user         | standard         | Notification preferences            |
| `/api/game-accounts`                  | GET, POST, PATCH         | user         | standard         | Game account CRUD                   |
| `/api/site-content`                   | GET, PATCH               | public/admin | relaxed/standard | CMS text content                    |
| `/api/site-list-items`                | GET, PATCH               | public/admin | relaxed/standard | CMS list items                      |
| `/api/auth/forgot-password`           | POST                     | public       | standard         | Password reset email                |
| `/api/admin/create-user`              | POST                     | admin        | strict           | Invite new user                     |
| `/api/admin/resend-invite`            | POST                     | admin        | strict           | Resend invite email                 |
| `/api/admin/delete-user`              | POST                     | admin        | strict           | Delete user                         |
| `/api/admin/user-lookup`              | POST                     | admin        | strict           | Lookup user by email                |
| `/api/admin/email-confirmations`      | GET, POST                | admin        | standard/strict  | Email confirmation status / Confirm |
| `/api/admin/game-account-approvals`   | GET, PATCH               | admin        | strict           | Approval queue                      |
| `/api/admin/forum-categories`         | GET, POST, PATCH, DELETE | admin        | strict           | Forum category CRUD                 |
| `/api/design-system/assets`           | GET, PATCH               | admin        | relaxed/standard | Design asset library                |
| `/api/design-system/ui-elements`      | GET, POST, PATCH, DELETE | admin        | relaxed/standard | UI element inventory                |
| `/api/design-system/assignments`      | GET, POST, DELETE        | admin        | relaxed/standard | Asset assignments                   |
| `/api/design-system/preview-upload`   | POST                     | admin        | standard         | Screenshot upload                   |
| `/api/bugs`                           | GET, POST                | user         | standard         | Bug report list / Create            |
| `/api/bugs/[id]`                      | GET, PATCH, DELETE       | user/admin   | standard/strict  | Report detail / Update / Delete     |
| `/api/bugs/[id]/comments`             | GET, POST                | user         | standard         | Comments / Add comment              |
| `/api/bugs/[id]/comments/[commentId]` | PATCH, DELETE            | user/admin   | standard/strict  | Edit / Delete comment               |
| `/api/bugs/categories`                | GET, POST, PATCH, DELETE | user/admin   | standard/strict  | Bug category CRUD                   |
| `/api/bugs/screenshots`               | POST                     | user         | standard         | Upload screenshot                   |
| **Data Pipeline / Import**            |                          |              |                  |                                     |
| `/api/import/config`                  | GET                      | public       | standard         | Supabase URL + anon key discovery   |
| `/api/import/clans`                   | GET                      | bearer/user  | standard         | User's clans (for ChillerBuddy)     |
| `/api/import/submit`                  | POST                     | bearer/user  | relaxed          | Ingest ChillerBuddy export JSON     |
| `/api/import/submissions`             | GET                      | user         | standard         | List submissions (filters + paging) |
| `/api/import/submissions/[id]`        | GET, DELETE              | user/admin   | standard         | Detail + staged entries / Delete    |
| `/api/import/submissions/[id]/review` | POST                     | admin/mod    | standard         | Approve/reject staged entries       |
| `/api/import/validation-lists`        | GET, POST                | bearer/user  | standard         | OCR corrections + known names sync  |

## 8. Database Table Index

| Table                           | Purpose                                                         |
| ------------------------------- | --------------------------------------------------------------- |
| `profiles`                      | User profiles (username, display_name, default_game_account)    |
| `user_roles`                    | One global role per user                                        |
| `game_accounts`                 | Per-user game accounts with approval_status                     |
| `game_account_clan_memberships` | Links game accounts to clans (rank, is_active)                  |
| `clans`                         | Clan metadata (name, is_default, is_unassigned)                 |
| `audit_logs`                    | Action audit trail                                              |
| `messages`                      | One row per authored message (sender, subject, type, targeting) |
| `message_recipients`            | One row per recipient for private messages                      |
| `message_reads`                 | Per-user read tracking for broadcast messages                   |
| `message_dismissals`            | Per-user delete/archive for broadcast messages                  |
| `notifications`                 | Notification feed (type, title, body, reference_id)             |
| `user_notification_settings`    | Per-user notification toggles                                   |
| `articles`                      | Announcements (title, content, banner_url, author tracking)     |
| `events`                        | Events (date, time, duration, recurrence, banner)               |
| `event_templates`               | Reusable event templates                                        |
| `forum_categories`              | Forum categories (name, slug, sort_order)                       |
| `forum_posts`                   | Forum posts (title, content, category, votes)                   |
| `forum_comments`                | Threaded comments on posts                                      |
| `forum_votes`                   | Post upvotes/downvotes                                          |
| `forum_comment_votes`           | Comment upvotes/downvotes                                       |
| `site_content`                  | CMS text content (page, section_key, bilingual)                 |
| `site_list_items`               | CMS structured list items (page, section_key, sort_order)       |
| `design_assets`                 | Game asset catalog                                              |
| `ui_elements`                   | UI element inventory                                            |
| `asset_assignments`             | Maps game assets to UI elements                                 |
| `bug_reports`                   | Bug reports (title, status, priority, category)                 |
| `bug_report_categories`         | Admin-managed bug report categories                             |
| `bug_report_comments`           | Comments on bug reports                                         |
| `bug_report_screenshots`        | Screenshot metadata for bug reports                             |
| **Data Pipeline (staging)**     |                                                                 |
| `data_submissions`              | Import batch envelope (per type: chests/members/events)         |
| `staged_chest_entries`          | Pending chest records awaiting review                           |
| `staged_member_entries`         | Pending member snapshot records awaiting review                 |
| `staged_event_entries`          | Pending event result records awaiting review                    |
| **Data Pipeline (production)**  |                                                                 |
| `chest_entries`                 | Approved chest data (rebuilt, replaces dropped legacy table)    |
| `member_snapshots`              | Approved member power snapshots                                 |
| `event_results`                 | Approved event ranking results                                  |
| **Data Pipeline (validation)**  |                                                                 |
| `ocr_corrections`               | OCR text corrections per clan (player/chest/source)             |
| `known_names`                   | Confirmed-correct names per clan (player/chest/source)          |

## 9. Conventions & Patterns

### API Routes

- Every route wraps logic in `try/catch`, returning `{ error: "..." }` on failure.
- Rate limiter runs **before** `try/catch`: `const blocked = limiter.check(request); if (blocked) return blocked;`
- Auth: `requireAuth()` for user routes, `requireAdmin()` for admin routes. Always call auth **before** body parsing.
- Input validation: Zod schemas via `parseJsonBody(request, schema)`.
- Error logging: Always use `captureApiError()` from `lib/api/logger.ts` (never raw `console.error`).
- Error responses: Return generic user-facing messages, never raw DB errors. Use `apiError()` helper.
- Success responses: Wrap in `{ data: ... }`.

### Client Components

- Page pattern: `page.tsx` (server) → `feature-client.tsx` ("use client" with all logic).
- Data fetching: `useCallback` + `useEffect` with `try/finally` for loading states.
- Global auth/role state centralized in `AuthStateProvider` (root layout). Feature hooks consume one shared session/role source.
- All user-facing strings use `useTranslations("namespace")` from `next-intl`.

### Permissions

- **Roles:** owner (Webmaster) > admin (Administrator) > moderator > editor > member > guest. Guest has the same permissions as member.
- Display names: "owner" → **Webmaster**, "admin" → **Administrator** (both DE + EN).
- **Protection:** Nobody can change a Webmaster's role. Only Webmaster can change an Administrator's role. Enforced at UI (`canChangeRoleOf()`) and DB (triggers on `user_roles`).
- **Ranks** (cosmetic, on memberships): leader > superior > officer > veteran > soldier > guest.
- Single source of truth: `lib/permissions.ts` (TypeScript) + `has_permission()` SQL function.
- Client-side: `useUserRole()` hook from `lib/hooks/use-user-role.ts`.

### Markdown

- All rendering through `AppMarkdown` with `variant` prop ("cms" or "forum").
- All content sanitized via `sanitizeMarkdown()` before rendering.
- Editing uses `MarkdownEditor` (write/preview tabs, toolbar, image upload).
- Storage buckets: `forum-images`, `message-images`, `bug-screenshots`.

### i18n

- Two locale files: `messages/en.json` + `messages/de.json`.
- Namespaced: `"messagesPage"`, `"forum"`, `"events"`, `"admin"`, `"common"`, etc.
- Components use `useTranslations("namespace")` (client) or `getTranslations("namespace")` (server).

### Styling

- All CSS in `app/styles/` modules imported via `app/globals.css`. Uses CSS custom properties (`--color-gold`, `--color-surface`, etc.).
- No Tailwind utility classes in app code. CSS classes follow BEM-like naming (`.messages-chat-bubble`, `.forum-post-item`).
- Sidebar: 240px expanded, 60px collapsed (CSS variable `--sidebar-width`).
- Use explicit property transitions (never `transition: all`).

### Testing

- **Unit:** Vitest. Colocated as `*.test.ts` in `lib/` and `app/`. Run: `npm run test:unit`.
- **E2E:** Playwright. Files in `tests/`. Run: `npx playwright test`. Projects: chromium, firefox, webkit, mobile-chrome.
- 6 test roles: owner, admin, moderator, editor, member, guest. Pre-authenticated via `storageState`.
- All `.content-inner` locators use `.first()` (pages render 2+ instances via `PageShell`).
- Use `domcontentloaded` + explicit element waits (never `waitForLoadState("networkidle")` — persistent Supabase connections prevent resolution).
- Use `tests/helpers/wait-for-clan-access.ts` for assertions that depend on `ClanAccessGate`.
- API tests accept both expected status codes and 429 as valid responses.
- Tests use regex alternation for i18n text matching (`/erstellen|create/i`).

## 10. UI Conventions

### Button Variants

All action buttons use `GameButton` (`app/components/ui/game-button.tsx`):

| Action               | Variant             | Examples                        |
| -------------------- | ------------------- | ------------------------------- |
| Save / Submit / Send | `green`             | Save changes, submit form       |
| Approve / Confirm    | `turquoise`         | Confirm registration            |
| Delete / Danger      | `orange`            | Delete event, remove report     |
| Primary CTA          | `ornate1`–`ornate3` | New post, reply, retry          |
| Hero CTA             | `hero`              | Register, join                  |
| Cancel / Secondary   | CSS `.button`       | Cancel buttons (not GameButton) |

`ConfirmModal` maps variant to GameButton automatically (info→green, danger→orange). Override with `confirmButtonVariant` prop.

### Admin Icon Conventions

| Action               | Icon                            |
| -------------------- | ------------------------------- |
| Add game account     | `icons_plus_3.png`              |
| Create clan          | `shield_22.png`                 |
| Edit                 | `icons_pen_2.png`               |
| Delete               | `icons_paper_cross_1.png`       |
| Confirm registration | `icons_moderator_add.png`       |
| Save                 | `components_check_box_mark.png` |
| Close                | `icons_close.png`               |

All sidebar nav items use game-asset PNG icons via `vipIcon` prop on `NavItem`. Standard size 22px, large icons 34px (`lgIcon: true`).

### Deep-Link URL Patterns

| Pattern                              | Behavior                       |
| ------------------------------------ | ------------------------------ |
| `/forum?post=<id>`                   | Opens forum post               |
| `/news?article=<id>`                 | Expands and scrolls to article |
| `/events?date=YYYY-MM-DD&event=<id>` | Navigates calendar to event    |
| `/messages?to=<userId>`              | Pre-fills compose recipient    |
| `/messages?tab=notifications`        | Opens notifications tab        |
| `/bugs?report=<id>`                  | Opens specific bug report      |

## 11. Responsive Design

All sidebar/layout responsive rules live in `layout.css`.

- **900px** — Primary breakpoint: sidebar collapses to icon-only strip; `.grid` and `.grid-12` switch to single column; messages panel-toggle pattern; sidebar bottom switches to compact account flyout; hero headings scale; touch targets target ~44px
- **768px** — Tables switch layout; calendar and bugs search go compact
- **720px** — Settings grid to single column
- **640px** — News banner heights; home padding
- **480px** — Forum thumbnails shrink; calendar extra-compact
- **420px** — Notification bell panel becomes fluid

**Messages mobile pattern:** On screens <=900px, `.messages-layout.thread-active` hides the list and shows the thread. A back button navigates via `clearSelection()` from `useMessages`.

## 12. Known Behaviors & Gotchas

### Supabase / RLS

- **Silent delete:** Supabase returns success when RLS blocks a delete. All delete operations chain `.select("id")` and verify `data.length > 0`. Follow this pattern for new deletes.
- **INSERT RLS policies** use `WITH CHECK (...)`, not `USING (...)`. PostgreSQL rejects `USING` on INSERT.
- **Forum comment count:** Maintained by `SECURITY DEFINER` DB triggers, not client-side updates.
- **Forum thread auto-linking:** Creating an event or announcement auto-creates a forum thread. Edit/delete sync handled by DB triggers (bidirectional). Client only handles creation (`lib/forum-thread-sync.ts`).

### Radix Select Scrollbar

`@radix-ui/react-select` injects a runtime `<style>` tag hiding all native scrollbars on `[data-radix-select-viewport]`. Our `!important` overrides in `app/styles/components.css` counter this. If you upgrade `@radix-ui/react-select`, verify the scrollbar still appears.

### Intentional Patterns

- `signOut` uses `window.location.href` (not `router.push`) — full reload clears stale auth state.
- Recurring events store one DB row; occurrences expanded client-side. `recurrence_parent_id` is deprecated.
- Default game account (`profiles.default_game_account_id`) takes priority over `localStorage` in sidebar selector.
- `sanitizeMarkdown()` emphasis-fix regexes use `[^\S\n]+` (horizontal whitespace only) to prevent matching across line boundaries.
- API routes bypass the proxy auth redirect entirely. Each route handles its own auth.
- In-memory rate limiter has per-instance counters (not shared across serverless instances).

### Data Formats

- Date pickers display `dd.mm.yyyy`, stored as `YYYY-MM-DD`.
- Default timestamp display: German format (`dd.MM.yyyy, HH:mm`).

## 13. Environment

```env
NEXT_PUBLIC_SUPABASE_URL=...        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # Supabase anon key (client-safe)
SUPABASE_SERVICE_ROLE_KEY=...       # Service role key (server-only)
TURNSTILE_SECRET_KEY=...            # Optional: Cloudflare CAPTCHA for forgot-password
SENTRY_DSN=...                      # Optional: Sentry error tracking
RESEND_API_KEY=...                  # Optional: bug report email notifications
RESEND_FROM_EMAIL=...               # Optional: verified sender for emails
NEXT_PUBLIC_SITE_URL=...            # Optional: site URL for email links
```

## 14. SQL Migrations

All migrations in `Documentation/migrations/`. Run order documented in `Documentation/runbook.md`.

Key migrations:

| File                               | Purpose                                               |
| ---------------------------------- | ----------------------------------------------------- |
| `messages_v2.sql`                  | Messages + recipients, threading, data migration      |
| `notifications.sql`                | Notifications + user settings                         |
| `forum_tables.sql`                 | Forum categories, posts, comments, votes              |
| `roles_permissions_cleanup.sql`    | Drop legacy tables, new permission functions          |
| `role_change_protection.sql`       | Webmaster/Admin role protection triggers              |
| `bug_reports.sql`                  | Bug report tables, RLS, storage bucket, categories    |
| `bug_reports_v2.sql`               | Comment edit/delete, email notifications              |
| `bug_reports_v3.sql`               | Category slugs for i18n                               |
| `guest_role_permissions.sql`       | Guest promoted to member-level permissions            |
| `drop_chest_data_tables.sql`       | Drops removed feature tables                          |
| `messages_broadcast_targeting.sql` | Broadcast targeting columns, message_reads/dismissals |
