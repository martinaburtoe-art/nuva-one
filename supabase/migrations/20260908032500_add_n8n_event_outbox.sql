create table if not exists public.n8n_event_outbox (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  provider text not null default 'n8n',
  source text not null default 'nuva_one',
  entity_type text not null,
  entity_id uuid,
  event_type text not null,
  occurred_at timestamptz not null default now(),
  idempotency_key text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','delivering','delivered','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint n8n_event_outbox_idempotency_key_check check (length(trim(idempotency_key)) between 1 and 180),
  constraint n8n_event_outbox_event_type_check check (event_type ~ '^[a-z][a-z0-9_.-]{2,80}$'),
  constraint n8n_event_outbox_entity_type_check check (entity_type ~ '^[a-z][a-z0-9_.-]{1,60}$')
);

create unique index if not exists n8n_event_outbox_business_idempotency_idx on public.n8n_event_outbox(business_id, idempotency_key);
create index if not exists n8n_event_outbox_delivery_idx on public.n8n_event_outbox(status, created_at);
create index if not exists n8n_event_outbox_business_created_idx on public.n8n_event_outbox(business_id, created_at desc);

alter table public.n8n_event_outbox enable row level security;

create policy "n8n outbox select by business membership"
  on public.n8n_event_outbox for select to authenticated
  using (exists (select 1 from public.business_members bm where bm.business_id = n8n_event_outbox.business_id and bm.user_id = auth.uid()));

create policy "n8n outbox insert by business membership"
  on public.n8n_event_outbox for insert to authenticated
  with check (exists (select 1 from public.business_members bm where bm.business_id = n8n_event_outbox.business_id and bm.user_id = auth.uid()));

create policy "n8n outbox update by business membership"
  on public.n8n_event_outbox for update to authenticated
  using (exists (select 1 from public.business_members bm where bm.business_id = n8n_event_outbox.business_id and bm.user_id = auth.uid()))
  with check (exists (select 1 from public.business_members bm where bm.business_id = n8n_event_outbox.business_id and bm.user_id = auth.uid()));

comment on table public.n8n_event_outbox is 'Durable tenant-scoped outbox for Nüva One -> n8n events. Secrets never stored here.';
