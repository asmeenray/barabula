-- Phase 14: catch-up for live schema drift (found 2026-10-05 in plan 14-13 from the live schema dump).
-- The live DB was built by hand from schema.sql and is missing the "Phase 8: Trip Sessions" block:
-- public.trip_sessions, its UNIQUE (user_id), RLS and policy. 20261005000050 needs that table.
-- The on_auth_user_created trigger on auth.users could not be checked from the dump, so it is
-- created here only if no trigger on auth.users already runs public.handle_new_user().
-- Safe to re-run and a no-op on any DB built from the baseline. No data changes, nothing dropped.
-- Sorts after 20260312100000 and before 20261005000050.

-- 1. trip_sessions, exactly as the baseline defines it (20260310000000).
--    The constraint name is the one Postgres generates for the baseline's UNIQUE (user_id);
--    20261005000050 drops it by column lookup, so the name only has to match for consistency.
create table if not exists public.trip_sessions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.users(id) on delete cascade,
  trip_state         jsonb default '{}',
  conversation_phase text default 'gathering_destination',
  updated_at         timestamptz default now(),
  constraint trip_sessions_user_id_key unique (user_id)
);

alter table public.trip_sessions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'trip_sessions'
      and policyname = 'Users can manage own trip session'
  ) then
    create policy "Users can manage own trip session"
      on public.trip_sessions for all
      to authenticated
      using ((select auth.uid()) = user_id);
  end if;
end $$;

-- 2. Signup trigger guard. Never drops or replaces an existing trigger; handle_new_user() is unchanged.
--    Skipped if a trigger named on_auth_user_created exists on auth.users, or if any other trigger
--    there already calls public.handle_new_user() (a second one would insert the profile twice).
do $$
begin
  if not exists (
    select 1
    from pg_trigger t
    where t.tgrelid = 'auth.users'::regclass
      and not t.tgisinternal
      and (
        t.tgname = 'on_auth_user_created'
        or t.tgfoid = 'public.handle_new_user()'::regprocedure
      )
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row
      execute procedure public.handle_new_user();
  end if;
end $$;
