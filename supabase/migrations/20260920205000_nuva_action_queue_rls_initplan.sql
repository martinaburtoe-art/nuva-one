drop policy if exists "nuva actions insert by business membership" on public.nuva_action_queue;
create policy "nuva actions insert by business membership"
on public.nuva_action_queue
for insert
to authenticated
with check (
  exists (
    select 1
    from public.business_members bm
    where bm.business_id = nuva_action_queue.business_id
      and bm.user_id = (select auth.uid())
  )
  and (created_by is null or created_by = (select auth.uid()))
);

drop policy if exists "nuva actions select by business membership" on public.nuva_action_queue;
create policy "nuva actions select by business membership"
on public.nuva_action_queue
for select
to authenticated
using (
  exists (
    select 1
    from public.business_members bm
    where bm.business_id = nuva_action_queue.business_id
      and bm.user_id = (select auth.uid())
  )
);
