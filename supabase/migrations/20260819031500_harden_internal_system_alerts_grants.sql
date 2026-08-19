-- system_alerts is an internal/service-managed table with RLS and no user policies.
-- Remove direct client privileges so authenticated users cannot even attempt direct table access.
revoke all on table public.system_alerts from anon, authenticated;
