-- Shadow membership: allows admins to join a clan for debugging
-- without appearing in member counts, directory, or clan broadcasts.
--
-- Shadow memberships retain full RLS access (is_clan_member, is_clan_admin,
-- shares_clan_with_user all continue to match shadow rows). Filtering is
-- done at the application layer for public-facing displays.

alter table public.game_account_clan_memberships
  add column if not exists is_shadow boolean not null default false;

comment on column public.game_account_clan_memberships.is_shadow is
  'When true, membership grants data access but is hidden from member counts, directory, broadcasts, and notifications.';
