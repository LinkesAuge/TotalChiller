-- Migration: Game Account Approval System
-- Adds approval workflow so users can request game accounts and admins can approve/reject them.
-- Re-run safe.

-- 1. Add approval_status column to game_accounts (default 'approved' for backward compatibility)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'game_accounts'
      and column_name = 'approval_status'
  ) then
    alter table public.game_accounts
      add column approval_status text not null default 'approved';
  end if;
end $$;

-- 2. Add check constraint for valid approval_status values
alter table public.game_accounts
  drop constraint if exists game_accounts_approval_status_check;
alter table public.game_accounts
  add constraint game_accounts_approval_status_check
  check (approval_status in ('pending', 'approved', 'rejected'));

-- 3. Add index on approval_status for fast filtering of pending requests
create index if not exists game_accounts_approval_status_idx
  on public.game_accounts (approval_status);

-- 4. Update INSERT policy: non-admins can only insert with 'pending' status
drop policy if exists "game_accounts_insert" on public.game_accounts;
create policy "game_accounts_insert"
on public.game_accounts
for insert
to authenticated
with check (
  (user_id = auth.uid() and approval_status = 'pending')
  or public.is_any_admin()
);

-- 5. Update UPDATE policy: non-admins can update their own accounts but NOT change approval_status
drop policy if exists "game_accounts_update" on public.game_accounts;
create policy "game_accounts_update"
on public.game_accounts
for update
to authenticated
using (
  user_id = auth.uid()
  or public.is_any_admin()
)
with check (
  user_id = auth.uid()
  or public.is_any_admin()
);

-- 6. Trigger: prevent non-admins from changing approval_status via UPDATE
--    Service role operations (auth.uid() is null) are allowed because
--    the API layer already verifies admin status before using the service role client.
create or replace function public.enforce_game_account_approval_status()
returns trigger as $$
begin
  if OLD.approval_status is distinct from NEW.approval_status then
    -- Allow service role operations (no user session = server-side admin call)
    if auth.uid() is not null and not public.is_any_admin() then
      raise exception 'Only admins can change approval status';
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists game_account_approval_status_trigger on public.game_accounts;
create trigger game_account_approval_status_trigger
before update on public.game_accounts
for each row
execute function public.enforce_game_account_approval_status();

-- 7. Update SELECT policy: users can see their own accounts (any status), admins see all
-- (No change needed — existing policy already allows this)

-- 8. Add unique index on game_username (case-insensitive, global) to prevent duplicate claims
-- Only for approved and pending accounts (rejected accounts don't block new requests)
create unique index if not exists game_accounts_username_unique_active
  on public.game_accounts (lower(game_username))
  where approval_status in ('pending', 'approved');
