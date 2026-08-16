drop index if exists public.idx_ai_messages_conversation_created_at;
drop index if exists public.idx_billing_documents_business_created_at;
drop index if exists public.idx_whatsapp_messages_business_created_at;

drop policy if exists "Invitee can view own invite" on public.business_invites;
drop policy if exists "Owner/admin manage business invites" on public.business_invites;
create policy "Invitee or owner/admin can view business invites"
on public.business_invites for select to authenticated
using (
  lower(email) = lower(coalesce(((select auth.jwt()) ->> 'email'::text), ''))
  or private.has_business_role(business_id, (select auth.uid()), ARRAY['owner','admin']::member_role[])
);
create policy "Owner/admin insert business invites"
on public.business_invites for insert to authenticated
with check (private.has_business_role(business_id, (select auth.uid()), ARRAY['owner','admin']::member_role[]));
create policy "Owner/admin update business invites"
on public.business_invites for update to authenticated
using (private.has_business_role(business_id, (select auth.uid()), ARRAY['owner','admin']::member_role[]))
with check (private.has_business_role(business_id, (select auth.uid()), ARRAY['owner','admin']::member_role[]));
create policy "Owner/admin delete business invites"
on public.business_invites for delete to authenticated
using (private.has_business_role(business_id, (select auth.uid()), ARRAY['owner','admin']::member_role[]));

drop policy if exists "Admins manage shifts" on public.shifts;
drop policy if exists "Employees view own shifts" on public.shifts;
create policy "Employees or admins view shifts"
on public.shifts for select to authenticated
using (
  employee_user_id = (select auth.uid())
  or private.has_business_role(business_id, (select auth.uid()), ARRAY['owner','admin']::member_role[])
);
create policy "Admins insert shifts"
on public.shifts for insert to authenticated
with check (private.has_business_role(business_id, (select auth.uid()), ARRAY['owner','admin']::member_role[]));
create policy "Admins update shifts"
on public.shifts for update to authenticated
using (private.has_business_role(business_id, (select auth.uid()), ARRAY['owner','admin']::member_role[]))
with check (private.has_business_role(business_id, (select auth.uid()), ARRAY['owner','admin']::member_role[]));
create policy "Admins delete shifts"
on public.shifts for delete to authenticated
using (private.has_business_role(business_id, (select auth.uid()), ARRAY['owner','admin']::member_role[]));
