-- Phase 14: one chat per trip (D-07, D-11, D-26). Nothing is deleted.
-- trip_sessions can now hold many rows per user, each optionally linked to one itinerary.
-- chat_history rows belong to a session. Existing rows are backfilled, not removed.
-- Safe to re-run: every step uses IF NOT EXISTS, a dynamic constraint lookup or only touches null columns.

-- 1. trip_sessions: link to an itinerary (nullable; cascades like handover section 7)
alter table public.trip_sessions
  add column if not exists itinerary_id uuid references public.itineraries(id) on delete cascade;

-- 2. Drop every UNIQUE constraint that is exactly (user_id), whatever its name
do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.trip_sessions'::regclass
      and con.contype = 'u'
      and con.conkey = array[(
        select a.attnum
        from pg_attribute a
        where a.attrelid = 'public.trip_sessions'::regclass
          and a.attname = 'user_id'
      )]::smallint[]
  loop
    execute format('alter table public.trip_sessions drop constraint %I', c.conname);
  end loop;
end $$;

-- 3. Indexes (the dropped constraint was the only index on user_id)
create index if not exists trip_sessions_user_updated_idx
  on public.trip_sessions (user_id, updated_at desc);
create unique index if not exists trip_sessions_itinerary_id_key
  on public.trip_sessions (itinerary_id) where itinerary_id is not null;  -- one chat per itinerary

-- 4. chat_history.session_id
alter table public.chat_history
  add column if not exists session_id uuid references public.trip_sessions(id) on delete cascade;
create index if not exists chat_history_session_created_idx
  on public.chat_history (session_id, created_at);

-- 5. Backfill (D-11): users with chat rows but no session get one; then attach their messages
insert into public.trip_sessions (user_id)
select distinct ch.user_id
from public.chat_history ch
where not exists (
  select 1 from public.trip_sessions ts where ts.user_id = ch.user_id
);

update public.chat_history ch
set session_id = ts.id
from public.trip_sessions ts
where ch.session_id is null
  and ts.user_id = ch.user_id
  and (select count(*) from public.trip_sessions t2 where t2.user_id = ch.user_id) = 1;  -- unambiguous only

-- 6. Best-effort itinerary link (D-11): a finished session gets the user's earliest itinerary
--    created at or after the session row with a matching destination. The old route wrote the
--    session before inserting the itinerary, and updated_at only ever got its insert default.
--    Only users with exactly one session are linked, so two sessions can never claim one itinerary.
--    Ambiguous or no match: itinerary_id stays null.
update public.trip_sessions ts
set itinerary_id = (
  select i.id
  from public.itineraries i
  where i.user_id = ts.user_id
    and i.created_at >= ts.updated_at
    and i.destination ilike '%' || (ts.trip_state->>'destination') || '%'
    and not exists (
      select 1 from public.trip_sessions t3 where t3.itinerary_id = i.id
    )
  order by i.created_at asc
  limit 1
)
where ts.itinerary_id is null
  and ts.conversation_phase = 'itinerary_complete'
  and ts.trip_state->>'destination' is not null
  and (select count(*) from public.trip_sessions t2 where t2.user_id = ts.user_id) = 1;

-- 7. D-26: WITH CHECK ownership. A row may only point at a session or itinerary its owner owns.
drop policy if exists "Users can manage own trip session" on public.trip_sessions;
create policy "Users can manage own trip session"
  on public.trip_sessions for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      itinerary_id is null
      or exists (
        select 1 from public.itineraries i
        where i.id = trip_sessions.itinerary_id
          and i.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "Users can manage own chat history" on public.chat_history;
create policy "Users can manage own chat history"
  on public.chat_history for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and chat_history.session_id is not null
    and exists (
      select 1 from public.trip_sessions s
      where s.id = chat_history.session_id
        and s.user_id = (select auth.uid())
    )
  );
