-- Phase 14: events and cost_log from handover Appendix B.
-- The usage-counter function and the clean-up jobs move to phase 15 with public.usage (D-25).

-- Product events (section 18). Written by the server only.
create table if not exists public.events (
  id          bigint generated always as identity primary key,
  user_id     uuid references public.users(id) on delete cascade,   -- or auth.users, see section 7 note
  name        text not null,          -- capture_started | capture_saved | capture_failed | plan_created | today_opened | tonight_opened | ask_used | export_done
  props       jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index if not exists events_name_time_idx on public.events (name, created_at desc);
create index if not exists events_user_time_idx on public.events (user_id, created_at desc);
alter table public.events enable row level security;
-- No client policies: inserts and reads go through the service role.

-- Cost log (phase 14): one row per paid or rate-limited call.
create table if not exists public.cost_log (
  id             bigint generated always as identity primary key,
  user_id        uuid references public.users(id) on delete set null,
  route          text not null,          -- /api/capture, /api/chat/message, /api/ask ...
  model          text,
  input_tokens   int,
  output_tokens  int,
  external_calls jsonb not null default '{}',   -- {"meta_oembed":1,"tiktok_oembed":0,"fsq":2}
  est_cost_usd   numeric(10,5),
  latency_ms     int,
  created_at     timestamptz not null default now()
);
create index if not exists cost_log_time_idx on public.cost_log (created_at desc);
alter table public.cost_log enable row level security;
