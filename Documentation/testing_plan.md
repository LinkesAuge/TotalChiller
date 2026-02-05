# Testing Plan (Parsing, RBAC, Edits, Clan Context)

This plan outlines the minimum testing coverage for the data import flow, role-based access control (RBAC), and data editing operations.

## 1. Data Import & Parsing

### Unit Tests (Import)

- Parse valid Pattern 1 CSV (DATE, PLAYER, SOURCE, CHEST, SCORE, CLAN).
- Reject missing required columns.
- Reject invalid date format.
- Reject non-numeric score.
- Trim and normalize whitespace in fields.
- Detect empty rows and ignore them.

### Integration Tests (Import)

- Upload CSV → preview table renders with correct row count.
- Apply validation rules and highlight statuses.
- Import does not require player/game account matching.
- Commit data → entries persisted in database with created_by/created_at.

## 2. RBAC & Permissions

### Unit Tests (RBAC)

- Role permissions resolution (Role + Rank + Cross‑Clan).
- Owner always has full access within a clan.
- Game account membership required for clan-scoped access.

### Integration Tests (RBAC)

- Member can view data but cannot edit or delete.
- Admin can manage users and rules.
- RLS policies block unauthorized access at DB level.
- User with multiple game accounts can access multiple clans.
- Admin routes reject non-admin users and show `/not-authorized`.

## 3. Data Editing & Audit Logs

### Unit Tests (Editing)

- Single row edit updates updated_by/updated_at.
- Batch edit applies to all selected rows.
- Batch delete removes rows and logs audit entries.
- Re‑scoring applies latest rule order precedence (until validation-only refactor).

### Integration Tests (Editing)

- Inline edit persists changes and refreshes status.
- Audit log entry created per edit/delete action.
- Validation status recalculated after edit.

## 4. Clan Context (Game Accounts)

### Unit Tests (Clan Context)

- Clan selector stores/retrieves current clan/game account from local storage.
- Changing clan context updates scoped queries.

### Integration Tests (Clan Context)

- News create flow attaches selected clan.
- Events create flow attaches selected clan.
- Data table defaults to selected clan filter.
- Clan Management assign modal assigns selected accounts to active clan.

## 5. UI Smoke Tests

- Dashboard loads for member role.
- Auth screens render and submit without errors (mocked).
- Data table pagination and filters do not crash.
- News/events CRUD flows function with clan context.
- Custom dropdowns render and allow selection without layout issues.
- ESLint runs clean: `npx eslint .`.
