-- Harden Nüva Connect tenant access and cover foreign keys.

begin;

create index if not exists idx_nuva_integration_connections_created_by
  on public.nuva_integration_connections (created_by);
create index if not exists idx_nuva_integration_events_connection_id
  on public.nuva_integration_events (connection_id);

drop policy if exists "Owner/admin manage integration connections" on public.nuva_integration_connections;

create policy "Owner/admin manage integration connections"
  on public.nuva_integration_connections
  for insert
  to authenticated
  with check (private.has_business_role(business_id, (select auth.uid()), array['owner'::member_role, 'admin'::member_role]));

create policy "Owner/admin update integration connections"
  on public.nuva_integration_connections
  for update
  to authenticated
  using (private.has_business_role(business_id, (select auth.uid()), array['owner'::member_role, 'admin'::member_role]))
  with check (private.has_business_role(business_id, (select auth.uid()), array['owner'::member_role, 'admin'::member_role]));

create policy "Owner/admin delete integration connections"
  on public.nuva_integration_connections
  for delete
  to authenticated
  using (private.has_business_role(business_id, (select auth.uid()), array['owner'::member_role, 'admin'::member_role]));

commit;
