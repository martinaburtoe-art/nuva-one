create table if not exists public.nuva_integration_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  connection_id uuid references public.nuva_integration_connections(id) on delete set null,
  provider text not null,
  external_event_id text not null,
  event_type text not null,
  direction text not null check (direction in ('in','out')),
  status text not null default 'received' check (status in ('received','processing','processed','failed','ignored')),
  payload jsonb not null default '{}'::jsonb,
  payload_hash text,
  normalized jsonb not null default '{}'::jsonb,
  error text,
  retry_count integer not null default 0 check (retry_count >= 0),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, provider, external_event_id)
);

create index if not exists idx_nuva_integration_events_business_received
  on public.nuva_integration_events (business_id, received_at desc);
create index if not exists idx_nuva_integration_events_processing
  on public.nuva_integration_events (status, received_at);

alter table public.nuva_integration_events enable row level security;

create policy "Members see integration events"
  on public.nuva_integration_events for select to authenticated
  using (private.is_business_member(business_id, (select auth.uid())));

revoke all on public.nuva_integration_events from anon;
grant select on public.nuva_integration_events to authenticated;

create or replace function public.set_nuva_integration_event_updated_at()
returns trigger language plpgsql security invoker set search_path = public
as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;

drop trigger if exists trg_nuva_integration_event_updated_at on public.nuva_integration_events;
create trigger trg_nuva_integration_event_updated_at
before update on public.nuva_integration_events
for each row execute function public.set_nuva_integration_event_updated_at();

revoke execute on function public.set_nuva_integration_event_updated_at() from public;
grant execute on function public.set_nuva_integration_event_updated_at() to authenticated;
