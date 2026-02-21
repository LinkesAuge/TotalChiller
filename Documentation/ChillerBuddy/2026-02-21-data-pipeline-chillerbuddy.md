# Data Pipeline — ChillerBuddy Implementation (Desktop App)

> Design Date: 2026-02-21
> Status: Phase 1 + Phase 2 Complete — HANDOFF READY
> Companion doc: `2026-02-21-data-pipeline-overview.md` (shared format & pipeline)
> Companion doc: `2026-02-21-data-pipeline-website.md` (website side)

---

## Context

ChillerBuddy is an Electron desktop app that extracts game data via OCR. This
document covers the changes needed to support:

1. **Clan management** — associate data with specific clans
2. **Enhanced JSON export** (Approach 1) — export data in the shared format
3. **API push** (Approach 3) — authenticate with the website and POST data
4. **Validation list sync** — bidirectional sync of OCR corrections

---

## 1. Clan Management

### Current State

ChillerBuddy has no concept of clans. All data is global — validation lists,
capture results, and corrections are not scoped to any clan.

### Design Principle: Local Clans, Optionally Linked to Website

Clans are a **local concept** in ChillerBuddy. They exist independently of the
website and serve as containers for validation/correction lists, capture
results, and history — even without any website connection.

When a website connection is configured, each local clan can optionally be
**linked** to a website clan. This link determines where data gets pushed and
which remote validation lists to sync with.

### Data Structure

```javascript
// %AppData%/ChillerBuddy/clan-profiles.json
{
  defaultClanId: string,     // ID of the active/default clan

  clans: [
    {
      id: string,            // local UUID (generated on creation)
      name: string,          // user-chosen display name (e.g. "Chiller & Killer")
      isDefault: boolean,    // one clan is the default
      createdAt: string,     // ISO timestamp

      // Website linking (null until linked)
      websiteClanId: string | null,  // website clan UUID
      websiteClanName: string | null, // name from website (for display)
      linkedGameAccountId: string | null,  // which game account is in this clan
      linkedGameUsername: string | null,    // display name for that account
    }
  ]
}
```

### Lifecycle

**On first run (or upgrade from pre-clan version):**

- A single default clan is created automatically with `id: <generated-uuid>`,
  `name: "Default"`, `isDefault: true`, all website fields null.
- The existing global `validation-list.json` and `chest-validation-list.json`
  are copied into the clan's subdirectory at `clans/{clanId}/`, and the
  originals are renamed to `.backup`.
- New history entries (CSV exports) include `# ClanId:` and `# ClanName:`
  metadata comment headers for traceability.
- The user experience is unchanged — the app works exactly as before. The
  default clan exists behind the scenes and the user only sees it if they
  look in settings.

**Creating additional clans:**

- The user can create new clans in settings at any time (no website needed).
- Each new clan gets fresh, empty validation/correction lists.
- The user can switch the active clan to capture data for a different context.

**Linking to the website:**

- Once a website connection is configured (Section 2), the user can link each
  local clan to a website clan.
- In clan settings, each clan row has a "Link to Website" action.
- This fetches the user's available clans from `GET /api/import/clans` and
  presents a dropdown. The website's `default_clan_id` is highlighted as a
  suggestion.
- The user picks which website clan this local clan corresponds to.
- Once linked: `websiteClanId`, `websiteClanName`, `linkedGameAccountId`, and
  `linkedGameUsername` are populated.
- A local clan can be unlinked or re-linked at any time.
- Multiple local clans cannot link to the same website clan (enforced locally).

### Single-Clan vs. Multi-Clan Behaviour

| Aspect              | Single clan (default only)                           | Multiple clans                            |
| ------------------- | ---------------------------------------------------- | ----------------------------------------- |
| Clan visible in UI? | Minimal — name shown in settings only                | Active clan selector in header/toolbar    |
| Validation lists    | Per-clan files (default reads migrated global files) | Per-clan files                            |
| Capture sessions    | Tagged with default clan ID                          | Tagged with active clan ID                |
| History             | No filter needed (all same clan)                     | Clan filter dropdown                      |
| Export              | Includes clan name; websiteClanId if linked          | Same, for the active clan                 |
| Push to website     | Works if default clan is linked                      | Works for whichever active clan is linked |

### Capture & Results Are Clan-Specific

- The **active clan** is always known (the default, or user-selected).
- Starting a capture session (member, event, chest) uses the active clan.
- The `ClanManager` provides the active clan's `ValidationManager` and
  `ChestValidationStore` instances, cached per clan ID:
  - `clans/{clanId}/validation-list.json`
  - `clans/{clanId}/chest-validation-list.json`
- Results (CSV, JSONL, history entries) are tagged with the clan ID.
- History view gets a clan filter when multiple clans exist.
- Switching the active clan reloads the relevant validation lists.

### Settings UI

New "Clans" section in settings (always visible):

- List of local clans with name, default indicator, and link status
- "Add Clan" button — creates a new local clan (name input)
- "Edit" — rename a clan
- "Remove" — delete a clan (with confirmation; cannot remove the last clan)
- "Set as Default" — make a clan the default
- "Link to Website" — if connected, shows dropdown of website clans to link to
- "Unlink" — removes the website association
- Per-clan info: validation list count, linked website clan name, last sync time

---

## 2. Website Connection Settings

New "Website" section in settings (only relevant for Approach 3):

```javascript
{
  websiteUrl: string,       // e.g. "https://totalchiller.vercel.app"
  email: string,            // Supabase auth email
  password: string,         // encrypted (same pattern as game password)
  isConnected: boolean,     // last connection test result
  lastSyncAt: string?,      // ISO timestamp of last successful sync
}
```

**Storage:** Added to the existing config file, password encrypted with the same
mechanism used for the game password.

**UI Elements:**

- Website URL input
- Email / Password inputs
- "Test Connection" button → authenticates, fetches clans, shows result
- Connection status indicator
- Last sync timestamp

---

## 3. Export Format

Both approaches use the same JSON format. See the overview document for the
full schema. The key points for ChillerBuddy:

### Building the Export Payload

The export module gathers data from:

| Data             | Current Source                              | Transformation                                                                                                                                            |
| ---------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chests           | `records.jsonl` or in-memory chest records  | Extract: `chest.value` → chestName, `fromPlayer.value` → playerName, `source.value` → source, `level.value` → level, `openedAt` → openedAt                |
| Members          | In-memory OCR results or CSV re-parse       | Extract: `name` → playerName, `coords` → coordinates, `score` → score, add `capturedAt` from capture timestamp                                            |
| Events           | In-memory OCR results or CSV re-parse       | Extract: `name` → playerName, `eventPoints` → eventPoints, add `capturedAt` and `eventName` if available                                                  |
| Validation lists | `clans/{clanId}/validation-list.json`       | Map: `knownNames` → knownPlayerNames, `corrections` → corrections.player                                                                                  |
| Chest validation | `clans/{clanId}/chest-validation-list.json` | Map: `knownChestNames` → knownChestNames, `knownSources` → knownSources, `chestCorrections` → corrections.chest, `sourceCorrections` → corrections.source |

### Export Sources

Users can export from two contexts:

1. **Current session** — after running a capture, export the active results
2. **History** — from the history view, select past sessions to include

The export dialog should let users:

- Choose which data types to include (chests / members / events)
- Choose which sessions to include (current or pick from history)
- Choose whether to include validation lists
- **Clan context:** pre-filled from the active clan. If multiple clans exist,
  a dropdown allows selecting a different clan.
- Choose destination:
  - "Save as file" — always available (Approach 1)
  - "Send to website" — only available if the selected clan is linked to a
    website clan and a connection is configured (Approach 3). Greyed out
    with a tooltip explaining why if conditions aren't met.

---

## 4. API Push (Approach 3)

### Authentication Flow

```
1. User enters website URL + email + password in settings
2. On "Test Connection" or first push:
   a. POST to Supabase Auth: {websiteUrl}/auth/v1/token?grant_type=password
      with email + password
   b. Receive access_token + refresh_token
   c. Store tokens in memory (not on disk — re-auth on app restart)
   d. Use access_token as Bearer header for all API calls
3. On token expiry (401 response):
   a. Use refresh_token to get a new access_token
   b. If refresh fails, re-authenticate with email + password
```

**Supabase Auth endpoint:** The URL is derived from the website's Supabase
project. We need either:

- (a) The user provides the Supabase project URL directly (leaky)
- (b) The website exposes a discovery endpoint `/api/import/config` that returns
  the Supabase URL and anon key
- (c) ChillerBuddy ships with the known Supabase URL + anon key as config

**Recommended: Option (b)** — add a simple public endpoint on the website:

```
GET /api/import/config
→ { "supabaseUrl": "https://xxx.supabase.co", "supabaseAnonKey": "eyJ..." }
```

This avoids hardcoding and allows the website to change Supabase projects.

### HTTP Client

Build a new module `src/services/website/website-api.js` following the pattern
established by `src/services/ollama/ollama-api.js`:

```javascript
/**
 * Methods:
 * - authenticate(email, password) → { accessToken, refreshToken }
 * - refreshSession(refreshToken) → { accessToken, refreshToken }
 * - fetchAvailableClans(accessToken) → Clan[]
 * - submitData(accessToken, payload) → SubmissionResult
 * - fetchValidationLists(accessToken, clanId) → ValidationLists
 * - pushValidationLists(accessToken, clanId, lists) → { updated: number }
 */
```

Use Node.js built-in `https.request` (matching the Ollama client pattern) or
consider using `fetch` (available in Node 18+ which Electron 40 includes).

### IPC Handlers

New IPC handler module `src/ipc/website-handler.js`:

```javascript
// IPC channels:
"website:test-connection"; // { url, email, password } → { ok, clans }
"website:fetch-clans"; // → Clan[]
"website:push-data"; // { clanProfileId, dataTypes } → SubmissionResult
"website:sync-validation"; // { clanProfileId, direction } → SyncResult
"website:get-status"; // → { isConnected, lastSyncAt }
```

### Preload Bridge

Add the new IPC channels to `preload.cjs`:

```javascript
website: {
  testConnection: (config) => ipcRenderer.invoke('website:test-connection', config),
  fetchClans: () => ipcRenderer.invoke('website:fetch-clans'),
  pushData: (options) => ipcRenderer.invoke('website:push-data', options),
  syncValidation: (options) => ipcRenderer.invoke('website:sync-validation', options),
  getStatus: () => ipcRenderer.invoke('website:get-status'),
}
```

---

## 5. Validation List Sync

### Bidirectional Flow

```
ChillerBuddy                          Website
     │                                    │
     │── Push corrections ──────────────►│  (POST /api/import/validation-lists)
     │                                    │
     │◄── Pull corrections ─────────────│  (GET /api/import/validation-lists)
     │                                    │
     │── Merge into local lists          │
```

### Sync Strategy

**Push:** When the user pushes data or explicitly syncs, include all corrections
and known names for the active clan in the payload.

**Pull:** After a push, or on demand, fetch the website's current lists for the
clan. Merge into local lists:

- New corrections from the website are added locally
- Conflicts (same `ocrText`, different `correctedText`): keep the website's
  version (the website is the source of truth after review)
- New known names are added locally

**Trigger:** Sync happens:

1. Automatically when pushing data (lists included in the export payload)
2. On demand via a "Sync Validation Lists" button in settings
3. Optionally on app startup if a connection is configured

### List Migration on First Run (Upgrade)

When upgrading from the pre-clan version:

1. A default clan is auto-created with a generated UUID.
2. Copy `validation-list.json` → `clans/{defaultClanId}/validation-list.json`
3. Copy `chest-validation-list.json` → `clans/{defaultClanId}/chest-validation-list.json`
4. Rename the originals to `.backup` (e.g. `validation-list.json.backup`).
5. If neither global file exists (fresh install), the default clan starts with empty lists that get seeded from `defaults/validation-list.json` on first load.

New clans created by the user start with empty lists. If the clan is linked to
the website, the user can pull existing corrections from the website via
`GET /api/import/validation-lists?clan_id=X`.

---

## 6. UI Changes Summary

### Settings Panel

- [ ] New "Clans" section (always visible): local clan list, add/edit/remove,
      default selector, link-to-website per clan, per-clan sync status
- [ ] New "Website" section: URL, credentials, test connection, status

### Export Dialog (new or enhanced)

- [ ] Data type checkboxes (chests / members / events)
- [ ] Session selector (current / history pick)
- [ ] Include validation lists toggle
- [ ] Active clan shown (dropdown if multi-clan)
- [ ] Destination: "Save File" vs "Send to Website" (latter only if connected)

### History View

- [ ] Clan filter dropdown
- [ ] "Export to Website" action on history entries

### Status Bar / Header

- [ ] Website connection indicator (connected / disconnected / syncing)
- [ ] Active clan profile display

---

## 7. Implementation Sequence

This work is split into two rounds with a handoff to the website agent in between.

```
 ROUND 1 (do now):
   Phase 1: Clan Management      ← foundational, no dependencies
   Phase 2: Enhanced Export       ← produces test JSON for the website agent

 ════════════════════ HANDOFF ════════════════════
 After Phase 2: generate sample export JSON files and hand off to the
 website agent along with:
   - 2026-02-21-data-pipeline-overview.md
   - 2026-02-21-data-pipeline-website.md
   - The sample JSON export files as test fixtures

 (Website agent builds DB + API + UI)

 ════════════════════ RESUME ═════════════════════
 Resume when the website's API routes are functional:

 ROUND 2 (do after website API is ready):
   Phase 3: Website Connection    ← needs /api/import/* endpoints
   Phase 4: Validation List Sync  ← needs /api/import/validation-lists
```

## 8. Implementation Checklist

Tests use **Vitest** (unit, `npm test`) and **Playwright** (E2E, `npm run test:e2e`).
Every phase ends with a **review & test gate** — all tests must pass before
proceeding. Run `npm test` after each implementation step, not just at the end.

### Round 1 — Do Now (before website handoff)

### Phase 1: Clan Management (Foundation) — ✅ COMPLETE

**Implementation:**

- [x] Implement clan profiles storage (`clan-profiles.json`) with Zod schema — `src/services/clan-profiles.js`
- [x] Auto-create default clan on first run / upgrade migration
- [x] Migrate existing global validation lists to default clan's subdirectory (`clans/{clanId}/`)
- [x] Clan CRUD: add, edit (rename), remove, set default — `src/ipc/clan-handler.js`
- [x] Make `ValidationManager` clan-aware via `ClanManager` (cached instances per clan) — `src/services/clan-manager.js`
- [x] Make `ChestValidationStore` clan-aware via `ClanManager`
- [x] Backward-compatible `appState.validationManager` getter delegates to active clan
- [x] Make capture sessions tag results with active clan ID (CSV metadata: `# ClanId:`, `# ClanName:`)
- [x] Make history entries clan-aware: `scanResultsDir` and `load-history-entry` extract `clanId`
- [x] Active clan selector in app header/toolbar (hidden in single-clan mode) — `src/renderer/modules/clan-ui.js`
- [x] Settings UI: clan list, add/edit/remove, default selector — `src/renderer/modules/clan-settings-ui.js`

**Unit tests** (Vitest — `test/unit/services/` and `test/unit/ipc/`):

- [x] `clan-profiles.test.js` — Zod schema validation, CRUD, migration (pre-clan + fresh install), website linking
- [x] `clan-manager.test.js` — initialization, active clan switching, instance caching/eviction
- [x] `clan-handler.test.js` — all IPC handlers (list, create, rename, remove, set-default, link, unlink)
- [x] Existing test files updated for clan-aware architecture: `app-state.test.js`, `chests-handler.test.js`, `validation-handler.test.js`, `csv-formatter.test.js`, `history-handler.test.js`

**Review gate:**

- [x] Run `npm test` — all 948 tests pass across 52 files (zero regressions)
- [x] Code review pass 1: eviction order fix, WeakSet tracking, null guards, HTML escaping, error handling
- [x] Code review pass 2: pre-init guards, save queue resilience, stale isDefault clearing, async handleClanChange, settings panel init, defaultClanId null fallback, 25 new tests

### Phase 2: Enhanced Export (Approach 1) ✅

**Implementation:**

- [x] Build export payload builder module (`src/export/export-payload-builder.js`)
- [x] Zod schema for v1 format (`src/export/export-schema.js`)
- [x] Map chest records → export format (`mapChestRecord`: `chest.value` → chestName, etc.)
- [x] Map member OCR results → export format (`mapMemberEntry`: name → playerName, etc.)
- [x] Map event OCR results → export format (`mapEventEntry`: name → playerName, etc.)
- [x] Map validation lists → export format (player names, chest names, sources, corrections)
- [x] Export IPC handler (`src/ipc/export-handler.js`): `export:build-payload`, `export:save-file`
- [x] Export dialog UI (`src/renderer/modules/export-ui.js`): data type checkboxes, clan selector, save-as-file
- [x] Toolbar "Export" button
- [x] Preload bridge: `exportBuildPayload`, `exportSaveFile`
- [ ] History export integration (deferred — current export covers active session data)

**Unit tests** (Vitest — `test/unit/export/`):

- [x] `export-payload-builder.test.js` — 28 tests covering all data mappings,
      schema validation, edge cases, special characters, zero scores, rejection cases
- [x] `export-fixtures-validation.test.js` — 4 fixture files validate against Zod schema

**Review gate:**

- [x] Run `npm test` — 980 tests pass across 54 files
- [x] **HANDOFF DELIVERABLE:** Sample JSON export files in `test-fixtures/`:
      `sample-export-chests-only.json`, `sample-export-full.json`,
      `sample-export-members-events.json`, `sample-export-validation-only.json`
- [x] All fixture files validate against the Zod schema

### Round 2 — Do After Website API Is Ready

### Phase 3: Website Connection (Approach 3)

**Implementation:**

- [ ] Website connection settings storage (encrypted password)
- [ ] Supabase auth client (authenticate, refresh)
- [ ] Website API client (submit data, fetch/push validation lists, fetch clans)
- [ ] IPC handlers for website operations
- [ ] Preload bridge additions
- [ ] Settings UI for website connection + test connection
- [ ] Clan linking UI: "Link to Website" per clan, fetch website clans dropdown
- [ ] Prevent duplicate links (two local clans → same website clan)
- [ ] "Send to Website" in export dialog (only for linked clans)
- [ ] Connection status indicator

**Unit tests** (Vitest — `test/unit/website/`):

- [ ] `website-api.test.js` — authenticate returns tokens on valid credentials,
      throws on invalid
- [ ] `website-api.test.js` — refreshSession refreshes expired tokens
- [ ] `website-api.test.js` — submitData sends correct payload shape, handles
      success/error responses
- [ ] `website-api.test.js` — fetchAvailableClans parses response correctly
- [ ] `website-api.test.js` — HTTP errors (network down, 500, 401, 403) are
      handled with clear error messages
- [ ] `clan-linking.test.js` — linking sets websiteClanId on local clan
- [ ] `clan-linking.test.js` — duplicate link prevention (two locals → same
      website clan rejected)
- [ ] `clan-linking.test.js` — unlinking clears website fields
- [ ] `website-settings.test.js` — password is encrypted in config, not stored
      in plaintext

**E2E tests** (Playwright):

- [ ] `ui-website-settings.spec.js` — connection settings UI renders, test
      connection button works (mock or skip if no real server)

**Review gate:**

- [ ] Run `npm test` — all tests pass
- [ ] Run `npm run test:e2e` — all E2E tests pass
- [ ] Manual test against live website: connect, fetch clans, link a clan,
      push a small chest export, verify submission appears on website
- [ ] Manual test: push with expired token — verify auto-refresh works

### Phase 4: Validation List Sync

**Implementation:**

- [ ] Push logic: include lists in export payload
- [ ] Pull logic: fetch from website, merge into local
- [ ] Conflict resolution (website wins)
- [ ] "Sync Now" button in clan settings
- [ ] Optional auto-sync on startup (if connected)
- [ ] Pull lists for newly-added clans on first selection

**Unit tests** (Vitest — `test/unit/website/`):

- [ ] `validation-sync.test.js` — push includes all corrections and known names
      for the active clan
- [ ] `validation-sync.test.js` — pull merges new corrections into local list
- [ ] `validation-sync.test.js` — pull conflict resolution: website version wins
      when same ocrText has different correctedText
- [ ] `validation-sync.test.js` — pull adds new known names without removing
      existing local-only names
- [ ] `validation-sync.test.js` — empty remote list doesn't wipe local list
- [ ] `validation-sync.test.js` — newly-created clan pulls lists on first sync

**Review gate:**

- [ ] Run `npm test` — all tests pass
- [ ] Run `npm run test:e2e` — all E2E tests pass
- [ ] Manual test: add a correction on the website, sync in app, verify it
      appears locally
- [ ] Manual test: add a correction in app, push, verify it appears on website
- [ ] **FINAL GATE:** Run full test suite (`npm test && npm run test:e2e`),
      all green, no regressions across the entire project

---

## 9. Dependencies on Website Side

The following website features must be available before ChillerBuddy can use them:

| Feature               | Website API                         | Needed for       |
| --------------------- | ----------------------------------- | ---------------- |
| Discovery endpoint    | `GET /api/import/config`            | Auth setup       |
| Available clans       | `GET /api/import/clans`             | Clan linking     |
| Data submission       | `POST /api/import/submit`           | Push data        |
| Validation list fetch | `GET /api/import/validation-lists`  | Pull corrections |
| Validation list push  | `POST /api/import/validation-lists` | Push corrections |
| Bearer token auth     | `requireAuth()` change              | All API calls    |

**Approach 1 (file export) has no website dependencies** — the export format is
the contract. The website import page and API can be built independently as long
as both sides agree on the JSON format defined in the overview document.
