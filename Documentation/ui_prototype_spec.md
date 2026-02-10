# UI Prototype Specification

This document defines the screen-by-screen prototype for the clan community website, aligned to the MVP scope and the Total Battle-inspired dark blue/gold theme.

## Global UI Framework — Fortress Sanctum

### Layout

- Collapsible left sidebar (236px expanded / 60px collapsed) for authenticated areas.
  - `SidebarProvider` React context manages collapse state across the app.
  - Sidebar shell: logo with VIP decoration, collapse toggle (top), icon/text navigation, user status + clan selector (bottom).
  - Background: VIP `back_left.png` with dark gradient overlay.
- Top bar: VIP `header_3.png` background, breadcrumb (uppercase, gold text), page title (Fontin Sans heading font), user actions (notification bell + user menu).
- Main content area with 2-column card grid.

### Navigation

- Public: Home, Login, Register, Forgot Password.
- Member: Dashboard, News, Data Import, Chest Database, Charts, Events, Messages.
- Admin: Clan Management, Approvals, Users, Validation, Corrections, Audit Logs, Data Import, Chest Database.

### Shared Components

- Card panels with dark gradient backgrounds and gold-tinted borders.
- Segmented tab control with gold active glow (wrapping).
- Gold-bordered buttons with gradient fill (default, primary, danger, leather variants).
- Dark gradient tables with gold header divider, alternating rows, gold selection/hover.
- Badge/medallion with gold gradient and glow.
- Select dropdowns with Sanctum gradient panels and gold-highlighted items.
- Inputs/textareas with gradient backgrounds and gold focus ring.
- Reusable UI primitives for filters/actions:
  - Icon-only buttons, labeled search inputs, and labeled dropdowns.
  - Dropdowns support search and consistent gold-accented chevron alignment.
  - Combobox inputs with suggestion dropdowns.
  - Date pickers with custom calendar icon.

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
**Fields:** email, username, password, confirm password.
**States:** validation errors, creating account, success panel.
**Success Panel:** Replaces the form after successful registration. Displays 4 numbered onboarding steps:

1. Confirm email (click link in bilingual DE/EN confirmation email).
2. Log in with credentials (first login redirects to profile).
3. Create a game account (add Total Battle player name in profile).
4. Wait for clan assignment (admin assigns within 24–48h).
   Includes spam folder reminder and link back to login page.

### 3. Auth - Login

**Purpose:** Access member area.
**Fields:** email or username, password.
**Actions:** forgot password, register link.
**First-login redirect:** After successful login, the system checks if the user has any game accounts. If none, redirects to `/profile` instead of the dashboard.

### 4. Auth - Forgot Password

**Purpose:** Trigger reset.
**Fields:** email; Cloudflare Turnstile CAPTCHA widget (shown when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is configured).
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
