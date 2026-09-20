create table if not exists public.nuva_action_queue (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  source text not null default 'nuva_intelligence',
  action_type text not null,
  title text not null,
  description text,
  priority text not null default 'medium' check (priority in ('critical','high','medium','opportunity')),
  impact integer not null default 50 check (impact between 0 and 100),
  mode text not null default 'review' check (mode in ('review','prepare')),
  destination text not null default 'dashboard',
  status text not null default 'pending' check (status in ('pending','approved','executing','completed','dismissed','failed')),
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists nuva_action_queue_business_status_idx
  on public.nuva_action_queue(business_id, status, priority, created_at desc);
create index if not exists nuva_action_queue_created_by_idx
  on public.nuva_action_queue(created_by, created_at desc);
create unique index if not exists nuva_action_queue_business_idempotency_idx
  on public.nuva_action_queue(business_id, idempotency_key)
  where idempotency_key is not null;

alter table public.nuva_action_queue enable row level security;

drop policy if exists "nuva actions select by business membership" on public.nuva_action_queue;
create policy "nuva actions select by business membership"
  on public.nuva_action_queue for select to authenticated
  using (exists (
    select 1 from public.business_members bm
    where bm.business_id = nuva_action_queue.business_id
      and bm.user_id = auth.uid()
  ));

drop policy if exists "nuva actions insert by business membership" on public.nuva_action_queue;
create policy "nuva actions insert by business membership"
  on public.nuva_action_queue for insert to authenticated
  with check (exists (
    select 1 from public.business_members bm
    where bm.business_id = nuva_action_queue.business_id
      and bm.user_id = auth.uid()
  ) and (created_by is null or created_by = auth.uid()));

drop policy if exists "nuva actions update by business membership" on public.nuva_action_queue;
create policy "nuva actions update by business membership"
  on public.nuva_action_queue for update to authenticated
  using (exists (
    select 1 from public.business_members bm
    where bm.business_id = nuva_action_queue.business_id
      and bm.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.business_members bm
    where bm.business_id = nuva_action_queue.business_id
      and bm.user_id = auth.uid()
  ));

comment on table public.nuva_action_queue is 'Tenant-scoped user-confirmed action queue produced by Nüva Intelligence. It stores proposed actions, not autonomous execution permissions.';
