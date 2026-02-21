# Data Pipeline — Website Implementation (TotalChiller)

> Design Date: 2026-02-21
> Status: ✅ ALL PHASES COMPLETE — Database live, API routes functional, UI deployed
> Companion doc: `2026-02-21-data-pipeline-overview.md` (shared format & pipeline)
> Companion doc: `2026-02-21-data-pipeline-chillerbuddy.md` (desktop app side)

---

## IMPORTANT: Implementation Sequence & Context

This document is part of a **cross-codebase pipeline** built by different agents:

1. **ChillerBuddy Phases 1–2** (desktop app) are completed first. They produce
   local clan management and a JSON export feature that generates test fixture
   files in the shared format.
2. **You (the website agent) work on this document next.** You should have
   received sample JSON export files from ChillerBuddy as test data. If not,
   use the example payloads in this document to create your own test fixtures.
3. **ChillerBuddy Phases 3–4** (API push + validation sync) happen after your
   API routes are functional. They depend on your `/api/import/*` endpoints.

**Your work is self-contained.** You do not need access to the ChillerBuddy
codebase. Everything you need is in this document and the companion overview
(`2026-02-21-data-pipeline-overview.md`).

**Your deliverables:**

- Database migrations (staging + production + validation tables, RLS, indexes)
- 8 API routes under `/api/import/*`
- Bearer token auth support in `requireAuth()`
- Review UI pages (submissions list, detail, import page)
- TypeScript types for all new tables

See the **Implementation Checklist** (Section 5) for the full breakdown.

---

## Context for the Implementing Agent

You are working on **TotalChiller** — a Next.js 16 App Router website for the
Total Battle gaming community "[THC] Chiller & Killer". It uses Supabase for auth
and database, is deployed on Vercel, and serves multiple clans with role-based
access control.

**Repository:** https://github.com/LinkesAuge/TotalChiller

### What you need to know about ChillerBuddy (the desktop app)

ChillerBuddy is a separate Electron desktop application that automates data
extraction from the Total Battle game. It uses Playwright to navigate the game,
captures screenshots of clan member lists / event rankings / chest opening screens,
and uses OCR (Tesseract.js) to extract structured data.

The data it produces:

- **Chests:** Each opened chest yields: chest name, player name (who sent it),
  source (where it came from), level, and a timestamp.
- **Members:** Periodic snapshots of the clan member list: player name,
  coordinates, power score.
- **Events:** Event ranking snapshots: player name, event points, event name.

Because the data comes from OCR, player names may contain errors. ChillerBuddy
maintains local "validation lists" — known correct names and OCR→correct mappings
(corrections) — that help it auto-correct common OCR mistakes. These correction
lists should be syncable with the website.

### What we're building

A **data ingestion pipeline** with two delivery methods:

1. **File Import (Approach 1):** User exports a JSON file from ChillerBuddy and
   uploads it on the website via an import page.
2. **API Push (Approach 3):** ChillerBuddy authenticates with the website and
   POSTs data directly to API routes.

Both methods produce the **same JSON payload format** (see "Import Payload Format"
below) and feed into the **same staging pipeline**.

All incoming data enters **staging tables** first. A reviewer on the website
inspects grouped "submissions" and approves/rejects them before data is promoted
to production tables.

---

## Architecture Overview

```
                     ┌──────────────────────┐
  File Upload ──────►│                      │
                     │  /api/import/submit  │──► Parse JSON
  API Push ─────────►│  (POST)             │──► Validate (Zod)
                     │                      │──► Split by data type
                     └──────────┬───────────┘──► Auto-match players
                                │                ──► Create submissions
                                ▼
                     ┌──────────────────────┐
                     │   STAGING TABLES     │
                     │                      │
                     │  data_submissions    │  (envelope per batch per type)
                     │  staged_chest_entries│
                     │  staged_member_entries│
                     │  staged_event_entries│
                     └──────────┬───────────┘
                                │
                     Website Review UI (/clan/[id]/submissions)
                     - List all submissions
                     - Drill into one → see staged rows
                     - Match unmatched players
                     - Approve / reject per-item or bulk
                                │
                                ▼
                     ┌──────────────────────┐
                     │  PRODUCTION TABLES   │
                     │                      │
                     │  chest_entries       │
                     │  member_snapshots    │
                     │  event_results       │
                     └──────────────────────┘
                                │
                     ┌──────────┴───────────┐
                     │  VALIDATION TABLES   │
                     │  ocr_corrections     │  (bidirectional sync)
                     │  known_names         │
                     └──────────────────────┘
```

---

## 1. Database Schema

All tables follow the project's existing conventions: UUIDs, `gen_random_uuid()`,
`created_at`/`updated_at` with `set_updated_at()` trigger, CHECK constraints
instead of enums, RLS on every table.

### 1.1 Submission Envelope

```sql
CREATE TABLE data_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id         uuid NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  submitted_by    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_account_id uuid REFERENCES game_accounts(id) ON DELETE SET NULL,

  submission_type text NOT NULL
    CHECK (submission_type IN ('chests', 'members', 'events')),
  source          text NOT NULL
    CHECK (source IN ('file_import', 'api_push')),
  status          text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'partial')),

  item_count      integer NOT NULL DEFAULT 0,
  approved_count  integer NOT NULL DEFAULT 0,
  rejected_count  integer NOT NULL DEFAULT 0,

  notes           text,
  reviewer_notes  text,
  reviewed_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at     timestamptz,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_data_submissions_clan_status
  ON data_submissions(clan_id, status);
CREATE INDEX idx_data_submissions_submitted_by
  ON data_submissions(submitted_by);

CREATE TRIGGER set_data_submissions_updated_at
  BEFORE UPDATE ON data_submissions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### 1.2 Staging Tables

```sql
CREATE TABLE staged_chest_entries (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id          uuid NOT NULL
    REFERENCES data_submissions(id) ON DELETE CASCADE,

  chest_name             text NOT NULL,
  player_name            text NOT NULL,
  source                 text NOT NULL,
  level                  text,
  opened_at              timestamptz NOT NULL,

  -- Review fields
  matched_game_account_id uuid REFERENCES game_accounts(id) ON DELETE SET NULL,
  item_status            text NOT NULL DEFAULT 'pending'
    CHECK (item_status IN ('pending', 'approved', 'rejected', 'auto_matched')),
  reviewer_notes         text,
  is_duplicate           boolean NOT NULL DEFAULT false,

  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_staged_chests_submission
  ON staged_chest_entries(submission_id);


CREATE TABLE staged_member_entries (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id          uuid NOT NULL
    REFERENCES data_submissions(id) ON DELETE CASCADE,

  player_name            text NOT NULL,
  coordinates            text,
  score                  bigint,
  captured_at            timestamptz NOT NULL,

  matched_game_account_id uuid REFERENCES game_accounts(id) ON DELETE SET NULL,
  item_status            text NOT NULL DEFAULT 'pending'
    CHECK (item_status IN ('pending', 'approved', 'rejected', 'auto_matched')),
  reviewer_notes         text,
  is_duplicate           boolean NOT NULL DEFAULT false,

  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_staged_members_submission
  ON staged_member_entries(submission_id);


CREATE TABLE staged_event_entries (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id          uuid NOT NULL
    REFERENCES data_submissions(id) ON DELETE CASCADE,

  player_name            text NOT NULL,
  event_points           bigint NOT NULL,
  event_name             text,
  captured_at            timestamptz NOT NULL,

  matched_game_account_id uuid REFERENCES game_accounts(id) ON DELETE SET NULL,
  item_status            text NOT NULL DEFAULT 'pending'
    CHECK (item_status IN ('pending', 'approved', 'rejected', 'auto_matched')),
  reviewer_notes         text,
  is_duplicate           boolean NOT NULL DEFAULT false,

  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_staged_events_submission
  ON staged_event_entries(submission_id);
```

### 1.3 Production Tables

```sql
CREATE TABLE chest_entries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id         uuid NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  submission_id   uuid REFERENCES data_submissions(id) ON DELETE SET NULL,
  game_account_id uuid REFERENCES game_accounts(id) ON DELETE SET NULL,

  chest_name      text NOT NULL,
  player_name     text NOT NULL,
  source          text NOT NULL,
  level           text,
  opened_at       timestamptz NOT NULL,

  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chest_entries_clan ON chest_entries(clan_id);
CREATE INDEX idx_chest_entries_opened ON chest_entries(clan_id, opened_at);
CREATE INDEX idx_chest_entries_player ON chest_entries(clan_id, player_name);


CREATE TABLE member_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id         uuid NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  submission_id   uuid REFERENCES data_submissions(id) ON DELETE SET NULL,
  game_account_id uuid REFERENCES game_accounts(id) ON DELETE SET NULL,

  player_name     text NOT NULL,
  coordinates     text,
  score           bigint,
  snapshot_date   timestamptz NOT NULL,

  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_member_snapshots_clan ON member_snapshots(clan_id);
CREATE INDEX idx_member_snapshots_date ON member_snapshots(clan_id, snapshot_date);


CREATE TABLE event_results (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id         uuid NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  submission_id   uuid REFERENCES data_submissions(id) ON DELETE SET NULL,
  game_account_id uuid REFERENCES game_accounts(id) ON DELETE SET NULL,

  player_name     text NOT NULL,
  event_points    bigint NOT NULL,
  event_name      text,
  event_date      timestamptz NOT NULL,

  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_results_clan ON event_results(clan_id);
CREATE INDEX idx_event_results_date ON event_results(clan_id, event_date);
```

### 1.4 Validation / Correction Tables

```sql
CREATE TABLE ocr_corrections (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id         uuid NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  entity_type     text NOT NULL
    CHECK (entity_type IN ('player', 'chest', 'source')),
  ocr_text        text NOT NULL,
  corrected_text  text NOT NULL,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (clan_id, entity_type, ocr_text)
);

CREATE TRIGGER set_ocr_corrections_updated_at
  BEFORE UPDATE ON ocr_corrections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


CREATE TABLE known_names (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id         uuid NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  entity_type     text NOT NULL
    CHECK (entity_type IN ('player', 'chest', 'source')),
  name            text NOT NULL,

  created_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (clan_id, entity_type, name)
);
```

### 1.5 RLS Policies

```sql
-- All tables: enable RLS
ALTER TABLE data_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE staged_chest_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE staged_member_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE staged_event_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE chest_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE known_names ENABLE ROW LEVEL SECURITY;

-- data_submissions
-- Clan members can view submissions for their clan
CREATE POLICY "Clan members can view submissions"
  ON data_submissions FOR SELECT
  USING (is_clan_member(clan_id) OR is_any_admin());

-- Clan members can create submissions (submit data)
CREATE POLICY "Clan members can create submissions"
  ON data_submissions FOR INSERT
  WITH CHECK (
    auth.uid() = submitted_by
    AND (is_clan_member(clan_id) OR is_any_admin())
  );

-- Only admins/moderators can update (review) submissions
CREATE POLICY "Admins can review submissions"
  ON data_submissions FOR UPDATE
  USING (is_any_admin() OR has_role(ARRAY['moderator']));

-- Only admins can delete submissions
CREATE POLICY "Admins can delete submissions"
  ON data_submissions FOR DELETE
  USING (is_any_admin());

-- staged_*_entries: access follows the parent submission
-- SELECT: if you can see the submission, you can see its entries
-- INSERT: service role only (created by the import API)
-- UPDATE: admins/moderators (for review — setting item_status, matched_game_account_id)
-- DELETE: admins only

-- Production tables: clan members can read, service role inserts on approval
-- chest_entries, member_snapshots, event_results
CREATE POLICY "Clan members can view production data"
  ON chest_entries FOR SELECT
  USING (is_clan_member(clan_id) OR is_any_admin());

-- (Repeat pattern for member_snapshots and event_results)

-- INSERT on production is done via service role client during approval
-- so no INSERT policy needed for regular users.

-- ocr_corrections / known_names: clan members can view, editors+ can manage
CREATE POLICY "Clan members can view corrections"
  ON ocr_corrections FOR SELECT
  USING (is_clan_member(clan_id) OR is_any_admin());

CREATE POLICY "Editors can manage corrections"
  ON ocr_corrections FOR ALL
  USING (is_any_admin() OR has_role(ARRAY['moderator', 'editor']));

-- (Repeat pattern for known_names)
```

**Note:** Staged entry INSERT is done via the service role client in API routes
(following the existing pattern for `message_recipients`). Regular user INSERT
policies are not needed on staging tables.

---

## 2. API Routes

All routes follow the existing project conventions:

- Rate limiting via `limiter.check(request)`
- Auth via `requireAuth()` or `requireAdmin()`
- Zod validation on request bodies
- Service role client for cross-RLS operations
- Response shape: `{ data: T }` or `{ error: string }`

### 2.1 Import Endpoint

**`POST /api/import/submit`**

Accepts the ChillerBuddy export payload. Creates one submission per data type
present in the payload.

```typescript
// Request body: the ChillerBuddy export JSON (see "Import Payload Format" below)
// Query param: ?clan_id=uuid (required if payload's clan.websiteClanId is null)

// Zod schema for the request body
const ImportPayloadSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().datetime(),
  source: z.string(),
  clan: z.object({
    localClanId: z.string(),
    name: z.string(),
    websiteClanId: z.string().uuid().nullable().optional(),
  }),
  data: z.object({
    chests: z.array(z.object({
      chestName: z.string().min(1),
      playerName: z.string().min(1),
      source: z.string().min(1),
      level: z.string().nullable().optional(),
      openedAt: z.string().datetime(),
    })).optional(),
    members: z.array(z.object({
      playerName: z.string().min(1),
      coordinates: z.string().nullable().optional(),
      score: z.number().int().nonnegative(),
      capturedAt: z.string().datetime(),
    })).optional(),
    events: z.array(z.object({
      playerName: z.string().min(1),
      eventPoints: z.number().int().nonnegative(),
      eventName: z.string().nullable().optional(),
      capturedAt: z.string().datetime(),
    })).optional(),
  }),
  validationLists: z.object({
    knownPlayerNames: z.array(z.string()).optional(),
    knownChestNames: z.array(z.string()).optional(),
    knownSources: z.array(z.string()).optional(),
    corrections: z.object({
      player: z.record(z.string()).optional(),
      chest: z.record(z.string()).optional(),
      source: z.record(z.string()).optional(),
    }).optional(),
  }).optional(),
});

// Response
{
  "data": {
    "submissions": [
      {
        "id": "uuid",
        "type": "chests",
        "itemCount": 500,
        "autoMatchedCount": 480,
        "unmatchedCount": 20,
        "duplicateCount": 3
      }
    ],
    "validationListsUpdated": true
  }
}
```

**Logic:**

1. Validate payload with Zod. Reject entirely if invalid.
2. Resolve `clan_id` from payload or query param. Verify user is a clan member.
3. For each data type present (`chests`, `members`, `events`):
   a. Create a `data_submissions` row with `source: 'file_import'` or `'api_push'`
   (determine from request headers — API push will have a custom header or
   different content type).
   b. Run player auto-matching:
   - Exact match (case-insensitive) against `game_accounts.game_username`
     where the game account is in the target clan.
   - If no exact match, check `ocr_corrections` for a known correction.
   - Set `item_status` to `'auto_matched'` or `'pending'`.
     c. Run dedup check against existing production + staged data.
     Set `is_duplicate = true` on suspected dupes.
     d. Bulk insert into the appropriate `staged_*_entries` table.
     e. Update `item_count` on the submission.
4. If `validationLists` is present, upsert into `ocr_corrections` and
   `known_names` (last-write-wins by `updated_at`).
5. Return summary with match/dupe statistics.

**Body size limit:** Override Next.js default for this route:

```typescript
export const config = { api: { bodyParser: { sizeLimit: "10mb" } } };
```

**Rate limit tier:** `relaxed` (120/min) — submissions are infrequent but large.

### 2.2 Submissions List

**`GET /api/import/submissions`**

```typescript
// Query params:
//   clan_id: uuid (required)
//   status: 'pending' | 'approved' | 'rejected' | 'partial' (optional filter)
//   type: 'chests' | 'members' | 'events' (optional filter)
//   page: number (default 1)
//   per_page: number (default 20, max 50)

// Response
{
  "data": {
    "submissions": [
      {
        "id": "uuid",
        "submissionType": "chests",
        "source": "api_push",
        "status": "pending",
        "itemCount": 500,
        "approvedCount": 0,
        "rejectedCount": 0,
        "submittedBy": {
          "id": "uuid",
          "displayName": "PlayerOne"
        },
        "createdAt": "2026-02-21T14:30:00Z",
        "reviewedAt": null
      }
    ],
    "total": 42,
    "page": 1,
    "perPage": 20
  }
}
```

### 2.3 Submission Detail

**`GET /api/import/submissions/[id]`**

Returns the submission metadata plus all staged entries (paginated).

```typescript
// Query params:
//   page: number (default 1)
//   per_page: number (default 50, max 200)
//   item_status: filter by item status (optional)

// Response
{
  "data": {
    "submission": { /* full submission object */ },
    "items": [
      {
        "id": "uuid",
        "chestName": "Elegant Chest",       // field names vary by type
        "playerName": "Strategus",
        "source": "Level 25 Crypt",
        "level": "25",
        "openedAt": "2026-02-21T14:00:00Z",
        "itemStatus": "auto_matched",
        "isDuplicate": false,
        "matchedGameAccount": {
          "id": "uuid",
          "gameUsername": "Strategus"
        }
      }
    ],
    "total": 500,
    "page": 1,
    "perPage": 50,
    "statusCounts": {
      "pending": 20,
      "auto_matched": 477,
      "approved": 0,
      "rejected": 3
    }
  }
}
```

### 2.4 Review (Approve / Reject)

**`POST /api/import/submissions/[id]/review`**

```typescript
// Request body
{
  // Option A: Bulk action on entire submission
  "action": "approve_all" | "reject_all" | "approve_matched",

  // Option B: Per-item actions
  "items": [
    { "id": "uuid", "action": "approve" },
    { "id": "uuid", "action": "reject", "notes": "wrong player" },
    {
      "id": "uuid",
      "action": "approve",
      "matchGameAccountId": "uuid",    // manual player match
      "saveCorrection": true           // learn as OCR correction
    }
  ]
}

// Response
{
  "data": {
    "submissionStatus": "partial",
    "approvedCount": 495,
    "rejectedCount": 5,
    "productionRowsCreated": 495
  }
}
```

**Logic:**

1. Verify the user has review permissions (admin or moderator).
2. Verify submission is in reviewable state (`pending` or `partial`).
3. For each approved item:
   a. Insert into the corresponding production table.
   b. Set `item_status = 'approved'` on the staged entry.
   c. If `saveCorrection` is true and the matched name differs from the raw
   `playerName`, upsert into `ocr_corrections`.
4. For rejected items: set `item_status = 'rejected'`.
5. Update submission counts and derive overall status:
   - All approved → `'approved'`
   - All rejected → `'rejected'`
   - Mix → `'partial'`
6. Set `reviewed_by`, `reviewed_at` on the submission.
7. Create an audit log entry.
8. Optionally create a notification for the submitter.

### 2.5 Delete Submission

**`DELETE /api/import/submissions/[id]`**

Only pending submissions can be deleted. Cascades to staged entries.
Requires admin role.

### 2.6 Validation Lists

**`GET /api/import/validation-lists?clan_id=uuid`**

Returns all corrections and known names for a clan. Used by ChillerBuddy to
pull the latest lists.

```typescript
// Response
{
  "data": {
    "corrections": {
      "player": { "Stratequs": "Strategus" },
      "chest": {},
      "source": {}
    },
    "knownNames": {
      "player": ["Strategus", "DragonSlayer"],
      "chest": ["Elegant Chest"],
      "source": ["Level 25 Crypt"]
    },
    "lastUpdatedAt": "2026-02-21T14:30:00Z"
  }
}
```

**`POST /api/import/validation-lists`**

Upserts corrections and known names from ChillerBuddy. Uses last-write-wins.

```typescript
// Request body (same shape as the validationLists in the export format)
{
  "clanId": "uuid",
  "knownPlayerNames": ["Strategus"],
  "knownChestNames": ["Elegant Chest"],
  "knownSources": ["Level 25 Crypt"],
  "corrections": {
    "player": { "Stratequs": "Strategus" },
    "chest": {},
    "source": {}
  }
}

// Response
{ "data": { "correctionsUpserted": 1, "knownNamesUpserted": 3 } }
```

### 2.7 Available Clans (for ChillerBuddy setup)

**`GET /api/import/clans`**

Returns the clans the authenticated user's game accounts belong to, plus the
user's `default_clan_id` from their profile. This is the **primary setup
endpoint** for the desktop app — when a user connects ChillerBuddy to the
website, this is the first endpoint called. The app shows the clan list and
lets the user pick which clans to manage and which is the default.

```typescript
// Response
{
  "data": {
    "defaultClanId": "uuid-or-null",   // from profiles.default_clan_id
    "clans": [
      {
        "id": "uuid",
        "name": "Chiller & Killer",
        "gameAccount": {
          "id": "uuid",
          "gameUsername": "Strategus"
        }
      },
      {
        "id": "uuid",
        "name": "Killer Elite",
        "gameAccount": {
          "id": "uuid",
          "gameUsername": "Strategus_Alt"
        }
      }
    ]
  }
}
```

**Logic:**

1. Get the authenticated user's ID.
2. Query `game_accounts` → `game_account_clan_memberships` → `clans` for all
   active memberships.
3. Query `profiles.default_clan_id` for the user.
4. Return the clan list with associated game account info.

---

## 3. API Authentication for Desktop Clients

The existing `requireAuth()` function uses `createServerClient()` from
`@supabase/ssr` which reads auth from cookies. For API push from the Electron
app, we need to also support `Authorization: Bearer <token>` headers.

**Required change to `lib/supabase/server-client.ts` or `lib/api/requireAuth.ts`:**

The Supabase server client should be configured to also read the token from the
Authorization header when no cookie is present. The `@supabase/ssr`
`createServerClient` already supports this if the cookie getter returns empty
and the auth header is present — but verify this works. If not, add a fallback:

```typescript
// In requireAuth or server-client creation
const authHeader = request.headers.get("Authorization");
if (authHeader?.startsWith("Bearer ")) {
  // Create client with the access token directly
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: authHeader } },
  });
  // ...
}
```

This is the **only change to existing auth infrastructure** needed. All RLS
policies work identically regardless of whether auth came from a cookie or
a Bearer token — Supabase resolves the user from the JWT either way.

---

## 4. Review UI Pages

### 4.1 Submissions List Page

**Route:** `/clan/[clanId]/submissions` (or wherever clan-scoped pages live)

**Access:** Clan members can view, admin/moderator can review.

**Layout:**

- Filter bar: status (all / pending / approved / rejected / partial), type
  (all / chests / members / events), date range
- Table columns: Date, Submitted By, Type, Items (count), Status, Actions
- Pending submissions should be visually highlighted
- Click a row → navigate to detail page
- Badge/count of pending submissions in the clan navigation

### 4.2 Submission Detail Page

**Route:** `/clan/[clanId]/submissions/[submissionId]`

**Layout:**

- Header card: submission metadata (submitter, date, type, source, counts)
- Status summary bar: X auto-matched, Y pending, Z approved, W rejected
- Data table showing all staged entries (paginated):
  - For chests: Chest Name, Player, Source, Level, Opened At, Status, Match
  - For members: Player, Coordinates, Score, Captured At, Status, Match
  - For events: Player, Event Points, Event Name, Captured At, Status, Match
- "Match" column shows the matched game account or a dropdown to manually select
- Rows flagged as `is_duplicate` should be visually marked
- Bulk action buttons at top:
  - "Approve All Matched" — approves all `auto_matched` items
  - "Approve All" — approves everything
  - "Reject All" — rejects everything
- Per-row actions: approve, reject, manual match (with optional "save correction")

### 4.3 Import Page (for file upload — Approach 1)

**Route:** `/clan/[clanId]/import`

**Layout:**

- Clan selector (pre-filled from URL, changeable)
- File dropzone accepting `.json` files
- Client-side validation of the JSON format before upload
- Preview of what's in the file (counts per type)
- "Submit for Review" button → calls `/api/import/submit`
- After submission: redirect to the newly created submission(s)

---

## 5. Implementation Checklist

**Test data:** Use the sample JSON payloads provided by ChillerBuddy's export
feature, or create test fixtures matching the `ImportPayloadSchema` defined in
Section 2.1. Example minimal test payloads:

```jsonc
// test-fixture-chests.json — minimal chest submission
{
  "version": 1,
  "exportedAt": "2026-02-21T14:30:00Z",
  "source": "ChillerBuddy v1.2.0",
  "clan": { "localClanId": "test-local-1", "name": "Test Clan", "websiteClanId": null },
  "data": {
    "chests": [
      { "chestName": "Elegant Chest", "playerName": "Strategus", "source": "Level 25 Crypt", "level": "25", "openedAt": "2026-02-21T14:00:00Z" },
      { "chestName": "War Chest", "playerName": "DragonSlayer", "source": "Clan War", "level": null, "openedAt": "2026-02-21T14:01:00Z" },
      { "chestName": "Elegant Chest", "playerName": "Stratequs", "source": "Level 25 Crypt", "level": "25", "openedAt": "2026-02-21T14:02:00Z" }
    ]
  },
  "validationLists": {
    "knownPlayerNames": ["Strategus", "DragonSlayer"],
    "corrections": { "player": { "Stratequs": "Strategus" } }
  }
}

// test-fixture-members.json — minimal member snapshot
{
  "version": 1,
  "exportedAt": "2026-02-21T15:00:00Z",
  "source": "ChillerBuddy v1.2.0",
  "clan": { "localClanId": "test-local-1", "name": "Test Clan", "websiteClanId": null },
  "data": {
    "members": [
      { "playerName": "Strategus", "coordinates": "123:456", "score": 1500000, "capturedAt": "2026-02-21T15:00:00Z" },
      { "playerName": "DragonSlayer", "coordinates": "789:012", "score": 2300000, "capturedAt": "2026-02-21T15:00:00Z" }
    ]
  }
}
```

The TotalChiller project uses **Vitest** for unit tests and **Playwright** for
E2E tests. Every phase ends with a **review & test gate** — all tests must pass
before proceeding. Run tests after each implementation step, not just at the end.

### Phase 1: Database — ✅ COMPLETE

All 4 migration files applied to production Supabase (`rkterrpmvmombpgaeixa`):

- [x] `data_pipeline_staging.sql` — `data_submissions` + 3 staged entry tables
- [x] `data_pipeline_production.sql` — `chest_entries`, `member_snapshots`, `event_results`
- [x] `data_pipeline_validation.sql` — `ocr_corrections`, `known_names`
- [x] `data_pipeline_rls.sql` — 23 RLS policies across all 9 tables
- [x] All indexes created, `set_updated_at` triggers active
- [x] Verified: 9 tables, all with RLS enabled, triggers firing correctly
- [x] 629 unit tests pass, zero regressions

### Phase 2: API Routes — ✅ COMPLETE

- [x] `POST /api/import/submit` — Zod validation, auto-matching, dedup detection
- [x] `GET /api/import/submissions` — list with status/type filters + pagination
- [x] `GET /api/import/submissions/[id]` — detail with staged entries + status counts
- [x] `POST /api/import/submissions/[id]/review` — approve/reject (bulk + per-item)
- [x] `DELETE /api/import/submissions/[id]` — admin-only, pending submissions only
- [x] `GET /api/import/validation-lists` — corrections + known names per clan
- [x] `POST /api/import/validation-lists` — upsert with last-write-wins
- [x] `GET /api/import/clans` — user's clans via game account memberships
- [x] `GET /api/import/config` — public discovery (Supabase URL + anon key)
- [x] `requireAuthWithBearer()` — Bearer token support for desktop app auth
- [x] 37 Zod schema unit tests in `lib/api/import-schemas.test.ts`
- [x] Security audit: submission-scoped queries, 10k row limits, UUID validation
- [x] 629 unit tests pass

### Phase 3: UI Pages — ✅ COMPLETE

- [x] Import tab (`app/admin/tabs/import-tab.tsx`) — dropzone, preview, submit
- [x] Submissions tab (`app/admin/tabs/submissions-tab.tsx`) — list + inline detail
- [x] Submission detail page (`app/submissions/[id]/`) — server-gated admin access
- [x] Bulk review actions (approve all, approve matched, reject all)
- [x] Status filter tabs, pagination, role-based action visibility
- [x] Admin-only access (owner/admin roles in sidebar + server component gate)
- [x] i18n complete (EN + DE) for all import/submissions UI strings
- [x] 629 unit tests pass, TypeScript compiles cleanly

**Note:** Import/Submissions are admin-only tabs within `/admin` (not standalone
pages). Access via `/admin?tab=import` and `/admin?tab=submissions`.

### Phase 4: TypeScript Types — ✅ COMPLETE (done alongside Phases 2–3)

- [x] Domain types in `lib/types/domain.ts`
- [x] Zod schemas in `lib/api/import-schemas.ts`
- [x] `npx tsc --noEmit` passes cleanly

### Final Review Gate — ✅ PASSED

- [x] 629 unit tests pass (`npx vitest run`)
- [x] TypeScript compiles cleanly (`npx tsc --noEmit`)
- [x] Manual E2E: file upload → submission created → review → approve flow verified
- [x] Database E2E: staging → production promotion verified via SQL
- [x] RLS policies verified on all 9 tables
- [x] All changes committed and pushed to main

---

## 6. Edge Cases the Website Must Handle

| Case                                               | Handling                                                |
| -------------------------------------------------- | ------------------------------------------------------- |
| Payload missing `clan.websiteClanId`               | Require `clan_id` query param; reject if missing        |
| Player name has no matching game_account           | Accept as `pending`; reviewer matches manually          |
| Duplicate data (same chest already exists)         | Flag `is_duplicate` but don't reject — reviewer decides |
| Payload exceeds default body limit                 | Route config sets `sizeLimit: '10mb'`                   |
| User not a member of the target clan               | Reject with 403                                         |
| Submission already reviewed                        | Reject further review actions with 409 Conflict         |
| Bearer token expired                               | Return 401; client should refresh and retry             |
| Concurrent reviewers                               | Check `updated_at` on submission before saving review   |
| `validationLists` contains conflicting corrections | Last-write-wins (upsert on unique constraint)           |
| Empty data sections                                | Skip — don't create a submission for empty arrays       |
| Very large submission (>5000 items)                | Accept but warn in response; paginate in UI             |
