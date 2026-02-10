# Data Model And Permission Matrix

This document defines the core data model (Supabase/Postgres) and the permission matrix for clan-scoped access control.

## Core Entities (Tables)

### users

- id (uuid, pk)
- email (text, unique)
- display_name (text)
- preferred_language (text, default: "de")
- country (text, nullable)
- status (text, enum: guest, active, suspended)
- created_at (timestamp)
- updated_at (timestamp)

### profiles

- id (uuid, pk)
- email (text, unique)
- user_db (text, unique)
- username (text)
- display_name (text)
- default_clan_id (uuid, fk clans, nullable)
- default_game_account_id (uuid, fk game_accounts, nullable) — user's preferred default game account for sidebar selector
- created_at (timestamp)
- updated_at (timestamp)

### clans

- id (uuid, pk)
- name (text, unique)
- description (text)
- is_default (boolean, default: false)
- is_unassigned (boolean, default: false)
- created_at (timestamp)
- updated_at (timestamp)

### game_accounts

- id (uuid, pk)
- user_id (uuid, fk users)
- game_username (text)
- created_at (timestamp)
- updated_at (timestamp)

### game_account_clan_memberships

- id (uuid, pk)
- game_account_id (uuid, fk game_accounts)
- clan_id (uuid, fk clans)
- rank (text, enum: leader, superior, officer, veteran, soldier)
- is_active (bool)
- created_at (timestamp)
- updated_at (timestamp)

### user_roles

- user_id (uuid, pk, fk users)
- role (text, enum: owner, admin, moderator, editor, member, guest)
- created_at (timestamp)
- updated_at (timestamp)

> **Note:** Tables `roles`, `ranks`, `permissions`, `role_permissions`, `rank_permissions`, and `cross_clan_permissions` have been removed. Permissions are now defined in `lib/permissions.ts` as a static map. Ranks on `game_account_clan_memberships` are cosmetic only (reflecting in-game rank with no functional impact).

### articles (announcements)

- id (uuid, pk)
- clan_id (uuid, fk clans)
- title (text)
- content (text) — markdown content, pre-processed with `normalizeContent()` for display
- type (text, default: 'announcement') — all content is now type "announcement"
- is_pinned (bool)
- status (text, enum: draft, pending, published)
- tags (text[])
- banner_url (text, nullable) — optional banner image URL for card header (template path or uploaded URL)
- created_by (uuid, fk users) — original author, never overwritten on edit
- updated_by (uuid, fk users, nullable) — user who last edited the article
- created_at (timestamp)
- updated_at (timestamp)

### events

- id (uuid, pk)
- clan_id (uuid, fk clans)
- title (text)
- description (text)
- location (text, nullable)
- starts_at (timestamp)
- ends_at (timestamp) — computed from starts_at + duration; same as starts_at for open-ended events
- organizer (text, nullable) — free text or game account name
- recurrence_type (text, default: 'none') — none | daily | weekly | biweekly | monthly
- recurrence_end_date (date, nullable) — null means ongoing if recurrence_type != 'none'
- created_by (uuid, fk users)
- created_at (timestamp)
- updated_at (timestamp)

### event_templates

- id (uuid, pk)
- clan_id (uuid, fk clans)
- name (text) — always equals title (kept for backward compat)
- title (text)
- description (text, default: '')
- location (text, nullable)
- duration_hours (numeric(5,2), default: 1)
- is_open_ended (boolean, default: true)
- organizer (text, nullable)
- recurrence_type (text, default: 'none')
- recurrence_end_date (date, nullable)
- created_by (uuid, nullable) — templates don't require an author
- created_at (timestamp)
- updated_at (timestamp)

### forum_votes

- id (uuid, pk)
- post_id (uuid, fk forum_posts)
- user_id (uuid, fk users)
- vote (integer) — +1 or -1
- created_at (timestamp)

> Unique constraint on `(post_id, user_id)`.

### forum_comments

- id (uuid, pk)
- post_id (uuid, fk forum_posts)
- parent_id (uuid, fk forum_comments, nullable)
- content (text) — markdown
- created_by (uuid, fk users)
- upvotes (integer, default: 0)
- downvotes (integer, default: 0)
- created_at (timestamp)
- updated_at (timestamp)

### forum_comment_votes

- id (uuid, pk)
- comment_id (uuid, fk forum_comments)
- user_id (uuid, fk users)
- vote (integer) — +1 or -1
- created_at (timestamp)

> Unique constraint on `(comment_id, user_id)`.

### notifications

- id (uuid, pk)
- user_id (uuid, fk users)
- type (text, enum: message, news, event, approval)
- title (text)
- body (text, nullable)
- link (text, nullable)
- is_read (boolean, default: false)
- created_at (timestamp)

### user_notification_settings

- user_id (uuid, pk, fk users)
- messages (boolean, default: true)
- news (boolean, default: true)
- events (boolean, default: true)
- system (boolean, default: true)
- updated_at (timestamp)

### site_content

- page (text)
- section_key (text)
- field_key (text)
- content_de (text)
- content_en (text)
- updated_by (uuid, fk users, nullable)
- updated_at (timestamp)

> Composite PK on `(page, section_key, field_key)`. RLS: public read, admin-only write.

### site_list_items

- id (uuid, pk)
- page (text)
- section_key (text)
- sort_order (integer)
- text_de (text)
- text_en (text)
- badge_de (text, nullable)
- badge_en (text, nullable)
- link_url (text, nullable)
- icon (text, nullable)
- icon_type (text, nullable) — "preset" or "custom"

> Composite index on `(page, section_key, sort_order)`. RLS: public read, admin-only write.

### chest_entries

- id (uuid, pk)
- clan_id (uuid, fk clans)
- collected_date (date)
- player (text)
- source (text)
- chest (text)
- score (integer)
- created_at (timestamp)
- created_by (uuid, fk users)
- updated_at (timestamp)
- updated_by (uuid, fk users)

### validation_rules

- id (uuid, pk)
- clan_id (uuid, fk clans, **nullable** — rules are global, not clan-specific)
- field (text)
- match_value (text)
- status (text, enum: valid, invalid)
- created_at (timestamp)
- updated_at (timestamp)

### correction_rules

- id (uuid, pk)
- clan_id (uuid, fk clans, **nullable** — rules are global, not clan-specific)
- field (text)
- match_value (text)
- replacement_value (text)
- status (text, enum: active, inactive)
- created_at (timestamp)
- updated_at (timestamp)

### scoring_rules

- id (uuid, pk)
- clan_id (uuid, fk clans)
- chest_match (text)
- source_match (text)
- min_level (integer, nullable)
- max_level (integer, nullable)
- score (integer)
- rule_order (integer)
- created_at (timestamp)
- updated_at (timestamp)

### audit_logs

- id (uuid, pk)
- clan_id (uuid, fk clans)
- actor_id (uuid, fk users)
- action (text)
- entity (text)
- entity_id (uuid)
- diff (jsonb)
- created_at (timestamp)

### forum_categories

- id (uuid, pk)
- clan_id (uuid, fk clans)
- name (text)
- description (text, default: '')
- sort_order (integer, default: 0)
- created_at (timestamp)
- updated_at (timestamp)

### forum_posts

- id (uuid, pk)
- clan_id (uuid, fk clans)
- category_id (uuid, fk forum_categories)
- title (text)
- content (text) — markdown content
- created_by (uuid, fk users)
- is_pinned (bool, default: false) — pinned posts always appear at top
- is_locked (bool, default: false)
- upvotes (integer, default: 0)
- downvotes (integer, default: 0)
- view_count (integer, default: 0)
- created_at (timestamp)
- updated_at (timestamp)

### messages

- id (uuid, pk)
- clan_id (uuid, fk clans)
- sender_id (uuid, fk users)
- recipient_id (uuid, fk users, nullable for broadcast)
- content (text)
- message_type (text, enum: private, broadcast, system, clan)
- created_at (timestamp)

## Permission Matrix (Baseline)

Permissions are additive: Role + Rank + Cross‑Clan overrides.

### Owner

- Full access to all permissions across all clans.

### Administrator

- user:manage:role, user:manage:rank, user:manage:clan_assignment
- article:create, article:edit:any, article:delete:any, article:approve
- comment:edit:any, comment:delete:any
- data:import, data:view, data:edit, data:delete, data:batch_edit, data:batch_delete
- rules:manage, event:create, event:edit, event:delete, event_template:manage
- message:send:private, message:send:broadcast
- admin_panel:view

### Moderator

- article:edit:any, article:delete:any, article:approve
- comment:edit:any, comment:delete:any
- data:view
- event:create, event:edit, event:delete
- event_template:manage
- message:send:private
- admin_panel:view

### Editor

- article:create, article:edit:own, article:delete:own
- comment:create, comment:edit:own, comment:delete:own
- event:create, event:edit, event:delete
- event_template:manage
- data:view
- message:send:private

### Member

- article:create, article:edit:own
- comment:create, comment:edit:own, comment:delete:own
- data:view
- profile:edit:own
- message:send:private

### Guest

- profile:edit:own (limited)
- admin_panel:view (restricted to onboarding screen)

## Ranks

Ranks on `game_account_clan_memberships` are **cosmetic only** — they reflect the in-game rank (Leader, Superior, Officer, Veteran, Soldier) and have no functional impact on permissions. All access control is determined by the user's role in `user_roles`.

## Notes

- All clan-scoped permissions should be enforced by Supabase RLS.
- Roles are global per user via `user_roles`; memberships track rank (cosmetic) and active status only.
- Permission checks use `lib/permissions.ts` — a static map from role to permission strings. Components call `hasPermission(role, 'permission:name')` or `canDo(role, ...)`, never hardcoded role comparisons.
- SQL RLS uses `has_permission(text)` function that mirrors the TypeScript map.
- Correction rules are queried with an index on `(field, match_value)` for matching performance (rules are global, not clan-specific).
- Content management (announcements, events, templates) is restricted to users with roles: owner, admin, moderator, or editor. Enforced via `useUserRole` hook and `isContentManager()` from `lib/permissions.ts`.
- Event templates mirror the events data model exactly. The `name` column is kept for backward compatibility but always equals `title`.
- Recurring events use a single DB row with `recurrence_type` and optional `recurrence_end_date`. Occurrences are computed client-side. The legacy `recurrence_parent_id` column is dropped.
- Author information on events/announcements is resolved client-side from `created_by` UUIDs via a separate profiles query (no FK join).
- Announcements page uses server-side pagination with Supabase `.range()` and `{ count: "exact" }`. Filters include search (title/content), tag, and date range. Type filter removed (all content is announcements).
- Announcements feature banner images: 6 pre-built templates from `/assets/banners/` plus custom upload. Cards display with banner header, title overlay, expandable content preview, and edit tracking.
- Announcements editing never overwrites `created_by`; `updated_by` tracks the last editor. Displayed as "bearbeitet von {name} am {date}".
- Forum system: categories managed via admin API route (`/api/admin/forum-categories`) with service role client to bypass RLS. Posts support markdown, thumbnails, pinning, and voting.
- Messages page uses themed `RadixSelect` dropdowns for compose recipient (with search) and broadcast clan selection instead of native `<select>`.
- `ClanScopeBanner` and `QuickActions` components have been removed from all pages.
- Default game account: `profiles.default_game_account_id` prioritized in sidebar selector over localStorage.
- Project branding: "[THC] Chiller & Killer" throughout all pages, sidebar title "[THC]" with subtitle "Chiller & Killer".
