-- Migration: people_dashboard_summary RPC grants
-- Revokes public execute and grants to authenticated role only.
REVOKE EXECUTE ON FUNCTION public.people_dashboard_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.people_dashboard_summary(uuid) TO authenticated;
