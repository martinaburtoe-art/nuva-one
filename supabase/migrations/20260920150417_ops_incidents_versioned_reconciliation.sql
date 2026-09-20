-- Reconcile the production ops_incidents table that was validated before
-- the feature was merged. Idempotent so fresh and existing environments converge.
create table if not exists public.ops_incidents (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null,
  check_name text not null,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  status text not null default 'open' check (status in ('open', 'resolved')),
  summary text not null check (char_length(summary) <= 500),
  details jsonb not null default '{}'::jsonb,
  consecutive_failures integer not null default 1 check (consecutive_failures >= 1),
  triage jsonb,
  opened_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  notified_at timestamptz
);

create unique index if not exists ops_incidents_one_open_per_fingerprint
  on public.ops_incidents (fingerprint)
  where status = 'open';

create index if not exists ops_incidents_status_opened_idx
  on public.ops_incidents (status, opened_at desc);

alter table public.ops_incidents enable row level security;
revoke all on table public.ops_incidents from public, anon, authenticated;
grant select, insert, update on table public.ops_incidents to service_role;
drop policy if exists "Deny public access" on public.ops_incidents;
create policy "Deny public access"
  on public.ops_incidents
  for all
  to anon, authenticated
  using (false)
  with check (false);
