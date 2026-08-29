create table if not exists public.nuva_studio_campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  goal text not null check (char_length(goal) between 1 and 12000),
  status text not null default 'active' check (status in ('active','paused','completed','cancelled')),
  cadence_hours integer not null default 24 check (cadence_hours between 1 and 720),
  max_cycles integer not null default 0 check (max_cycles between 0 and 1000),
  cycles_completed integer not null default 0 check (cycles_completed >= 0),
  next_run_at timestamptz not null default now(),
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.nuva_studio_campaign_cycles (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.nuva_studio_campaigns(id) on delete cascade,
  cycle_number integer not null check (cycle_number > 0),
  studio_job_id uuid references public.nuva_studio_jobs(id) on delete set null,
  objective text not null check (char_length(objective) between 1 and 12000),
  status text not null default 'queued' check (status in ('queued','running','completed','partial','failed','cancelled')),
  learnings jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (campaign_id, cycle_number)
);
create index if not exists nuva_studio_campaigns_due_idx on public.nuva_studio_campaigns(status, next_run_at);
create index if not exists nuva_studio_campaigns_business_idx on public.nuva_studio_campaigns(business_id);
create index if not exists nuva_studio_campaign_cycles_job_idx on public.nuva_studio_campaign_cycles(studio_job_id);
alter table public.nuva_studio_campaigns enable row level security;
alter table public.nuva_studio_campaign_cycles enable row level security;
drop policy if exists nuva_studio_campaigns_select_member on public.nuva_studio_campaigns;
create policy nuva_studio_campaigns_select_member on public.nuva_studio_campaigns for select to authenticated using (exists (select 1 from public.business_members bm where bm.business_id = nuva_studio_campaigns.business_id and bm.user_id = auth.uid()));
drop policy if exists nuva_studio_campaigns_insert_member on public.nuva_studio_campaigns;
create policy nuva_studio_campaigns_insert_member on public.nuva_studio_campaigns for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.business_members bm where bm.business_id = nuva_studio_campaigns.business_id and bm.user_id = auth.uid()));
drop policy if exists nuva_studio_campaigns_update_member on public.nuva_studio_campaigns;
create policy nuva_studio_campaigns_update_member on public.nuva_studio_campaigns for update to authenticated using (user_id = auth.uid() and exists (select 1 from public.business_members bm where bm.business_id = nuva_studio_campaigns.business_id and bm.user_id = auth.uid())) with check (user_id = auth.uid() and exists (select 1 from public.business_members bm where bm.business_id = nuva_studio_campaigns.business_id and bm.user_id = auth.uid()));
drop policy if exists nuva_studio_campaign_cycles_select_member on public.nuva_studio_campaign_cycles;
create policy nuva_studio_campaign_cycles_select_member on public.nuva_studio_campaign_cycles for select to authenticated using (exists (select 1 from public.nuva_studio_campaigns c join public.business_members bm on bm.business_id = c.business_id and bm.user_id = auth.uid() where c.id = nuva_studio_campaign_cycles.campaign_id));
