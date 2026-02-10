# Product Requirements Document: Clan Community Website

<!-- Table of Contents -->

- [Product Requirements Document: Clan Community Website](#product-requirements-document-clan-community-website)
  - [1. Introduction \& Goals](#1-introduction--goals)
    - [1.1. Overview](#11-overview)
    - [1.2. Goals](#12-goals)
    - [1.3. Target Audience](#13-target-audience)
  - [2. User Roles, Ranks \& Personas](#2-user-roles-ranks--personas)
    - [2.1. Roles](#21-roles)
    - [2.2. Ranks (Based on "Total Battle")](#22-ranks-based-on-total-battle)
    - [2.3. Clan Affiliation](#23-clan-affiliation)
    - [2.4. Personas (Example - TBD in more detail)](#24-personas-example---tbd-in-more-detail)
  - [3. Functional Requirements](#3-functional-requirements)
    - [3.1. Public Facing Website](#31-public-facing-website)
    - [3.2. User Authentication \& Management](#32-user-authentication--management)
      - [3.2.1. User Deactivation/Deletion](#321-user-deactivationdeletion)
    - [3.3. Clan \& Rank System](#33-clan--rank-system)
    - [3.4. Permissions System](#34-permissions-system)
    - [3.5. Member Dashboard](#35-member-dashboard)
    - [3.6. News, Announcements \& Discussions](#36-news-announcements--discussions)
    - [3.7. Data Import \& Preview](#37-data-import--preview)
    - [3.8. Scoring System](#38-scoring-system)
    - [3.9. Data Visualization](#39-data-visualization)
    - [3.10. Data Viewing \& Editing](#310-data-viewing--editing)
    - [3.11. Event Calendar](#311-event-calendar)
    - [3.12. Member Directory](#312-member-directory)
    - [3.13. Private Messaging \& Notifications](#313-private-messaging--notifications)
    - [3.14. Multi-language Support](#314-multi-language-support)
  - [4. Acceptance Criteria](#4-acceptance-criteria)
    - [4.1 Community Hub](#41-community-hub)
    - [4.2 Data Analysis](#42-data-analysis)
    - [4.3 Profile Management](#43-profile-management)
  - [5. Prioritization \& Milestones](#5-prioritization--milestones)
  - [6. Non-Functional Requirements](#6-non-functional-requirements)

## 1. Introduction & Goals

### 1.1. Overview

This document outlines the requirements for a new web application designed to serve as a central hub for a gaming clan focused on the browser game "Total Battle". The application will integrate community features (news, discussions, events) with specialized data analysis tools derived from a previous Python desktop application ("ChestBuddy"). The goal is to create a modern, reliable, and engaging platform for clan members.

### 1.2. Goals

- **Community Hub:** Provide a central online location for clan communication, news, announcements, and event coordination.
- **Data Analysis:** Offer tools for importing, validating, correcting, and visualizing game-specific data ("Chests") relevant to clan members and leadership.
- **Member Engagement:** Foster a sense of community through profiles, discussions, and shared data insights.
- **Information Resource:** Serve as a primary source for game and clan-related information for members.
- **Modernization:** Transition functionality from an older desktop application to a modern, accessible web platform using a specific tech stack (Next.js, Supabase, etc.).
- **Multi-Clan Support:** Structure the platform to potentially support multiple clans with distinct memberships, data, and permissions.

### 1.3. Target Audience

- **Clan Members:** Active players within the affiliated "Total Battle" clan(s).
- **Clan Leadership:** Owners, Administrators, Moderators responsible for managing the clan and website.
- **Potential Recruits:** Individuals interested in learning about and potentially joining the clan(s).

## Current Implementation Status (Feb 2026)

**Implemented**

- Supabase Auth flows (register/login/forgot/update), profile/settings, admin gating.
- Clan context (game accounts + memberships) with scoped data views.
- Default game account selection (persisted in `profiles.default_game_account_id`).
- Admin: Clan Management, Users, Validation rules (global), Correction rules (global), Scoring rules (per-clan), Audit Logs, Approvals, Forum Management.
- Data import (Pattern 1 only) with auto‑correct/validation toggles, batch edit, commit warning, filtering, sorting, pagination, row numbers, and combobox suggestions for player/source/chest.
- Chest database with inline edits (combobox suggestions), batch ops, audit logging, correction-on-save, per-row add-rule actions, and row/correction status filters.
- Announcements (CRUD, clan-scoped) with banner images, rich markdown editor, edit tracking, expandable content cards.
- Forum system (categories, posts, comments, voting, markdown, thumbnails, pinned posts).
- Events with recurring events, templates, organizer, calendar view with scroll-to-day.
- Charts & Stats with Recharts (line, bar, pie, summary panel).
- Messaging system (private, broadcast, system messages).
- Notification system (bell icon, fan-out, per-type preferences).
- Full i18n (German/English) via `next-intl` with `messages/de.json` and `messages/en.json`.
- Content Security Policy for YouTube embeds and media sources.
- Branding: "[THC] Chiller & Killer" throughout.

**Not Yet Implemented / Deferred**

- Dashboard widgets (personal/clan stats summary cards).
- Member directory page.

**Notable Deviations**

- Batch date override and filename date inference were removed.
- Data import supports `.csv` and `.txt`.
- Validation runs after corrections; corrected fields are highlighted.
- Announcements no longer have a "type" filter — all content is type "announcement".
- Forum system added (not in original PRD but implemented as a community feature).
- Navigation renamed: "Diagramme" → "Truhenauswertung", "Ereignisse" → "Event-Kalender".

## 2. User Roles, Ranks & Personas

The application will feature a tiered system of Roles and Ranks, combined with Clan affiliation, to manage permissions and access.

### 2.1. Roles

Roles define the base level of permissions across the website. Permissions are generally additive (Role + Rank) and can be scoped by Clan.

- **Owner:**
  - The primary website owner/superadmin.
  - Complete access to all website features, administration, user management, clan management, and potentially underlying infrastructure/database.
  - Can manage Administrators.
- **Administrator:**
  - High-level administrative privileges within the website context.
  - Can manage users (assign roles/ranks, add/remove from clans), manage content (news, events), configure clan-specific settings (validation/correction rules), and moderate discussions.
  - Cannot manage other Administrators or Owners. Specific capabilities configurable by the Owner.
- **Moderator:**
  - Focuses on content and community moderation.
  - Can moderate discussions/comments (edit/delete), approve/reject submitted articles, manage specific user issues within their assigned clan(s).
  - Possesses a subset of Administrator permissions, configurable by Admins/Owner.
- **Editor:**
  - Focuses on content creation.
  - Can create and edit news articles/announcements for their assigned clan(s). May require approval depending on configuration.
  - Can participate in discussions.
- **Member:**
  - Standard user belonging to one or more clans.
  - Can view clan-specific content (news, data, events), participate in discussions, manage their own profile, and view the member directory.
  - Can submit articles for approval.
- **Guest:**
  - A registered user who has not yet been assigned a Role/Rank/Clan by an Administrator/Moderator.
  - Limited access. Can log in but sees a restricted dashboard (e.g., a message indicating they need assignment) and cannot access member-specific areas. Can view the public-facing page.

### 2.2. Ranks (Based on "Total Battle")

Ranks provide an additional layer for permissions and visual distinction, often reflecting in-game status. Each rank has a default associated Role, but can grant additional permissions.

- **Anführer / Leader:** (Default Role: Administrator)
- **Vorgesetzter / Superior:** (Default Role: Moderator)
- **Offizier / Officer:** (Default Role: Editor)
- **Veteran / Veteran:** (Default Role: Member)
- **Soldat / Soldier:** (Default Role: Member)

_(Visual distinctions like profile icons/colors associated with Ranks are desired but specific assets are TBD). These visuals should appear alongside usernames in discussions, the member directory, and potentially user profiles._

### 2.3. Clan Affiliation

- Users belong to one or more Clans.
- Permissions granted by Role/Rank are typically scoped to the Clan(s) the user belongs to.
- Administrators/Owners can configure whether certain permissions extend across multiple clans for specific users.
- Validation and Correction rules are **global** (not clan-specific). Scoring rules are defined on a per-clan basis.

### 2.4. Personas (Example - TBD in more detail)

- **Persona 1: Klaus (Clan Leader / Administrator)** - Needs overview of all clan activity, member management tools, ability to post announcements, configure clan rules, analyze overall clan data.
- **Persona 2: Sabine (Officer / Editor)** - Wants to write news updates, participate in discussions, track her personal chest data, see upcoming events.
- **Persona 3: Max (Soldier / Member)** - Wants to read news, see his stats on the dashboard, check the event calendar, message other members.
- **Persona 4: New Applicant (Guest)** - Visits the public page, registers, waits for an Admin to assign Role/Rank/Clan.

## 3. Functional Requirements

### 3.1. Public Facing Website

This section describes the part of the website accessible to non-authenticated users.

- **Purpose:** Attract potential recruits, provide general information about the clan(s), and serve as the entry point for registration/login.
- **Content:**
  - Clan Description(s): Information about the clan(s) hosted on the site (history, goals, focus).
  - Recruitment Information: Details on how to apply or express interest in joining.
  - Public News/Announcements: A selection of news articles or announcements designated as publicly visible.
  - Contact Information (Optional): General contact method if desired.
  - Login/Signup Links: Clear calls to action for existing members to log in or new users to register.
- **Structure:** Single landing page or a few key public pages (e.g., Home, About, Recruitment).
- **Design:** Professional, engaging, and reflects the clan's identity. Consistent branding with the member area.

### 3.2. User Authentication & Management

This section covers user registration, login, and profile management.

- **Technology:** Supabase Auth will be used for handling authentication flows.
- **Registration:**
  - Users can register for a new account using an email address and password.
  - Consider adding optional fields during registration (e.g., primary in-game name) or prompt for them after first login.
  - Upon successful registration, the user is created in the database (Supabase) with the default role of "Guest".
- Requires email verification step before the account is fully active (standard Supabase Auth feature).
- **Login:**
  - Registered users can log in using their email and password.
- Session management handled by Supabase Auth.
- Include a "Forgot Password" mechanism for password recovery (standard Supabase Auth feature).
- **Profile Management (User Settings Page):**
  - Authenticated users (excluding Guests) can access a dedicated settings page to manage their profile.
  - **Editable Fields:**
    - Display Name/Alias (for website usage).
    - Email Address (requires re-verification if changed).
    - Password Change.
    - Preferred Language (German/English initially).
    - Country of Origin (Optional, perhaps a dropdown list).
    - **Game Accounts:** A mechanism to list multiple "Total Battle" in-game names/aliases associated with their website account. This list is used for filtering data views.
      - Input should allow adding/removing aliases via a simple text list interface.
      - Basic format validation should be applied (e.g., check for valid characters, reasonable length).
      - Prevent duplicate entries within the same user's list.
      - Provide visual feedback if an entered alias matches a player name existing in the chest database (e.g., a checkmark icon).
      - Consider allowing users to select from a dropdown/autocomplete list of player names already present in the database.
  - **Read-Only Fields (Displayed):**
    - Assigned Role(s).
    - Assigned Rank(s).
    - Assigned Clan(s).
- **Logout:** Users can securely log out, terminating their session.

#### 3.2.1. User Deactivation/Deletion

- **Policy:** When a user account is deactivated or deleted (action performed by Admin/Owner):
  - User login will be disabled.
  - Associated chest data entries should be retained by default.
  - User-generated content (articles, comments) should be retained by default, possibly attributed to a generic "Former Member" or anonymized state.
  - (Detailed handling, like options for full data deletion upon request, can be reviewed post-MVP).

### 3.3. Clan & Rank System

This section details the management of Clans and Ranks.

- **Clan Management (Owner/Admin Interface - Admin Panel):**
  - A dedicated section within an Admin Panel is required.
  - **Actions:**
    - Create New Clan (Owner only).
    - Edit Clan Details (Name, Description).
    - View Clan Members.
    - Add Registered User to Clan.
    - Remove User from Clan.
- **Rank Definition:**
  - The five ranks (Leader, Superior, Officer, Veteran, Soldier) are predefined.
  - The system associates each rank with its default role (Admin, Moderator, Editor, Member, Member respectively).
  - Future enhancements might allow Owners to customize rank names or add new ranks, but this is not required for MVP.
- **User Management (Admin/Moderator Interface - Admin Panel):**
  - A dedicated section within an Admin Panel for user management.
  - **Actions:**
    - View All Users (filterable by Clan, Role, Rank, Status (Guest/Active)).
    - Assign/Change User Role.
    - Assign/Change User Rank within a specific Clan.
    - Activate "Guest" user (implicitly by assigning Role/Rank/Clan).
    - Deactivate/Suspend User Account.
    - Manage Cross-Clan Permissions (Admin/Owner only, see Sec 3.4).

### 3.4. Permissions System

This section describes how access control is enforced based on Role, Rank, and Clan.

- **Core Principle:** A user's effective permissions are the _sum_ of permissions granted by their Role and their Rank, scoped by the Clan context they are currently operating within (if applicable).
- **Permission Granularity:** The system needs a mechanism to define and check specific permissions. Examples include:
  - `article:create`, `article:edit:own`, `article:edit:any`, `article:delete:own`, `article:delete:any`, `article:approve`
  - `comment:create`, `comment:edit:own`, `comment:edit:any`, `comment:delete:own`, `comment:delete:any`
  - `user:manage:role`, `user:manage:rank`, `user:manage:clan_assignment`, `user:view_directory`
  - `profile:edit:own`, `profile:view:any`
  - `data:import`, `data:view`, `data:edit`, `data:delete`, `data:batch_edit`, `data:batch_delete`
  - `rules:manage` (for validation/correction/scoring)
  - `event:create`, `event:edit`, `event:delete`
  - `message:send:private`, `message:send:broadcast`
  - `admin_panel:view`
- **Role-Based Permissions:** Each Role (Owner, Admin, Mod, Editor, Member, Guest) will have a base set of predefined permissions associated with it.
- **Rank-Based Permissions:** Each Rank can grant _additional_ specific permissions on top of the user's Role-based permissions (e.g., a high-rank Member might gain `article:approve`).
- **Clan Scoping:**
  - By default, most permissions are clan-specific. An Editor in Clan A cannot edit articles for Clan B unless explicitly granted cross-clan permission.
  - Chest data and scoring rules are segregated by Clan. Validation and correction rules are global.
  - **Cross-Clan Permissions:** An interface for Owners/Admins is required to grant specific users specific permissions across multiple clans (e.g., allowing a high-ranking Moderator to oversee discussions in several clans).
- **Implementation:** Permissions checks must be implemented consistently across the application (API routes (tRPC), UI components) to ensure secure and correct access control.

### 3.5. Member Dashboard

This is the main landing page for authenticated users after login (excluding Guests).

- **Layout:** Modern dashboard design, featuring a persistent left-hand navigation bar (similar to Discord) listing main application sections/features.
- **Default Components (MVP):**
  - **Announcements:** Display of currently active, pinned announcements for the user's clan(s).
  - **News Feed:** A stream of recent news articles relevant to the user's clan(s).
  - **Personal Chest Stats:** A summary section showing key statistics and potentially a chart derived from the user's associated game account data.
  - **Clan Chest Stats:** A summary section showing key statistics and potentially a chart for the overall clan's data.
  - **Quick Links:** A configurable section for important links (managed by Admins).
- **Customization (Initial):**
  - Users should be able to configure (via their Profile Settings page) which optional dashboard components are visible (e.g., hide Clan Stats, show only Personal Stats).
  - Simple show/hide toggles are sufficient for MVP. More complex layout customization is post-MVP.
- **Data Display:** The dashboard must correctly filter and display data relevant to the user's clan memberships and their linked game account aliases.

### 3.6. News, Announcements & Discussions

This section details the features for clan communication and information sharing.

- **Content Creation:**
  - Users with appropriate permissions (e.g., `article:create`) can create/edit News Articles and Announcements.
  - A rich text editor should be provided, allowing basic formatting (bold, italic, lists), embedding images, and potentially videos. Advanced features like tables or code blocks are not required for MVP.
  - Content can be targeted to specific Clans or marked as global (visible to all members).
- **Announcements:**
  - A special type of article that can be marked as "pinned".
  - Pinned announcements appear at the top of the main News Feed and on the Member Dashboard.
- **Approval Workflow:**
  - A system setting (configurable by Admins) should allow Members (with `article:submit` permission, granted by default) to submit articles.
  - Submitted articles enter a pending state and require approval from a user with `article:approve` permission before becoming visible.
- **Discussions (Reddit-Style):**
  - Each News Article / Announcement will have an associated discussion thread.
  - Users with `comment:create` permission (Members+) can post comments.
  - Comments should support basic threading.
  - Implement **up-voting** (only) and reaction emotes on comments and articles.
  - Support sorting comments (e.g., by time, by upvotes) and basic text search within comments of an article.
- **Moderation:**
  - Users with appropriate permissions (e.g., `comment:edit:any`, `comment:delete:any`, `article:edit:any`, `article:delete:any`) can moderate content.

### 3.7. Data Import & Preview

This section covers the process of getting chest data into the system.

- **CSV Upload Interface:** A dedicated page or section accessible to users with `data:import` permission to upload CSV files.
- **Parsing Logic:**
- The system must correctly parse CSV files adhering to **Pattern 1** (standard columns: DATE, PLAYER, SOURCE, CHEST, SCORE, CLAN) as shown in `Documentation/data_example.csv`.
- **Error Handling:** Provide a summary list of parsing errors (no per‑row error list in the UI).
- **Client-Side Preview:**
- After parsing, the data must be displayed in an interactive table view within the user's browser.
  - This preview table supports sorting, filtering, pagination, and row selection.
  - The preview data resides temporarily in the browser memory; persistence is not required if the user navigates away.
- **Validation/Correction/Scoring in Preview:**
  - Validation and Correction toggles are available in the UI (on by default).
  - Corrections run before validation; corrected cells are highlighted.
  - Users can add validation/correction rules from a row action.
  - Scoring is deferred (not yet implemented in preview).
- **Commit to Database:**
  - A clear action (e.g., "Commit Data" button) allows the user to save the processed (validated, corrected, scored) preview data to the Supabase database.
  - Committed data must be associated with the correct Clan.
  - The system should **allow potential duplicates** upon commit, as reliable duplication detection is difficult. Responsibility lies with the user/admins managing the data.
  - If invalid rows exist, a warning modal offers **skip** or **force** commit.
- **Metadata Tracking:** For each committed data row, the database must store:
  - `createdAt`: Timestamp of initial commit.
  - `createdBy`: User ID of the user who committed the data.
  - `updatedAt`: Timestamp of the last modification.
  - `updatedBy`: User ID of the user who last modified the data.
- **User Feedback:** The UI must provide clear, non-blocking feedback during file upload, parsing (especially for large files), validation/correction processes, and the final commit step.
- **Rule Management:**
  - Initial validation and correction rules for MVP will be pre-defined.
  - **Admin Rule Management UI (MVP):** A dedicated admin page is required for managing Validation, Correction, and Scoring rules. Validation and correction rules are **global** (not clan-specific); scoring rules remain per-clan. This interface should allow authorized users (e.g., Admins with `rules:manage` permission) to create, view, edit, and delete rules for each category within a unified management area.

### 3.8. Scoring System

This system assigns scores to chest data entries based on configurable rules.

- **Purpose:** To standardize scoring for data imported via Pattern 1 and allow potential re-scoring of any data.
- **Rule Definition:**
  - Scoring rules are defined per Clan.
  - Each rule specifies matching criteria based on:
    - Chest Name (exact match or pattern).
    - Source Name (exact match or pattern).
    - Level or Level Range (matching against `min_level`/`max_level`).
  - Each rule defines a numeric Score to be assigned if the criteria match.
  - Rules have an **order** field for precedence.
- **Rule Application:**
- Applied automatically during the preview stage (if enabled via toggle setting) for imported data.
  - **Precedence:** When multiple rules match, the rule with the **lowest order number** (highest priority) takes precedence. The UI for rule management should provide visual feedback on potential overlaps/overrides.
  - **Re-scoring (MVP):** The system must allow authorized users (via Admin Panel or Data Viewing page) to select existing data and re-apply the current scoring rules.
- **Storage:** The calculated score must be stored as a dedicated field alongside each chest data entry in the Supabase database.
- **Rule Management:**
  - Initial scoring rules for MVP will be pre-defined.
  - Scoring rules will be managed via the unified Admin Rule Management UI described in Section 3.7.

### 3.9. Data Visualization

This section covers the graphical display of chest data.

- **Purpose:** Provide visual insights into personal and clan performance based on chest data.
- **Location:**
  - **Dashboard Components (MVP):** Key summary charts and statistics displayed directly on the Member Dashboard (see Sec 3.5).
  - **Dedicated Charts/Stats Page (MVP):** A dedicated page must provide more detailed charts and statistics, allowing for deeper analysis than the dashboard summaries. This page should offer more chart types and potentially more filtering/grouping options (e.g., filter by date range, player, source).
- **Chart Types (Examples - MVP):**
  - Bar/Pie chart: Chest counts by type.
  - Bar chart: Chest counts/Total score by player (top N players).
  - Line chart: Score accumulated over time (personal/clan).
  - Table: Summary statistics (e.g., total chests, total score, average score per chest).
  - (Specific charts for dashboard vs. dedicated page to be finalized during design/implementation).
- **Data Filtering:** Charts must reflect the appropriate data scope (personal data based on user's linked game aliases, or overall clan data).
- **Technology:** Utilize a suitable JavaScript charting library compatible with the tech stack. Potential options include **Recharts**, **Nivo**, or **Chart.js**. Selection based on ease of integration, feature set, and performance.

### 3.10. Data Viewing & Editing

This section describes the interface for interacting with committed chest data in the database.

- **Purpose:** Allow authorized users to browse, search, modify, and delete the clan's historical chest data.
- **Interface:** A dedicated page featuring an interactive table view displaying data queried from Supabase.
- **Table Features:**
  - Display all relevant columns (incl. Chest Collected Date, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `min_level`, `max_level`).
  - Sorting by any column.
  - Filtering based on criteria across one or more columns.
  - **Pagination:** Must be implemented to efficiently handle large datasets.
- **Inline Editing:** Users with `data:edit` permission can directly edit cell values within the table. Player, source, and chest fields use combobox inputs that show filterable suggestions from validation rules.
- **Correction/Validation:** Corrections are applied before validation on save; corrected values are stored. Per-row actions allow adding correction and validation rules directly from the table.
- **Batch Operations (MVP):**
  - Users must be able to select multiple rows.
  - Provide functionality for **Batch Edit** (e.g., change the Source for all selected rows) and **Batch Delete** for selected rows (subject to `data:batch_edit` / `data:batch_delete` permissions).
- **Visual Highlighting:** The table must display the current validation/correction status of data using the same visual cues as the preview table.
- **Permissions:** Access to view the data (`data:view`) might be broad, but editing (`data:edit`) and batch operations must be strictly controlled.
- **Audit Trail:** All direct data modifications (single edits, batch edits, deletions) made through this interface must be logged, recording the user ID, timestamp, affected row(s), and nature of the change.
- **Data Integrity:** Edits made through this interface directly modify the data in the Supabase database. Changes should potentially trigger re-validation or status updates.

### 3.11. Event Calendar

Provides a shared calendar for clan-related events.

- **View:** Display a calendar (e.g., monthly view) showing upcoming events.
- **Event Creation:** Users with `event:create` permission can create single or recurring events (daily, weekly, biweekly, monthly).
  - Event details: Title, Date/Time (start/end or open-ended), Description, Location, Organizer, Recurrence, Target Clan(s).
  - Event templates for reusable event configurations.
- **Event Editing/Deletion:** Users with `event:edit`/`event:delete` permission can modify or delete existing events.
- **Integration:** Events can potentially be linked to or mentioned in News articles/Announcements.
- **Visibility:** Events are typically visible to all members of the targeted clan(s).

### 3.12. Member Directory

Allows members to see who else is in their clan(s).

- **View:** A page displaying a list or grid of members.
- **Filtering/Sorting:** Ability to filter the directory by Clan and potentially sort by Rank or Name.
- **Displayed Information:** For each member, show:
  - Website Display Name/Alias.
  - Assigned Rank(s).
  - Assigned Clan(s).
  - User-provided Game Account Aliases.
  - (Profile Picture/Icon based on Rank - TBD asset).
- **Permissions:** Visible to all authenticated members (excluding Guests).

### 3.13. Private Messaging & Notifications

Enables communication between members and system alerts.

- **Private Messaging (MVP - Basic):**
  - Users with `message:send:private` permission can send direct messages to other individual users within their clan(s).
  - A simple inbox/messaging interface is required.
  - Basic text messaging is sufficient for MVP.
- **Admin Broadcasts:** Users with `message:send:broadcast` permission (e.g., Admin+) can send messages to all members of a specific Clan.
- **Notifications System:**
  - A mechanism to display notifications to users (e.g., a notification icon in the header/navbar).
  - **Notification Triggers (Examples):**
    - New News Article/Announcement published for their clan.
    - Comment reply in a discussion they are involved in.
    - New private message received.
    - Article submitted for approval (for Editors+).
    - Upcoming event reminder.
  - Users should be able to mark notifications as read (**automatically upon viewing** the notification list/details).
  - Notification settings: per-type toggles (messages, news, events, system) configurable in the bell dropdown and on the Settings page.

### 3.14. Multi-language Support

Ensures the application interface is available in multiple languages.

- **Languages (Initial):** German (de) as the default language, English (en) as the secondary language.
- **Implementation:** Uses `next-intl` for internationalization, with translation files at `messages/de.json` and `messages/en.json`.
- **Scope:** All user-facing UI text (labels, buttons, messages, etc.) must be translatable.
- **Language Selection:**
  - Users can select their preferred language in their Profile Settings.
  - The application should attempt to detect the user's browser language preference on first visit (before login or if no preference is set).
- **Content:** User-generated content (articles, comments, messages) is _not_ automatically translated. The language preference only affects the application's UI strings.

## 4. Acceptance Criteria

### 4.1 Community Hub

_Given_ a clan member visits the landing page  
_When_ they view announcements and news sections  
_Then_ they see pinned announcements and a news feed filtered by their clan(s).

### 4.2 Data Analysis

_Given_ a clan member has chest CSV data  
_When_ they upload via the data import feature  
_Then_ they see parsed results, can commit, and get a confirmation.

### 4.3 Profile Management

_Given_ an authenticated user  
_When_ they update their profile fields  
_Then_ changes persist and reflect in their session/profile view.

## 5. Prioritization & Milestones

| Feature                   | Priority     | Status      |
| ------------------------- | ------------ | ----------- |
| Public Home Page          | Must Have    | Implemented |
| User Authentication       | Must Have    | Implemented |
| Data Import & Preview     | Must Have    | Implemented |
| Chest Data Visualization  | Should Have  | Implemented |
| Clan User Management      | Should Have  | Implemented |
| Forum & Discussions       | Nice to Have | Implemented |
| Recurring Events          | Should Have  | Implemented |
| Messaging & Notifications | Should Have  | Implemented |
| CMS (inline-editable)     | Should Have  | Implemented |
| Dashboard Widgets         | Nice to Have | Not started |
| Member Directory          | Nice to Have | Not started |

## 6. Non-Functional Requirements

- **Performance:** Handle up to 100 concurrent users with page load times < 1s (SSR/SSG caches).
- **Scalability:** Use serverless infrastructure (Vercel functions, Supabase) to scale horizontally without downtime.
- **Security:** HTTPS everywhere, secure cookies, OWASP Top 10 mitigations, input validation and rate limiting (max 100 requests/min per user).
- **Maintenance:** Automated backups in Supabase, monitoring & alerting for errors (Sentry), logging for audit trails.
- **Accessibility:** Compliance with WCAG 2.1 AA (keyboard navigation, color contrast >= 4.5:1, ARIA roles).
