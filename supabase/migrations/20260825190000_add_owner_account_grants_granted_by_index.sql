-- Performance hardening: cover the FK used by owner-account grant auditing.
-- Safe on environments where the index already exists.
create index if not exists idx_owner_account_grants_granted_by
  on public.owner_account_grants (granted_by);
