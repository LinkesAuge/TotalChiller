# Testing Plan (Parsing, RBAC, Edits)

This plan outlines the minimum testing coverage for the data import flow, role-based access control (RBAC), and data editing operations.

## 1. Data Import & Parsing
### Unit Tests
- Parse valid Pattern 1 CSV (DATE, PLAYER, SOURCE, CHEST, SCORE, CLAN).
- Reject missing required columns.
- Reject invalid date format.
- Reject non-numeric score.
- Trim and normalize whitespace in fields.
- Detect empty rows and ignore them.

### Integration Tests
- Upload CSV → preview table renders with correct row count.
- Apply validation rules and highlight statuses.
- Apply correction rules and update values in preview.
- Commit data → entries persisted in database with created_by/created_at.

## 2. RBAC & Permissions
### Unit Tests
- Role permissions resolution (Role + Rank + Cross‑Clan).
- Owner always has full access.
- Guest restricted to onboarding access.

### Integration Tests
- Member can view data but cannot edit or delete.
- Editor can create/edit own articles only.
- Moderator can edit/delete any comment.
- Admin can manage users and rules.
- Cross‑clan access grant allows actions in non‑primary clan.
- RLS policies block unauthorized access at DB level.

## 3. Data Editing & Audit Logs
### Unit Tests
- Single row edit updates updated_by/updated_at.
- Batch edit applies to all selected rows.
- Batch delete removes rows and logs audit entries.
- Re‑scoring applies latest rule order precedence.

### Integration Tests
- Inline edit persists changes and refreshes status.
- Audit log entry created per edit/delete action.
- Validation status recalculated after edit.

## 4. UI Smoke Tests
- Dashboard loads for member role.
- Auth screens render and submit without errors (mocked).
- Data table pagination and filters do not crash.
