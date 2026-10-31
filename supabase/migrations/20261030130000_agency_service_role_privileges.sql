-- Least-privilege server-side grants for the durable Nüva Agency control plane.
-- RLS remains enabled. Client roles retain no table or identity-sequence privileges.
-- The service_role key is consumed only by server-side routes; no secret is stored here.

begin;

revoke all on table
  public.agency_missions,
  public.agency_tasks,
  public.agency_events,
  public.agency_agent_leases,
  public.agency_approvals,
  public.agency_artifacts
  from anon, authenticated;

revoke all on sequence public.agency_events_id_seq from anon, authenticated;

grant usage on schema public to service_role;

grant select, insert, update on table public.agency_missions to service_role;
grant select, insert on table public.agency_tasks to service_role;
grant select, insert on table public.agency_events to service_role;
grant select on table public.agency_agent_leases to service_role;
grant select, insert, update on table public.agency_approvals to service_role;
grant select, insert on table public.agency_artifacts to service_role;

grant usage, select on sequence public.agency_events_id_seq to service_role;

commit;
