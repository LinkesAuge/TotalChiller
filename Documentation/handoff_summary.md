# Handoff Summary

> **Read this first.** Slim briefing on project status for a new AI agent or developer session.
> For system architecture and file locations, see `ARCHITECTURE.md`.
> For historical changes, see `CHANGELOG.md`.
> For design decisions and rationale, see `solution_overview.md`.

## Maintenance Rules (for AI agents)

When you finish a work session, update these docs:

1. **This file**: Update "Recent Changes" with what you did. Move old entries to `CHANGELOG.md` if this file exceeds ~80 lines. Update "Known Issues" and "Pending Work" as needed.
2. **`ARCHITECTURE.md`**: Update if you added/removed/moved files, API routes, DB tables, or changed patterns. This is a structural map — keep it accurate.
3. **`CHANGELOG.md`**: Add a dated entry for significant work (new features, refactors, bug fixes). Don't log trivial changes.
4. **`solution_overview.md`**: Update only if you made new design decisions or changed architectural approaches.

**Keep it lean**: describe *what* and *where*, not *how*. Point to code files instead of reproducing their content.

## What This Project Is

**[THC] Chiller & Killer** — A Next.js + Supabase clan management platform for a Total Battle gaming community. Medieval dark theme ("Fortress Sanctum"). Features: messaging, forum, events, announcements, chest data analytics, member directory, admin panel. German/English i18n.

## Current Branch

`main` (production)

## Recent Changes (Feb 12, 2026)

- **Messaging system v2**: Complete redesign from flat model to email-style with `messages` + `message_recipients` tables, Gmail-style threading, clean outbox, broadcast support.
- **Messaging audit & refactor**: Fixed critical rate limiter bug (shared global store), parallelized API queries, improved error handling across all routes, replaced duplicated editor code with shared `MarkdownEditor`, added `useMemo` for profile map merging.
- **Documentation restructure**: Split monolithic docs into `ARCHITECTURE.md` (system map), `CHANGELOG.md` (history), slim `handoff_summary.md` (this file), and trimmed `solution_overview.md` (decisions only). Optimized for AI agent consumption.
- **Test suite**: 223 Vitest unit tests (13 files) + ~250 Playwright E2E tests (27 files). All passing.

## Known Issues

- Navigation icons are placeholder SVGs; medieval game-asset icons prepared but not yet integrated. Preview at `/icon-preview.html`. Full task list and icon mapping in `CHANGELOG.md` under "Pending — Navigation Icons".
- Forum author names still use client-side resolution (FK constraints exist, code migration pending).
- No real-time updates for messages or notifications (polling only).

## Pending Work / Next Steps

- **Icon overhaul**: Review `/icon-preview.html`, pick icons, update `sidebar-nav.tsx`. See `CHANGELOG.md` "Pending — Navigation Icons" for full task list + icon mapping.
- **Forum PostgREST joins**: Migrate forum to use embedded joins for author names (FK constraints already added).
- **WebSocket notifications**: Replace 60s polling with real-time.

## Environment Setup

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
TURNSTILE_SECRET_KEY=...          # Optional: CAPTCHA for forgot-password
SENTRY_DSN=...                    # Optional: error tracking
```

## Quick Commands

```bash
npm run dev              # Start dev server
npm run build            # Production build
npm run test:unit        # Vitest unit tests (223 tests)
npx playwright test      # E2E tests (~250 tests)
npm run lint             # ESLint
```

## Key Documentation Files

| File | Purpose |
| ---- | ------- |
| `Documentation/ARCHITECTURE.md` | System map — where everything lives, how it connects |
| `Documentation/CHANGELOG.md` | Full history of all changes |
| `Documentation/solution_overview.md` | Design decisions, PRD, style guide, data model |
| `Documentation/runbook.md` | Setup, deployment, troubleshooting |
| `Documentation/migrations/` | SQL migration files (run order in runbook) |
| `Documentation/plans/` | Design documents for major features |
