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

### user_aliases
- id (uuid, pk)
- user_id (uuid, fk users)
- alias (text)
- created_at (timestamp)

### clans
- id (uuid, pk)
- name (text, unique)
- description (text)
- created_at (timestamp)
- updated_at (timestamp)

### game_accounts
- id (uuid, pk)
- user_id (uuid, fk users)
- game_username (text)
- display_name (text, nullable)
- created_at (timestamp)
- updated_at (timestamp)

### game_account_clan_memberships
- id (uuid, pk)
- game_account_id (uuid, fk game_accounts)
- clan_id (uuid, fk clans)
- rank (text, enum: leader, superior, officer, veteran, soldier)
- role (text, enum: owner, admin, moderator, editor, member, guest)
- is_active (bool)
- created_at (timestamp)
- updated_at (timestamp)

### roles
- id (uuid, pk)
- name (text, unique)
- description (text)

### ranks
- id (uuid, pk)
- name (text, unique)
- description (text)

### permissions
- id (uuid, pk)
- name (text, unique)
- description (text)

### role_permissions
- id (uuid, pk)
- role_id (uuid, fk roles)
- permission_id (uuid, fk permissions)

### rank_permissions
- id (uuid, pk)
- rank_id (uuid, fk ranks)
- permission_id (uuid, fk permissions)

### cross_clan_permissions
- id (uuid, pk)
- user_id (uuid, fk users)
- permission_id (uuid, fk permissions)
- clan_id (uuid, fk clans, nullable for global)
- created_at (timestamp)

### articles
- id (uuid, pk)
- clan_id (uuid, fk clans)
- title (text)
- content (text)
- type (text, enum: news, announcement)
- is_pinned (bool)
- status (text, enum: draft, pending, published)
- tags (text[])
- created_by (uuid, fk users)
- created_at (timestamp)
- updated_at (timestamp)

### events
- id (uuid, pk)
- clan_id (uuid, fk clans)
- title (text)
- description (text)
- location (text, nullable)
- starts_at (timestamp)
- ends_at (timestamp)
- created_by (uuid, fk users)
- created_at (timestamp)
- updated_at (timestamp)

### comments
- id (uuid, pk)
- article_id (uuid, fk articles)
- parent_id (uuid, fk comments, nullable)
- content (text)
- created_by (uuid, fk users)
- created_at (timestamp)

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
- clan_id (uuid, fk clans)
- field (text)
- match_value (text)
- status (text, enum: valid, invalid)
- created_at (timestamp)
- updated_at (timestamp)

### correction_rules
- id (uuid, pk)
- clan_id (uuid, fk clans)
- field (text)
- match_value (text)
- replacement_value (text)
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

### events
- id (uuid, pk)
- clan_id (uuid, fk clans)
- title (text)
- description (text)
- start_at (timestamp)
- end_at (timestamp)
- created_by (uuid, fk users)
- created_at (timestamp)

### messages
- id (uuid, pk)
- clan_id (uuid, fk clans)
- sender_id (uuid, fk users)
- recipient_id (uuid, fk users, nullable for broadcast)
- content (text)
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
- rules:manage, event:create, event:edit, event:delete
- message:send:private, message:send:broadcast
- admin_panel:view

### Moderator
- article:edit:any, article:delete:any, article:approve
- comment:edit:any, comment:delete:any
- data:view
- event:create, event:edit
- message:send:private
- admin_panel:view

### Editor
- article:create, article:edit:own, article:delete:own
- comment:create, comment:edit:own, comment:delete:own
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

## Rank Add‑Ons (Examples)
- Leader: +article:approve, +rules:manage, +message:send:broadcast
- Superior: +comment:delete:any
- Officer: +article:edit:any
- Veteran: +event:create
- Soldier: no additional permissions

## Notes
- All clan-scoped permissions should be enforced by Supabase RLS.
- Global access should be modeled via `cross_clan_permissions`.
