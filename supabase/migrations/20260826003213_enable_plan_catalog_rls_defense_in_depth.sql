-- Defense in depth for the internal pricing catalog.
-- Client roles currently have no data privileges; keep that posture explicit
-- until a tenant-safe/public read policy is intentionally introduced.
alter table public.plan_catalog enable row level security;

revoke all on table public.plan_catalog from anon, authenticated;
revoke all on table public.plan_catalog from public;
