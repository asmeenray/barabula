-- Phase 16 (D-21, D-44): ordering column + Maybe bucket (day_number null). RLS unchanged.
-- Shape confirmed by Asmeen on 6 Oct 2026: "fractional" (position double precision, nullable).
-- Readers sort by day_number (nulls = Maybe, last), then position (nulls last), then id.
-- This file adds and backfills only: it deletes nothing, drops nothing and touches no policy.

alter table public.activities add column if not exists position double precision;
alter table public.activities alter column day_number drop not null;

-- Backfill: reproduce the pre-phase-16 on-screen order (groupByDay/timeRank in the old
-- itinerary page; oracle: src/lib/plan/legacy-order.ts legacyTimeRank).
--   morning/afternoon/evening/night (any case)  -> 0..3
--   h:mm AM|PM (any case)                       -> hours * 60 + minutes, 12 AM = 0, PM adds 12 unless 12
--   anything else (incl. empty and null)        -> 10 + the leading number parseFloat reads, else 10
-- Ties keep physical row order (the old page sorted the unordered fetch with a stable sort), then id.
-- Only rows whose position is still null are written, so re-running is a no-op.
with ranked as (
  select a.id,
         row_number() over (
           partition by a.itinerary_id, a.day_number
           order by
             case
               when lower(coalesce(a.time, '')) = 'morning'   then 0
               when lower(coalesce(a.time, '')) = 'afternoon' then 1
               when lower(coalesce(a.time, '')) = 'evening'   then 2
               when lower(coalesce(a.time, '')) = 'night'     then 3
               when coalesce(a.time, '') ~* '^\d{1,2}:\d{2}\s*(AM|PM)$' then
                 (case
                    when a.time ~* 'AM$' and split_part(a.time, ':', 1)::int = 12  then 0
                    when a.time ~* 'PM$' and split_part(a.time, ':', 1)::int <> 12 then split_part(a.time, ':', 1)::int + 12
                    else split_part(a.time, ':', 1)::int
                  end) * 60
                 + substring(a.time from '^\d{1,2}:(\d{2})')::int
               else 10 + coalesce(
                 substring(
                   regexp_replace(coalesce(a.time, ''), ':', '.')   -- first ':' only, like JS replace
                   from '^\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)'
                 )::numeric,
                 0)
             end,
             a.ctid,
             a.id
         ) as rn
  from public.activities a
)
update public.activities a
   set position = r.rn
  from ranked r
 where a.id = r.id
   and a.position is null;

create index if not exists activities_itinerary_day_position_idx
  on public.activities (itinerary_id, day_number, position);
