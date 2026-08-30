-- Autonomous campaign optimization: persist only externally observed performance signals.
-- The evaluator never generates metric values; it can only reason over rows written here.

create table if not exists public.nuva_studio_campaign_metrics (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  campaign_id uuid not null references public.nuva_studio_campaigns(id) on delete cascade,
  cycle_id uuid not null references public.nuva_studio_campaign_cycles(id) on delete cascade,
  metric_name text not null check (char_length(trim(metric_name)) between 1 and 100),
  metric_value numeric not null,
  source text not null check (char_length(trim(source)) between 1 and 200),
  source_reference text,
  observed_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists nuva_studio_campaign_metrics_campaign_idx
  on public.nuva_studio_campaign_metrics(campaign_id, observed_at desc);

create index if not exists nuva_studio_campaign_metrics_cycle_idx
  on public.nuva_studio_campaign_metrics(cycle_id, metric_name, observed_at desc);

create table if not exists public.nuva_studio_campaign_evaluations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  campaign_id uuid not null references public.nuva_studio_campaigns(id) on delete cascade,
  cycle_id uuid not null references public.nuva_studio_campaign_cycles(id) on delete cascade,
  decision text not null check (decision in ('no_data', 'keep', 'modify', 'retry', 'change_strategy')),
  confidence numeric not null default 0 check (confidence >= 0 and confidence <= 1),
  evidence jsonb not null default '[]'::jsonb,
  missing_metrics jsonb not null default '[]'::jsonb,
  recommended_changes jsonb not null default '[]'::jsonb,
  metrics_snapshot jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists nuva_studio_campaign_evaluations_campaign_idx
  on public.nuva_studio_campaign_evaluations(campaign_id, created_at desc);

create index if not exists nuva_studio_campaign_evaluations_cycle_idx
  on public.nuva_studio_campaign_evaluations(cycle_id, created_at desc);

alter table public.nuva_studio_campaign_metrics enable row level security;
alter table public.nuva_studio_campaign_evaluations enable row level security;

drop policy if exists "campaign metrics members can read" on public.nuva_studio_campaign_metrics;
create policy "campaign metrics members can read"
on public.nuva_studio_campaign_metrics for select
using (exists (
  select 1 from public.business_members bm
  where bm.business_id = nuva_studio_campaign_metrics.business_id
    and bm.user_id = auth.uid()
));

drop policy if exists "campaign metrics members can insert" on public.nuva_studio_campaign_metrics;
create policy "campaign metrics members can insert"
on public.nuva_studio_campaign_metrics for insert
with check (exists (
  select 1 from public.business_members bm
  where bm.business_id = nuva_studio_campaign_metrics.business_id
    and bm.user_id = auth.uid()
));

drop policy if exists "campaign evaluations members can read" on public.nuva_studio_campaign_evaluations;
create policy "campaign evaluations members can read"
on public.nuva_studio_campaign_evaluations for select
using (exists (
  select 1 from public.business_members bm
  where bm.business_id = nuva_studio_campaign_evaluations.business_id
    and bm.user_id = auth.uid()
));
