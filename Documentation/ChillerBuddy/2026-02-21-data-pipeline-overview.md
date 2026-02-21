# Data Pipeline: ChillerBuddy → TotalChiller Website

> Design Date: 2026-02-21
> Status: WEB Phases 1–4 COMPLETE — Next: CB Phase 3 (Website Connection) + CB Phase 4 (Validation Sync)

## Goal

Connect the ChillerBuddy Electron desktop app to the TotalChiller website so that
OCR-extracted game data (chests, members, events) can flow into the website's
Supabase database — either via file export/import or via direct API push.

All incoming data enters a **staging layer** first. A reviewer on the website
inspects each _submission_ (a grouped batch of records) and approves, rejects, or
partially approves it before the data is promoted to production tables.

Validation/correction lists (OCR name mappings) are synchronised bidirectionally
between the desktop app and the website.

## Two Delivery Approaches

| #   | Name                     | Transport                                                             | Auth Required in App?                       |
| --- | ------------------------ | --------------------------------------------------------------------- | ------------------------------------------- |
| 1   | **File Export / Import** | User exports a JSON file from ChillerBuddy, uploads it on the website | No (website login only)                     |
| 3   | **API Push**             | ChillerBuddy POSTs to the website API over HTTPS                      | Yes (Supabase email/password stored in app) |

Both approaches produce the **same JSON payload** and hit the **same API routes**
on the website (Approach 1 uploads the file, the website parses it and calls the
same import logic).

## Shared Export Format (v1)

```jsonc
{
  "version": 1,
  "exportedAt": "2026-02-21T14:30:00Z",
  "source": "ChillerBuddy v1.2.0",
  "clan": {
    "localClanId": "local-uuid", // ChillerBuddy's local clan ID
    "name": "Chiller & Killer", // local clan name
    "websiteClanId": "uuid-or-null", // linked website clan UUID; null if unlinked
  },
  "data": {
    // Each section is optional — include only what the user is exporting.
    // One file may contain multiple types; the website creates separate
    // submissions per type present.

    "chests": [
      {
        "chestName": "Elegant Chest",
        "playerName": "Strategus",
        "source": "Level 25 Crypt",
        "level": "25",
        "openedAt": "2026-02-21T14:00:00Z",
      },
    ],
    "members": [
      {
        "playerName": "Strategus",
        "coordinates": "123:456",
        "score": 1500000,
        "capturedAt": "2026-02-21T14:30:00Z",
      },
    ],
    "events": [
      {
        "playerName": "Strategus",
        "eventPoints": 42000,
        "eventName": "Dragon Hunt",
        "capturedAt": "2026-02-21T14:30:00Z",
      },
    ],
  },
  "validationLists": {
    "knownPlayerNames": ["Strategus", "DragonSlayer"],
    "knownChestNames": ["Elegant Chest", "War Chest"],
    "knownSources": ["Level 25 Crypt", "Clan War"],
    "corrections": {
      "player": { "Stratequs": "Strategus" },
      "chest": { "Eleqant Chest": "Elegant Chest" },
      "source": {},
    },
  },
}
```

### Format Rules

- `version` — integer, must be `1`. Future versions increment this.
- `exportedAt` — ISO-8601 UTC timestamp.
- `clan.localClanId` — the local clan ID within ChillerBuddy (always present).
- `clan.name` — the local clan's display name.
- `clan.websiteClanId` — the linked website clan UUID. Present when the local
  clan has been linked to a website clan. Null for unlinked clans or file
  exports from users who haven't connected. The website import page presents a
  clan selector as fallback when this is null.
- Each array under `data.*` can be empty or omitted.
- `validationLists` is optional — included only if the user opts in.
- Timestamps (`openedAt`, `capturedAt`) are ISO-8601 UTC.

## Data Types Summary

### Chests

| Field      | Type     | Description                                       |
| ---------- | -------- | ------------------------------------------------- |
| chestName  | string   | Name of the chest (e.g. "Elegant Chest")          |
| playerName | string   | OCR-extracted player name who sent the chest      |
| source     | string   | Where the chest came from (e.g. "Level 25 Crypt") |
| level      | string?  | Parsed level number (may be absent)               |
| openedAt   | ISO-8601 | When the chest was opened in-game                 |

### Members (Snapshot)

| Field       | Type     | Description                          |
| ----------- | -------- | ------------------------------------ |
| playerName  | string   | OCR-extracted player name            |
| coordinates | string?  | In-game coordinates (e.g. "123:456") |
| score       | number   | Player power / Macht score           |
| capturedAt  | ISO-8601 | When this snapshot was taken         |

### Events (Snapshot)

| Field       | Type     | Description                       |
| ----------- | -------- | --------------------------------- |
| playerName  | string   | OCR-extracted player name         |
| eventPoints | number   | Points scored in the event        |
| eventName   | string?  | Name of the event (if detectable) |
| capturedAt  | ISO-8601 | When this snapshot was taken      |

### Validation Lists

| Field              | Type                   | Description                    |
| ------------------ | ---------------------- | ------------------------------ |
| knownPlayerNames   | string[]               | Confirmed correct player names |
| knownChestNames    | string[]               | Confirmed correct chest names  |
| knownSources       | string[]               | Confirmed correct source names |
| corrections.player | Record<string, string> | OCR text → correct player name |
| corrections.chest  | Record<string, string> | OCR text → correct chest name  |
| corrections.source | Record<string, string> | OCR text → correct source name |

## Submission Pipeline

```
ChillerBuddy ──[JSON]──► Website API / Import Page
                              │
                    ┌─────────▼──────────┐
                    │   STAGING LAYER    │
                    │                    │
                    │ data_submissions   │  ← one row per upload action per type
                    │ staged_*_entries   │  ← individual records
                    │                    │
                    │ status: pending    │
                    └────────┬───────────┘
                             │
                    Website Review UI
                    (match players, approve/reject)
                             │
                    ┌────────▼───────────┐
                    │ PRODUCTION LAYER   │
                    │                    │
                    │ chest_entries      │
                    │ member_snapshots   │
                    │ event_results      │
                    └────────────────────┘
```

### Submission Rules

1. One export file containing multiple data types creates **separate submissions**
   per type (up to 3).
2. Each submission has a status: `pending` → `approved` | `rejected` | `partial`.
3. Individual items within a submission also have a status.
4. Only `approved` items are copied to production tables on review.
5. Staging data references back to the submission for grouping.
6. Production data references back to the submission for traceability.

### Deduplication

On submission creation, the server checks for overlapping records:

- **Chests:** match on (clan_id, player_name, chest_name, opened_at). If >80%
  of incoming rows match existing staged or production rows, warn the reviewer.
- **Members/Events:** snapshots are inherently time-series, but identical
  (clan_id, player_name, captured_at) within a short window (e.g. 5 min) are
  flagged as potential duplicates.

### Player Auto-Matching

On submission, the server attempts to match each `playerName` to a
`game_accounts.game_username` in the target clan:

- Case-insensitive exact match → `auto_matched`
- Known correction in `ocr_corrections` table → `auto_matched` (via corrected name)
- No match → `pending` (reviewer handles manually)

## Implementation Sequence

The pipeline is built across two codebases (ChillerBuddy desktop app and
TotalChiller website) by **different agents**. The work is sequenced to
minimise blocking dependencies and maximise testability.

```
 ChillerBuddy (desktop)              TotalChiller (website)
 ──────────────────────              ──────────────────────
 CB Phase 1: Clan Management
 CB Phase 2: Export Format
        │
        │  produces test JSON files
        ▼
 ═══════════════════════════ HANDOFF POINT ════════════════════════
        │
        │  test files + this design doc
        ▼
                                     WEB Phase 1: Database migrations
                                     WEB Phase 2: API routes
                                     WEB Phase 3: Review UI + Import page
                                     WEB Phase 4: TypeScript types
        │
        │  website API is live
        ▼
 ═══════════════════════════ RESUME POINT ════════════════════════
        │
 CB Phase 3: Website Connection
 CB Phase 4: Validation List Sync
```

### Phase Details

| Phase           | Codebase     | Depends On       | Delivers                                                                       | Status            |
| --------------- | ------------ | ---------------- | ------------------------------------------------------------------------------ | ----------------- |
| **CB Phase 1**  | ChillerBuddy | Nothing          | Local clan management, per-clan validation lists, clan-tagged captures/history | ✅ Complete       |
| **CB Phase 2**  | ChillerBuddy | CB Phase 1       | Export payload builder, export dialog UI, JSON test fixtures                   | ✅ Complete       |
| ---             | ---          | **HANDOFF**      | _Switch to website agent. Provide test JSON files from CB Phase 2._            | ✅ Done           |
| **WEB Phase 1** | TotalChiller | Design docs only | Database tables (staging + production + validation), RLS policies              | ✅ Complete       |
| **WEB Phase 2** | TotalChiller | WEB Phase 1      | All API routes (`/api/import/*`), Bearer token auth                            | ✅ Complete       |
| **WEB Phase 3** | TotalChiller | WEB Phase 2      | Submissions list, detail, review UI, file import page                          | ✅ Complete       |
| **WEB Phase 4** | TotalChiller | WEB Phase 1      | TypeScript types for all new tables and API contracts                          | ✅ Complete       |
| ---             | ---          | **RESUME**       | _Switch back to ChillerBuddy agent. Website API is ready._                     | **← WE ARE HERE** |
| **CB Phase 3**  | ChillerBuddy | Website API live | Website connection settings, auth, API push, clan linking                      | ⬜ Not started    |
| **CB Phase 4**  | ChillerBuddy | CB Phase 3       | Bidirectional validation list sync                                             | ⬜ Not started    |

### When to Switch

**HANDOFF (ChillerBuddy → Website):** After CB Phase 2 is complete. The signal
is: the export dialog can produce valid JSON files in the shared format, and
there are sample export files available as test fixtures. The website agent
receives this overview doc plus the website-specific doc plus the test files.

**RESUME (Website → ChillerBuddy):** After WEB Phase 2 is complete (API routes
are functional). The website UI (WEB Phase 3) can continue in parallel with
CB Phases 3+4 if desired, since ChillerBuddy only depends on the API routes,
not the UI.

## Edge Cases & Mitigations

| Edge Case                                                | Mitigation                                                                                                                                                                                                        |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Same data uploaded twice                                 | Dedup detection + reviewer warning                                                                                                                                                                                |
| Player has no game_account on website                    | Allow approval without match; `matched_game_account_id` stays null                                                                                                                                                |
| File import without websiteClanId                        | Website import page shows clan selector                                                                                                                                                                           |
| Payload > 1 MB (Next.js default)                         | Increase body size limit on import routes                                                                                                                                                                         |
| Supabase token expires during API push                   | Electron client handles refresh / re-auth                                                                                                                                                                         |
| Correction conflict (desktop says A→B, website says A→C) | Last-write-wins with timestamp; reviewer can override                                                                                                                                                             |
| Concurrent reviewers on same submission                  | Optimistic locking via `updated_at` check                                                                                                                                                                         |
| Validation list is global in app but per-clan on website | Clans are local in ChillerBuddy, each with its own validation lists. Existing global lists migrate to the default clan on upgrade. When a local clan is linked to a website clan, lists can sync bidirectionally. |
| Partial Zod validation failure                           | Reject entire submission; return all validation errors so sender can fix                                                                                                                                          |

## Testing & Review Strategy

Each phase across both codebases includes a **review gate** — a set of tests
and manual checks that must all pass before proceeding to the next phase. This
prevents issues from compounding across phases.

### Principles

1. **Test as you build.** Run `npm test` after every implementation step, not
   just at the end of a phase. Fix failures immediately.
2. **No regressions.** Every existing test must still pass. New features must
   not break existing functionality.
3. **Unit tests for logic, E2E tests for flows.** Unit tests cover data
   transformations, validation, edge cases. E2E tests cover user workflows
   (export dialog, import page, review flow).
4. **Manual review for UX.** Automated tests cannot catch everything. Each
   phase includes manual review items to verify the user experience.
5. **Gate before handoff.** The HANDOFF point (CB Phase 2 → Website) and
   RESUME point (Website Phase 2 → CB Phase 3) both require all tests passing.

### Test Coverage by Phase

| Phase       | Unit Tests                                                          | E2E Tests                           | Manual Review                                  | Status         |
| ----------- | ------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------- | -------------- |
| CB Phase 1  | Clan CRUD, migration, ValidationManager clan-awareness              | —                                   | Single-clan UX unchanged, multi-clan switching | ✅ Complete    |
| CB Phase 2  | Export payload builder (all data types, edge cases, Zod validation) | Export dialog UI                    | Real capture export, JSON inspection           | ✅ Complete    |
| WEB Phase 1 | —                                                                   | —                                   | Migrations apply, tables/RLS/triggers verified | ✅ Complete    |
| WEB Phase 2 | 37 Zod schema tests, security audit                                 | —                                   | SQL-level E2E, Bearer auth                     | ✅ Complete    |
| WEB Phase 3 | —                                                                   | Full import → review → approve flow | UX walkthrough, permissions, navigation        | ✅ Complete    |
| WEB Phase 4 | —                                                                   | —                                   | TypeScript compilation, no `any` casts         | ✅ Complete    |
| CB Phase 3  | Auth client, API client, clan linking                               | Connection settings UI              | Live integration test against website          | ⬜ Next        |
| CB Phase 4  | Sync merge logic, conflict resolution                               | —                                   | Round-trip sync verification                   | ⬜ Not started |

See the per-codebase documents for detailed test lists per phase.
