# Documentation Restructure Design

**Date**: 2026-02-12
**Goal**: Optimize project documentation for AI agent consumption using a "guided navigation" approach.

## Problem

The documentation consisted of two large files (`handoff_summary.md` at 573 lines, `solution_overview.md` at 459 lines) that mixed changelog history, architecture descriptions, file locations, and behavioral notes in chronological order. This caused:

1. **Slow context loading**: AI agents spent tokens parsing history to find architecture info.
2. **Scattered information**: Related info about a feature (e.g., messaging) appeared in 4+ places across both files.
3. **Duplication**: Both files described the same systems (messaging, forum, events, etc.).
4. **Staleness risk**: Detailed prose descriptions duplicate what the code already says.

## Approach: Guided Navigation

The documentation acts as a **map** pointing to where things live, without duplicating what the code already says. The agent reads the map, then reads the actual code. Priorities: lookup speed, low staleness risk, clear separation of concerns.

## New Structure

### `handoff_summary.md` — Session Briefing (~60 lines)

- What this project is (3 lines)
- Current branch
- Recent changes (last 1-2 sessions only)
- Known issues / pending work
- Environment setup + quick commands
- Links to other docs

**Rule**: When a new session adds changes, old "recent changes" move to CHANGELOG.md.

### `ARCHITECTURE.md` — System Map (~350 lines)

- Tech stack table
- Directory tree with one-line descriptions
- Feature modules (11 sections): 2-3 sentence description + file table + DB tables + key patterns
- Shared components index
- Shared libraries index
- API route index (method, auth, rate limit, purpose)
- Database table index
- Conventions & patterns (API, client, permissions, markdown, messaging, i18n, testing, styling)
- Environment variables
- SQL migrations

**Rule**: Describes structure and patterns, not implementation details. Points to files, doesn't reproduce their content.

### `CHANGELOG.md` — Historical Record

- All changelog entries from old handoff_summary.md, organized newest-first by date.
- Grows over time, rarely read. Only consulted for "when did we change X?"

### `solution_overview.md` — Decisions & Rationale (~140 lines)

- Trimmed from 459 lines to ~140.
- Keeps: PRD decisions, architecture decisions, core data model, MVP scope, UI style guide (palette, fonts, treatments), behavioral notes.
- Removes: Feature descriptions (now in ARCHITECTURE.md), file listings (now in ARCHITECTURE.md), duplicate sections.

## Migration

1. Created `ARCHITECTURE.md` from scratch using codebase exploration.
2. Extracted all chronological entries from `handoff_summary.md` into `CHANGELOG.md`.
3. Rewrote `handoff_summary.md` as slim briefing.
4. Trimmed `solution_overview.md` to decisions/rationale only.

## AI Agent Reading Order

1. `handoff_summary.md` — "What's the current state?" (always read first, per user rule)
2. `ARCHITECTURE.md` — "Where is the code for X?" (read when working on features)
3. `solution_overview.md` — "Why was it built this way?" (read when making design decisions)
4. `CHANGELOG.md` — "What changed and when?" (read only when asked about history)
