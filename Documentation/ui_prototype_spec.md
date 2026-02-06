# UI Prototype Specification

This document defines the screen-by-screen prototype for the clan community website, aligned to the MVP scope and the Total Battle-inspired dark blue/gold theme.

## Global UI Framework
### Layout
- Persistent left sidebar for authenticated areas.
- Top header with clan switcher, notifications, user menu, language toggle.
- Main content area with card-based sections.

### Navigation
- Public: Home, About, Recruitment, Login, Register.
- Member: Dashboard, News, Data Import, Chest Database, Charts, Events, Directory, Messages.
- Admin: Users, Clans, Roles/Ranks, Rules, Audit Log.

### Shared Components
- Card panels with gold trim and layered shadows.
- Tab group with pill styling.
- Gold-outlined primary buttons.
- Data table with parchment-like surface and dark header row.
- Badge/medallion for rank.
- Reusable UI primitives for filters/actions:
  - Icon-only buttons, labeled search inputs, and labeled dropdowns.
  - Dropdowns support search and consistent chevron alignment.

## Screen Inventory
### 1. Public Landing
**Purpose:** Recruit and onboard users.
**Key Sections:**
- Hero banner with clan emblem and CTA.
- Clan overview (mission, goals, active clans).
- Featured news (public-only).
- Recruitment requirements.
- Footer with contact and links.

### 2. Auth - Register
**Purpose:** Create account with Supabase Auth.
**Fields:** email, password, confirm password, optional in-game name.
**States:** validation errors, email verification sent.

### 3. Auth - Login
**Purpose:** Access member area.
**Fields:** email, password.
**Actions:** forgot password, register link.

### 4. Auth - Forgot Password
**Purpose:** Trigger reset.
**Fields:** email.
**States:** confirmation and error handling.

### 5. Guest Dashboard
**Purpose:** Inform user that role/rank/clan assignment is required.
**Key Components:** access status banner, profile completion tips, contact admin CTA.

### 6. Member Dashboard
**Purpose:** Clan overview and personal highlights.
**Widgets:**
- Pinned announcements list.
- News feed cards.
- Personal chest stats summary.
- Clan chest stats summary.
- Quick links (admin managed).

### 7. News Feed
**Purpose:** View and discuss clan posts.
**Components:**
- News card grid/list with filters (Clan, Tag).
- Article detail view with comments and reactions.
- Approval state chip for editors/admins.

### 8. Data Import
**Purpose:** Upload Pattern 1 CSV and preview.
**Flow:**
- Upload CSV (drag/drop).
- Parse summary (counts only).
- Preview table with validation/correction highlights, row actions, and filters.
- Auto‑correct + Validation toggles (on by default).
- Commit button with warning modal for invalid rows.

### 9. Chest Database
**Purpose:** View and edit committed data.
**Components:**
- Filter bar (date range, player, source, clan).
- Paginated table with inline edit.
- Row selection with batch edit/delete.
- Audit log link or drawer.

### 10. Charts & Stats
**Purpose:** Visual insights.
**Charts:** chest counts by type, top players by score, score over time.
**Filters:** date range, player, clan.

### 11. Events Calendar
**Purpose:** Clan events.
**Components:** monthly view, event list, create/edit dialog.

### 12. Member Directory
**Purpose:** Find members and ranks.
**Components:** grid/list cards, filter by clan, sort by rank/name.

### 13. Messages
**Purpose:** Private messaging.
**Components:** inbox list, message view, compose modal.

### 14. Admin - Users
**Purpose:** Manage users and assignments.
**Components:** user table, filters, role/rank/clan editor, deactivate toggle.

### 15. Admin - Clans
**Purpose:** Manage clan metadata.
**Components:** clan list, create/edit form, member list.

### 16. Admin - Roles & Ranks
**Purpose:** View and adjust permission mappings.
**Components:** matrix view, rank-to-role mapping, permission list.

### 17. Admin - Rules
**Purpose:** Manage validation, correction, scoring.
**Components:** tabbed rules list (Validation/Corrections), create/edit rule form, status controls (active/inactive for corrections).

### 18. Admin - Audit Log
**Purpose:** Trace edits and deletions.
**Components:** log table, filters, detail drawer.

## Prototype Deliverables
- Low‑fi wireframes for all screens in this spec.
- Theme tokens for colors, typography, and spacing.
- Component inventory with variants and states.
