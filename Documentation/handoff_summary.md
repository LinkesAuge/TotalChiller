# Handoff Summary

Context transfer for a new chat session. For architecture and file locations, see `ARCHITECTURE.md`. For change history, see `CHANGELOG.md`.

**Removed features (replaced with placeholders):** Data import, chest database viewer, validation rules, correction rules, analytics/charts, and related tables (`chest_entries`, `validation_rules`, `correction_rules`, `scoring_rules`). See `CHANGELOG.md` for details.

## Quick Start

```bash
npm install
cp .env.local.example .env.local   # fill in Supabase keys
npm run dev                         # http://localhost:3000
```

### Required Environment (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
TURNSTILE_SECRET_KEY=...            # optional: CAPTCHA on forgot-password
SENTRY_DSN=...                      # optional: error tracking
RESEND_API_KEY=...                  # optional: bug report email notifications
RESEND_FROM_EMAIL=...               # optional: verified sender for emails
NEXT_PUBLIC_SITE_URL=...            # optional: site URL for email links
```

### Database Setup

Run SQL migrations in the order listed in `Documentation/runbook.md` section 1. All files are in `Documentation/migrations/`.

## Test Suite

### Unit Tests (Vitest) — ~630 tests, 31 files

Run: `npm run test:unit`

| File                                   | Tests | Covers                                                                                                                                                                                                                                                             |
| -------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app/events/events-utils.test.ts`      | 53    | Date/time, recurrence, display helpers                                                                                                                                                                                                                             |
| `lib/permissions.test.ts`              | 45    | Roles, validation, permission helpers, isOwner, canChangeRoleOf, ROLE_LABELS                                                                                                                                                                                       |
| `app/members/members-utils.test.ts`    | 50    | getRoleColor, getRankColor, compareMemberOrder, countRoleSubstitutes, rank/role constants                                                                                                                                                                          |
| `lib/api/validation.test.ts`           | 30    | UUID, notification settings (incl. bugs_email_enabled)                                                                                                                                                                                                             |
| `lib/dashboard-utils.test.ts`          | 25    | Trends, formatting, author extraction                                                                                                                                                                                                                              |
| `lib/messages-schemas.test.ts`         | 23    | SEND_SCHEMA for messages API                                                                                                                                                                                                                                       |
| `lib/forum-categories-schemas.test.ts` | 23    | UUID, category schema validation                                                                                                                                                                                                                                   |
| `lib/fan-out-schema.test.ts`           | 18    | Fan-out notification schema                                                                                                                                                                                                                                        |
| `lib/create-user-schema.test.ts`       | 14    | Admin create-user schema                                                                                                                                                                                                                                           |
| `lib/supabase/error-utils.test.ts`     | 12    | Error classification + i18n keys                                                                                                                                                                                                                                   |
| `lib/rate-limit.test.ts`               | 12    | Rate limiting, IP tracking                                                                                                                                                                                                                                         |
| `lib/markdown/strip-markdown.test.ts`  | 16    | Markdown-to-plain-text stripping (headings, bold, code, links, images, lists, blockquotes)                                                                                                                                                                         |
| Others (19 files)                      | ~334  | check-role, forum-sync, role-access, admin-access, config, date-format, sanitize-markdown, renderers, forum-utils, forum-thumbnail, admin-types, use-sortable, design-system-types, public-paths, validation-helpers, banner-presets, use-pagination, is-test-user |

### E2E Tests (Playwright) — 346 tests, 29 spec files

Run: `npx playwright test`

- Pre-authenticated `storageState` for 6 roles (owner, admin, moderator, editor, member, guest).
- i18n-aware: text assertions use regex alternation for DE/EN.
- Rate-limit tolerant: API tests accept 429 alongside expected status codes.
- Avoid `waitForLoadState("networkidle")` — persistent Supabase connections prevent it from resolving. Use `domcontentloaded` + explicit element waits.
- All `.content-inner` locators must use `.first()` (pages render 2+ via `PageShell`).

## Recently Completed

### Webmaster Role Rename + Role Protection (2026-02-15)

"Eigentümer" / "Owner" role renamed to **Webmaster** (both DE and EN). Internal key remains `owner`. Role change protection enforced at both UI and DB levels:

- Nobody can change or delete the Webmaster's role.
- Only the Webmaster can change or delete an Administrator's role.
- Admins can still manage roles of moderator and below.

On the members page, Webmaster/Administrator with no in-game rank show their role name as a rank substitute (sorted after "Vorgesetzter", before "Offizier"). Rank stats bar includes Webmaster (red) and Administrator (gold) chips with distinct colours.

**Key files:** `lib/permissions.ts` (new `isOwner()`, `canChangeRoleOf()`), `app/admin/admin-context.tsx` (`currentUserRole`), `app/admin/tabs/users-tab.tsx` (disabled dropdown + save guard), `app/members/members-client.tsx` (rank fallback, chips, sorting), `app/components/sidebar-shell.tsx` (status line).
**DB migration:** `Documentation/migrations/role_change_protection.sql` — `is_owner()` helper, UPDATE + DELETE triggers on `user_roles`.

### Markdown Editing for Bug Reports (2026-02-15)

Report descriptions and comments now use the same `MarkdownEditor` component as events, news, and messages. This provides write/preview tabs, a full formatting toolbar (bold, italic, headings, links, code blocks, etc.), and image paste/drop/upload. Stored content renders as markdown via `AppMarkdown`. Inline images upload to the `bug-screenshots` Supabase storage bucket.

**Key files:** `bugs-form.tsx` (description uses `MarkdownEditor`), `bugs-detail.tsx` (renders description with `AppMarkdown`), `bugs-comments.tsx` (add + edit comment forms use `MarkdownEditor`, bodies rendered with `AppMarkdown`), `radix-select.tsx` (inline `maxHeight` + `overflowY` on Content and Viewport), `app/styles/components.css` (scrollbar `!important` overrides to defeat Radix's injected style tag).

### Bug Report Category i18n + Page Selector (2026-02-15)

Categories now translated via `slug` column + `bugs.categories.<slug>` i18n keys. Custom admin-created categories fall back to raw name. Page URL field replaced with dropdown of known site pages + "Custom URL" option. All labels i18n-aware (EN + DE). Admin controls also use translated status/priority labels.

**DB migration:** `bug_reports_v3.sql` (adds `slug` column to categories).
**Key files:** `bugs-form.tsx` (page dropdown), `bugs-list.tsx`/`bugs-detail.tsx`/`bugs-admin-controls.tsx` (translated categories), `domain.ts`/`bugs-types.ts` (new `slug`/`category_slug` fields), `en.json`/`de.json` (new `categories.*` and `pages.*` sections).

### Bug Report List Redesign + Pagination (2026-02-15)

Report list view overhauled: each report is a card (not a table row) showing status/priority badges, description preview, reporter, date, category, comment/screenshot counts. Toolbar (filters + search/sort) is a separate card above the list, with the search field constrained to 260px and grouped with the sort dropdown. Pagination added using `usePagination` + `PaginationBar` (default 15 per page, compact mode).

**Key files:** `app/bugs/bugs-list.tsx` (rewritten), `app/bugs/bugs-client.tsx` (adjusted DataState usage), `app/styles/bugs.css` (new card grid, toolbar, empty state classes).

### Guest Role + Rank (2026-02-15)

Guest role now has the same permissions as member. Guest is selectable in the admin user role dropdown (EN: "Guest", DE: "Gast").

New "guest" rank added below soldier. On the members page, guests appear as the last category with a purple badge. When an admin creates a game account for a guest-role user, the rank defaults to "guest".

**Key files:** `lib/permissions.ts`, `app/admin/admin-types.ts`, `app/admin/tabs/users-tab.tsx`, `app/members/members-client.tsx`.
**DB migration:** `Documentation/migrations/guest_role_permissions.sql` — updates `has_permission()` SQL function.

### Bug Report / Ticket System (2026-02-15)

Full bug reporting system with dedicated `/bugs` page and floating quick-report widget.

**What's included:**

- Dedicated `/bugs` page with list view (filters, search, sort) and detail view (screenshots, comments, admin controls).
- Floating widget button (bottom-right) on every page — auto-captures current URL, opens compact report form. Hidden on `/bugs` and for unauthenticated users.
- Markdown editing for descriptions and comments — uses shared `MarkdownEditor` component (write/preview tabs, formatting toolbar, image paste/drop/upload).
- Screenshot uploads: up to 5 images per report (JPEG, PNG, GIF, WebP; max 5 MB each), stored in Supabase Storage `bug-screenshots` bucket.
- Workflow: Open → Resolved → Closed. Priority (low/medium/high/critical) set by admins only.
- Threaded comments with author display names. Reporters receive notifications when someone comments.
- Admin-managed categories (Bug, Feature Request, UI Issue, Data Problem, Other) with full CRUD via API.
- Sidebar navigation link added to the "Main Menu" section.

**Edit/delete:** Reports can be edited (title, description, category, page URL) and deleted by the author or admins. Comments have inline edit/delete (same pattern as forum). `ConfirmModal` for report deletion. New API: `DELETE /api/bugs/[id]`, `PATCH/DELETE /api/bugs/[id]/comments/[commentId]`.

**Email notifications:** Admins (owner/admin only) can opt in to receive email when a new report is submitted. Toggle in Settings → Notifications ("Bug report email", off by default) — hidden for non-admin users. The API silently ignores `bugs_email_enabled` from non-admins, and the email fan-out only queries owner/admin roles. Sent via Resend API using `lib/email/send-email.ts` (no npm dependency — raw `fetch`). Requires `RESEND_API_KEY` + `RESEND_FROM_EMAIL` env vars; silently skipped if not configured.

**Key files:** `app/bugs/` (7 components + 2 hooks + types), `app/components/bug-report-widget.tsx`, `app/api/bugs/` (6 route files), `lib/email/` (2 files), `app/styles/bugs.css`.

**DB migrations:** `Documentation/migrations/bug_reports.sql` + `bug_reports_v2.sql` (adds `updated_at` to comments, `bugs_email_enabled` to settings, edit/delete RLS policies).

**Permissions added:** `bug:create` and `bug:comment` for guest, member, editor, and moderator roles (`lib/permissions.ts`).

**i18n:** Full English and German translations in `messages/en.json` and `messages/de.json` under the `"bugs"` namespace.

**Layout:** Uses standard `PageShell` with hero banner (`banner_gold_dragon.png`), `AuthActions` profile widget in top bar. Action buttons (New Report / Back) render inside the content area, not the top bar. List view features status, priority, and category filter dropdowns, a search field, and a sort dropdown (newest/oldest/title/priority/status). Sorting is client-side via `useMemo` in `use-bugs.ts`.

### Codebase Audit (2026-02-16)

Comprehensive audit covering security, bugs, performance, code quality, and accessibility. Key changes:

- **Deleted** `/redesign` pages and all exclusive references (public paths, robots.txt, ESLint override, playwright script).
- **Security**: SVG XSS blocked in markdown URLs, LIKE injection fixed in game-accounts, auth-before-parse in admin routes, email validation in sendEmail, CAPTCHA fails in production when unconfigured, reporter emails no longer exposed in bugs API.
- **Bugs**: Banner filename typo fixed (`exhange` -> `exchange`), `statsError` exposed in dashboard hook, hardcoded German strings replaced with i18n.
- **Performance**: Sidebar nav inline object extracted to constant, `loading.tsx` added for `/bugs`.
- **Quality**: Unguarded `console.warn` removed, "Internal server error" punctuation standardized across all API routes.
- **Config**: `no-console` ESLint rule added, `audit:deps` npm script added, CSP `unsafe-inline` documented.
- **Accessibility**: Descriptive alt text on event banners, forum thumbnails, and banner picker.
- **Review fixes**: Stale `statsError` cleared when `clanId` becomes falsy; `tCommon` added to `useCallback` deps in `useSiteContent`; indentation fixed.

**Remaining follow-ups**: Migrate ~130 API error responses from `NextResponse.json({ error })` to shared `apiError()` helper. Split large admin tab components (users-tab ~1270 lines, clans-tab ~1370 lines). Centralize inline Zod schemas into `validation.ts`. Full DE/EN translation key parity audit.

## Pending Tasks

### Navigation Icons (Medieval Theme)

Dashboard and Home share the same SVG icon — dashboard needs a distinct one.

~260 game-style PNG icons available in `/assets/game/icons/`. The `NavItemIcon` component already supports both SVG (`ICONS[key]`) and PNG (`vipIcon` prop).

**Steps**: Browse icons, pick one per nav item, update `sidebar-nav.tsx`, test at both sidebar widths (280px/60px).

| Nav Item  | Suggested Icon   | Path                                                            |
| --------- | ---------------- | --------------------------------------------------------------- |
| Home      | Medieval house   | `/assets/game/icons/icons_card_house_1.png`                     |
| Dashboard | Rating/stats     | `/assets/game/icons/icons_main_menu_rating_1.png`               |
| News      | Scroll           | `/assets/game/icons/icons_scroll_1.png`                         |
| Analytics | Points clipboard | `/assets/game/icons/icons_clip_points_1.png` (placeholder page) |
| Events    | Events banner    | `/assets/game/icons/icons_events_1.png`                         |
| Forum     | Message bubble   | `/assets/game/icons/icons_message_1.png`                        |
| Messages  | Envelope         | `/assets/game/icons/icons_envelope_1.png`                       |
| Members   | Clan menu        | `/assets/game/icons/icons_main_menu_clan_1.png`                 |
| Bugs      | Bug/warning      | _(SVG inline — already implemented)_                            |

### Other

- Forum could use PostgREST joins for author names (FK constraints added, client migration pending).

## Known Behaviors & Gotchas

### Supabase / RLS

- **Silent delete**: Supabase returns success when RLS blocks a delete. All delete operations chain `.select("id")` and verify `data.length > 0`. Follow this pattern for any new deletes.
- **Enable RLS on `clans` table**: `ALTER TABLE public.clans ENABLE ROW LEVEL SECURITY;` — policies exist but RLS was never enabled on some older setups.
- **Forum comment count**: Maintained by `SECURITY DEFINER` DB triggers, not client-side updates. Client-side count changes would be blocked by RLS.
- **Forum thread auto-linking**: Creating an event or announcement auto-creates a forum thread. Edit and delete sync handled by `SECURITY DEFINER` DB triggers (bidirectional). Client code only handles creation (`lib/forum-thread-sync.ts`).
- **INSERT RLS policies**: Use `WITH CHECK (...)`, not `USING (...)`. PostgreSQL rejects `USING` on INSERT policies. Bug report migration hit this — fixed with `WITH CHECK (true)`.

### Data Formats

- Date pickers display `dd.mm.yyyy`, stored as `YYYY-MM-DD`. Default timestamp display: German format (`dd.MM.yyyy, HH:mm`).

### Radix Select Scrollbar

`@radix-ui/react-select@2.2.6` injects a runtime `<style>` tag that forcibly hides all native scrollbars on the viewport element:

```css
[data-radix-select-viewport] {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
[data-radix-select-viewport]::-webkit-scrollbar {
  display: none;
}
```

Radix expects developers to use `Select.ScrollUpButton` / `Select.ScrollDownButton` instead. We override this with `!important` rules in `app/styles/components.css` to show a visible custom scrollbar. If you upgrade `@radix-ui/react-select`, verify the scrollbar still appears -- the injected style may change between versions.

### Intentional Patterns

- `signOut` uses `window.location.href` (not `router.push`) — full reload clears stale auth state.
- Recurring events store one DB row; occurrences are expanded client-side. `recurrence_parent_id` column is deprecated.
- Default game account (`profiles.default_game_account_id`) takes priority over `localStorage` in sidebar selector.
- `sanitizeMarkdown()` emphasis-fix regexes use `[^\S\n]+` (horizontal whitespace only), not `\s+` — prevents matching across line boundaries.
- API routes bypass the proxy auth redirect entirely. Each route handles its own authentication.
- In-memory rate limiter has per-instance counters — not shared across serverless instances.

### Deep-Link URL Patterns

| Pattern                              | Behavior                             |
| ------------------------------------ | ------------------------------------ |
| `/forum?post=<id>`                   | Opens forum post directly            |
| `/news?article=<id>`                 | Expands and scrolls to article       |
| `/events?date=YYYY-MM-DD&event=<id>` | Navigates calendar, highlights event |
| `/messages?to=<userId>`              | Pre-fills compose recipient          |
| `/messages?tab=notifications`        | Opens notifications tab              |
| `/bugs?report=<id>`                  | Opens specific bug report            |

## Responsive / Mobile

- Primary breakpoint at **900px**: sidebar collapses, `.grid` switches to single column, messages page uses panel-toggle pattern
- Sidebar on compact viewport: forum category sub-items are hidden; bottom controls use a single avatar trigger that opens a fixed account flyout (profile/messages/settings/sign out + DE/EN toggle)
- Messages page on mobile: inbox list and thread panel toggle via `.thread-active` class; "Back to list" button navigates back via `clearSelection()` from `useMessages` hook
- Touch targets: action buttons and delete buttons enlarge on touch devices (`@media (hover: none)`)
- Notification bell panel fluid-width on small screens (<420px)
