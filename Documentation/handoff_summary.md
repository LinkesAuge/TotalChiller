# Handoff Summary

Context transfer for a new chat session. For architecture and file locations, see `ARCHITECTURE.md`. For change history, see `CHANGELOG.md`.

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
```

### Database Setup

Run SQL migrations in the order listed in `Documentation/runbook.md` section 1. All files are in `Documentation/migrations/`.

## Test Suite

### Unit Tests (Vitest) — 596 tests, 30 files

Run: `npm run test:unit`

| File                                   | Tests | Covers                                                                                                                                                                                                                                                                                   |
| -------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/events/events-utils.test.ts`      | 53    | Date/time, recurrence, display helpers                                                                                                                                                                                                                                                   |
| `lib/permissions.test.ts`              | 35    | Roles, validation, permission helpers                                                                                                                                                                                                                                                    |
| `lib/api/validation.test.ts`           | 26    | UUID, notification settings, chart query schemas                                                                                                                                                                                                                                         |
| `lib/dashboard-utils.test.ts`          | 25    | Trends, formatting, author extraction                                                                                                                                                                                                                                                    |
| `lib/messages-schemas.test.ts`         | 23    | SEND_SCHEMA for messages API                                                                                                                                                                                                                                                             |
| `lib/forum-categories-schemas.test.ts` | 23    | UUID, category schema validation                                                                                                                                                                                                                                                         |
| `lib/correction-applicator.test.ts`    | 21    | Correction rule application                                                                                                                                                                                                                                                              |
| `lib/fan-out-schema.test.ts`           | 18    | Fan-out notification schema                                                                                                                                                                                                                                                              |
| `lib/create-user-schema.test.ts`       | 14    | Admin create-user schema                                                                                                                                                                                                                                                                 |
| `lib/supabase/error-utils.test.ts`     | 12    | Error classification + i18n keys                                                                                                                                                                                                                                                         |
| `lib/rate-limit.test.ts`               | 12    | Rate limiting, IP tracking                                                                                                                                                                                                                                                               |
| Others (19 files)                      | ~334  | check-role, forum-sync, role-access, admin-access, config, date-format, sanitize-markdown, renderers, validation-evaluator, forum-utils, forum-thumbnail, admin-types, use-sortable, design-system-types, public-paths, validation-helpers, banner-presets, use-pagination, is-test-user |

### E2E Tests (Playwright) — ~270 tests, 28 spec files

Run: `npx playwright test`

- Pre-authenticated `storageState` for 6 roles (owner, admin, moderator, editor, member, guest).
- i18n-aware: text assertions use regex alternation for DE/EN.
- Rate-limit tolerant: API tests accept 429 alongside expected status codes.
- Avoid `waitForLoadState("networkidle")` — persistent Supabase connections prevent it from resolving. Use `domcontentloaded` + explicit element waits.
- All `.content-inner` locators must use `.first()` (pages render 2+ via `PageShell`).

## Pending Tasks

### Navigation Icons (Medieval Theme)

Dashboard and Home share the same SVG icon — dashboard needs a distinct one.

~260 game-style PNG icons available in `/assets/game/icons/`. The `NavItemIcon` component already supports both SVG (`ICONS[key]`) and PNG (`vipIcon` prop).

**Steps**: Browse icons, pick one per nav item, update `sidebar-nav.tsx`, test at both sidebar widths (280px/60px).

| Nav Item  | Suggested Icon   | Path                                              |
| --------- | ---------------- | ------------------------------------------------- |
| Home      | Medieval house   | `/assets/game/icons/icons_card_house_1.png`       |
| Dashboard | Rating/stats     | `/assets/game/icons/icons_main_menu_rating_1.png` |
| News      | Scroll           | `/assets/game/icons/icons_scroll_1.png`           |
| Charts    | Points clipboard | `/assets/game/icons/icons_clip_points_1.png`      |
| Events    | Events banner    | `/assets/game/icons/icons_events_1.png`           |
| Forum     | Message bubble   | `/assets/game/icons/icons_message_1.png`          |
| Messages  | Envelope         | `/assets/game/icons/icons_envelope_1.png`         |
| Members   | Clan menu        | `/assets/game/icons/icons_main_menu_clan_1.png`   |

### Other

- Forum could use PostgREST joins for author names (FK constraints added, client migration pending).

## Known Behaviors & Gotchas

### Supabase / RLS

- **Silent delete**: Supabase returns success when RLS blocks a delete. All delete operations chain `.select("id")` and verify `data.length > 0`. Follow this pattern for any new deletes.
- **Enable RLS on `clans` table**: `ALTER TABLE public.clans ENABLE ROW LEVEL SECURITY;` — policies exist but RLS was never enabled on some older setups.
- **Forum comment count**: Maintained by `SECURITY DEFINER` DB triggers, not client-side updates. Client-side count changes would be blocked by RLS.
- **Forum thread auto-linking**: Creating an event or announcement auto-creates a forum thread. Edit and delete sync handled by `SECURITY DEFINER` DB triggers (bidirectional). Client code only handles creation (`lib/forum-thread-sync.ts`).

### Data Formats

- Date pickers display `dd.mm.yyyy`, stored as `YYYY-MM-DD`. Default timestamp display: German format (`dd.MM.yyyy, HH:mm`).
- Data import accepts Pattern 1 CSV only: `DATE, PLAYER, SOURCE, CHEST, SCORE, CLAN`.
- Charts personal score relies on case-insensitive match: `LOWER(chest_entries.player) = LOWER(game_accounts.game_username)`.

### Intentional Patterns

- `signOut` uses `window.location.href` (not `router.push`) — full reload clears stale auth state.
- Recurring events store one DB row; occurrences are expanded client-side. `recurrence_parent_id` column is deprecated.
- Validation and correction rules are global (not clan-scoped). `clan_id` is nullable.
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
