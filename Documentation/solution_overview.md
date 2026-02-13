# Solution Overview — Decisions & Design Rationale

> **Purpose**: Records the design decisions, PRD choices, style guide, and data model rationale. For file locations and system architecture, see `ARCHITECTURE.md`. For current status, see `handoff_summary.md`.

> **Maintenance**: Update this file only when you make new design decisions or change architectural approaches. Add to "Decisions Logged" for new choices. Update "Architecture Decisions" if you change how a cross-cutting concern works. Don't duplicate file paths or feature descriptions — that belongs in `ARCHITECTURE.md`.

## Decisions Logged

- Authentication uses Supabase Auth (email/password) with email verification and password recovery.
- Data import supports Pattern 1 CSV only (DATE, PLAYER, SOURCE, CHEST, SCORE, CLAN).
- Pattern 2 is deprecated and removed from scope.
- Usernames are required and case-insensitive. Display names are optional.
- Admin routes include data import, chest database, and user management.
- Rules tab renamed to **Validation**; **Corrections** added as a first-class admin section.
- Auto-correct runs before validation; both are toggleable in data import.
- Default timestamp display is German format (`dd.MM.yyyy, HH:mm`).
- Validation and correction rules are **global** (not clan-specific).
- Messaging uses email model: one `messages` row per sent message + N `message_recipients` rows. Threading via `thread_id`/`parent_id`. No reply on broadcasts.
- Ranks on `game_account_clan_memberships` are purely cosmetic (reflect in-game rank, no functional impact).
- Event templates share the exact same data model as events. Template "name" = title.
- Recurring events store a single DB row; occurrences computed client-side.
- Forum categories managed via admin API with service role client (bypasses RLS).
- All API routes handle their own authentication (no proxy auth redirect for `/api/` paths).
- `ClanAccessGate` bypasses clan membership checks for `/admin` paths (admin pages have their own auth guards). Locale sync uses `router.refresh()` (not `window.location.reload()`) with a `useRef` guard to prevent repeated syncs.

## Architecture Decisions

- **Frontend**: Next.js App Router, server components by default, client components for interactive features.
- **Auth**: Supabase Auth with PKCE. First-login detection redirects to `/profile`.
- **Backend**: Supabase PostgreSQL with RLS for data isolation. Service role client for operations that bypass RLS.
- **Permissions**: Static TypeScript permission map (`lib/permissions.ts`) mirrored in SQL (`has_permission()` function). No dynamic role/permission tables.
- **Rate limiting**: Custom in-memory sliding window. Each limiter instance gets an isolated store (prevents cross-endpoint contamination). Three tiers: strict (10/min), standard (30/min), relaxed (120/min).
- **Markdown**: Unified system — one renderer (`AppMarkdown`), one sanitizer (`sanitizeMarkdown`), one toolbar (`AppMarkdownToolbar`). Variant prop controls CSS scope ("cms" vs "forum").
- **i18n**: `next-intl` with German and English. All strings in `messages/en.json` + `messages/de.json`.
- **Testing**: Vitest for unit tests (colocated `*.test.ts`), Playwright for E2E (pre-authenticated storageState for 6 roles).
- **Admin panel**: Modular architecture — slim orchestrator with `AdminProvider` context, lazy-loaded tabs via `next/dynamic`.

## Core Data Model

```
user (profiles)
  └── game_accounts (1:N, approval workflow)
        └── game_account_clan_memberships (N:M with clans)
              └── chest_entries (imported data, linked by game_username)

user_roles (1:1 global role per user)
  → permissions derived from lib/permissions.ts static map
```

### Key Relationships

- **User → Game Accounts**: One user can have multiple game accounts (each needs admin approval).
- **Game Account → Clans**: Through `game_account_clan_memberships` (rank is cosmetic).
- **Chest data → Game accounts**: Linked by case-insensitive match: `LOWER(chest_entries.player) = LOWER(game_accounts.game_username)`.
- **Messages**: `messages.sender_id` → `profiles.id`. `message_recipients.recipient_id` → `profiles.id`. Threading via `thread_id` (root) + `parent_id` (direct parent).
- **Notifications**: Reference entity via `reference_id`. Fan-out creates N rows for N recipients.

## MVP Scope

- Public landing, auth, member dashboard.
- Data import + preview (Pattern 1 CSV only).
- Chest database (view/edit/batch) with audit log.
- Admin panel for users/clans/permissions and rule management.
- i18n (de/en) for UI text.

## UI Style Reference — "Fortress Sanctum" Design System

### Theme Direction

- Medieval fantasy "Sanctum" aesthetic: dark backgrounds with gold accents and subtle gradients.
- Panel surfaces use layered cards with gold-tinted borders and rich shadows.
- Collapsible sidebar layout (Discord-like) with icon/text navigation.
- VIP assets integrated for visual richness (custom fonts, decorative images, leather textures).

### Active Palette (CSS Variables)

| Variable | Value | Usage |
| -------- | ----- | ----- |
| `--color-bg` | `#080d14` | Page background |
| `--color-surface` | `rgba(18, 39, 58, 0.7)` | Card/panel backgrounds |
| `--color-surface-solid` | `#12273a` | Opaque surfaces |
| `--color-edge` | `rgba(201, 163, 74, 0.15)` | Gold-tinted borders |
| `--color-gold` | `#c9a34a` | Primary gold |
| `--color-gold-2` | `#e4c778` | Gold highlight |
| `--color-gold-3` | `#f5dda3` | Gold light |
| `--color-gold-dark` | `#8a6d2f` | Gold dark |
| `--color-text` | `#f2e6c9` | Primary text |
| `--color-text-2` | `#b8a888` | Secondary text |
| `--color-text-muted` | `#6b5e4a` | Muted text |
| `--color-accent-red` | `#c94a3a` | Error/danger |
| `--color-accent-green` | `#4a9960` | Success |
| `--color-accent-blue` | `#4a6ea0` | Info/links |

### Fonts

- Headings: `Fontin Sans` (loaded from `/fonts/fontin_sans_cr_sc_regular.otf`)
- Body: `Inter` (Google Fonts)

### UI Treatment Notes

- **Buttons**: gold border + dark gradient fill, hover lifts with gold glow. Primary uses deeper warm gradient.
- **Tabs**: segmented control with gold active state and text-shadow glow.
- **Badges**: round medallion style with gold gradient background.
- **Cards**: dark gradient with gold-tinted border, hover lifts.
- **Tables**: dark gradient header with gold divider, alternating rows.
- **Inputs**: gradient backgrounds with gold-tinted borders, gold focus ring.
- **Selects**: gradient trigger with gold border, dropdown with gold highlights.

## SQL Migration Order

See `Documentation/runbook.md` section 1 for the full migration order. All SQL files in `Documentation/migrations/`.

## Content Security Policy

- `frame-src`: YouTube embeds allowed.
- `media-src`: Any HTTPS source + blob URLs.
- Defined in `next.config.js`.

## Known Behavioral Notes

- Clan context stored in `localStorage`, used by announcements/events/data table.
- Date pickers display `dd.mm.yyyy`, stored as `YYYY-MM-DD`.
- Sidebar: 280px expanded, 60px collapsed.
- All API routes bypass proxy auth redirect and handle their own auth.
- CMS APIs listed in `isPublicPath()` for historical reasons (redundant but kept).
- `ClanAccessGate.isPublicPath()` also includes `/admin` routes — admin users may not have game accounts/clan membership but still need panel access.
- `recurrence_parent_id` column on events is deprecated and dropped in v2 migration.
