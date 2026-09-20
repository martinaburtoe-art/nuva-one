create index if not exists n8n_event_outbox_actor_user_idx on public.n8n_event_outbox(actor_user_id);

drop policy if exists "n8n outbox select by business membership" on public.n8n_event_outbox;
create policy "n8n outbox select by business membership"
on public.n8n_event_outbox for select to authenticated
using (exists (select 1 from public.business_members bm where bm.business_id=n8n_event_outbox.business_id and bm.user_id=(select auth.uid())));

drop policy if exists "n8n outbox insert by business membership" on public.n8n_event_outbox;
create policy "n8n outbox insert by business membership"
on public.n8n_event_outbox for insert to authenticated
with check (exists (select 1 from public.business_members bm where bm.business_id=n8n_event_outbox.business_id and bm.user_id=(select auth.uid())));

drop policy if exists "n8n outbox update by business membership" on public.n8n_event_outbox;
create policy "n8n outbox update by business membership"
on public.n8n_event_outbox for update to authenticated
using (exists (select 1 from public.business_members bm where bm.business_id=n8n_event_outbox.business_id and bm.user_id=(select auth.uid())))
with check (exists (select 1 from public.business_members bm where bm.business_id=n8n_event_outbox.business_id and bm.user_id=(select auth.uid())));
