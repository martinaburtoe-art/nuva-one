-- Explicitly deny all client-role access to the internal pricing catalog.
-- This is intentionally restrictive and documents the current trust boundary.
create policy plan_catalog_client_deny on public.plan_catalog
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);
