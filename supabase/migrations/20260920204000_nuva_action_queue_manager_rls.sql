-- Harden Nüva Action Layer approval mutations at the database boundary.
-- Only business owners/admins may transition queued actions after preparation.

drop policy if exists "nuva actions update by business membership" on public.nuva_action_queue;

create policy "nuva actions update by business manager"
on public.nuva_action_queue
for update
to authenticated
using (
  exists (
    select 1
    from public.business_members bm
    where bm.business_id = nuva_action_queue.business_id
      and bm.user_id = (select auth.uid())
      and bm.role in ('owner'::public.member_role, 'admin'::public.member_role)
  )
)
with check (
  exists (
    select 1
    from public.business_members bm
    where bm.business_id = nuva_action_queue.business_id
      and bm.user_id = (select auth.uid())
      and bm.role in ('owner'::public.member_role, 'admin'::public.member_role)
  )
);
