create index if not exists nuva_studio_campaign_metrics_business_idx
  on public.nuva_studio_campaign_metrics(business_id);
create index if not exists nuva_studio_campaign_metrics_created_by_idx
  on public.nuva_studio_campaign_metrics(created_by);
create index if not exists nuva_studio_campaign_evaluations_business_idx
  on public.nuva_studio_campaign_evaluations(business_id);

-- Keep the membership predicate init-plan stable so auth.uid() is evaluated once per statement.
drop policy if exists "campaign metrics members can read" on public.nuva_studio_campaign_metrics;
create policy "campaign metrics members can read"
on public.nuva_studio_campaign_metrics for select
using (exists (
  select 1 from public.business_members bm
  where bm.business_id = nuva_studio_campaign_metrics.business_id
    and bm.user_id = (select auth.uid())
));

drop policy if exists "campaign metrics members can insert" on public.nuva_studio_campaign_metrics;
create policy "campaign metrics members can insert"
on public.nuva_studio_campaign_metrics for insert
with check (exists (
  select 1 from public.business_members bm
  where bm.business_id = nuva_studio_campaign_metrics.business_id
    and bm.user_id = (select auth.uid())
));

drop policy if exists "campaign evaluations members can read" on public.nuva_studio_campaign_evaluations;
create policy "campaign evaluations members can read"
on public.nuva_studio_campaign_evaluations for select
using (exists (
  select 1 from public.business_members bm
  where bm.business_id = nuva_studio_campaign_evaluations.business_id
    and bm.user_id = (select auth.uid())
));

drop policy if exists "nuva_studio_campaigns_insert_member" on public.nuva_studio_campaigns;
create policy "nuva_studio_campaigns_insert_member"
on public.nuva_studio_campaigns for insert
with check (exists (
  select 1 from public.business_members bm
  where bm.business_id = nuva_studio_campaigns.business_id
    and bm.user_id = (select auth.uid())
));

drop policy if exists "nuva_studio_campaigns_select_member" on public.nuva_studio_campaigns;
create policy "nuva_studio_campaigns_select_member"
on public.nuva_studio_campaigns for select
using (exists (
  select 1 from public.business_members bm
  where bm.business_id = nuva_studio_campaigns.business_id
    and bm.user_id = (select auth.uid())
));

drop policy if exists "nuva_studio_campaigns_update_member" on public.nuva_studio_campaigns;
create policy "nuva_studio_campaigns_update_member"
on public.nuva_studio_campaigns for update
using (exists (
  select 1 from public.business_members bm
  where bm.business_id = nuva_studio_campaigns.business_id
    and bm.user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.business_members bm
  where bm.business_id = nuva_studio_campaigns.business_id
    and bm.user_id = (select auth.uid())
));

drop policy if exists "nuva_studio_campaign_cycles_select_member" on public.nuva_studio_campaign_cycles;
create policy "nuva_studio_campaign_cycles_select_member"
on public.nuva_studio_campaign_cycles for select
using (exists (
  select 1
  from public.business_members bm
  join public.nuva_studio_campaigns c on c.business_id = bm.business_id
  where c.id = nuva_studio_campaign_cycles.campaign_id
    and bm.user_id = (select auth.uid())
));
