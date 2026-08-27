-- Nüva One: finance close integrity v2
-- Uses the project's current private helper signatures.
--
-- Clean-rebuild hardening: finance migrations depend on the private tenant
-- authorization helpers. Reassert the schema/functions here so a fresh
-- database cannot fail if an earlier hardening migration is absent, repaired,
-- or partially migrated. CREATE OR REPLACE is idempotent on hosted databases.

begin;

create schema if not exists private;
grant usage on schema private to authenticated, anon;

create or replace function private.is_business_member(_business_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_members
    where business_id = _business_id
      and user_id = _user_id
  );
$$;

-- Some older finance policies use the auth-aware one-argument signature.
-- Keep this overload intentionally: it delegates to the explicit helper and
-- uses auth.uid() so policy evaluation remains tenant-scoped.
create or replace function private.is_business_member(_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.is_business_member(_business_id, auth.uid());
$$;

create or replace function private.has_business_role(_business_id uuid, _user_id uuid, _roles public.member_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_members
    where business_id = _business_id
      and user_id = _user_id
      and role = any(_roles)
  );
$$;

revoke all on function private.is_business_member(uuid, uuid) from public, anon, authenticated;
revoke all on function private.is_business_member(uuid) from public, anon, authenticated;
revoke all on function private.has_business_role(uuid, uuid, public.member_role[]) from public, anon, authenticated;
grant execute on function private.is_business_member(uuid, uuid) to authenticated;
grant execute on function private.is_business_member(uuid) to authenticated;
grant execute on function private.has_business_role(uuid, uuid, public.member_role[]) to authenticated;

create table if not exists public.financial_close_controls (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  control_code text not null,
  status text not null default 'pending' check (status in ('pending','passed','warning','blocked','waived')),
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  details jsonb not null default '{}'::jsonb,
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, period_start, period_end, control_code)
);

create index if not exists idx_financial_close_controls_business_period on public.financial_close_controls(business_id, period_start, period_end);
alter table public.financial_close_controls enable row level security;
drop policy if exists financial_close_controls_select on public.financial_close_controls;
create policy financial_close_controls_select on public.financial_close_controls for select to authenticated using (private.is_business_member(business_id, auth.uid()));
drop policy if exists financial_close_controls_write on public.financial_close_controls;
create policy financial_close_controls_write on public.financial_close_controls for all to authenticated using (private.has_business_role(business_id, auth.uid(), array['owner','admin']::member_role[])) with check (private.has_business_role(business_id, auth.uid(), array['owner','admin']::member_role[]));

create or replace function private.assert_accounting_period_open(p_business_id uuid, p_entry_date date)
returns void language plpgsql security definer set search_path = public, private as $$
begin
  if exists (select 1 from public.accounting_period_closures c where c.business_id = p_business_id and c.period_start <= p_entry_date and c.period_end >= p_entry_date and c.status in ('closed','locked','finalized')) then
    raise exception 'ACCOUNTING_PERIOD_CLOSED';
  end if;
end;
$$;
revoke all on function private.assert_accounting_period_open(uuid,date) from public, anon, authenticated;
grant execute on function private.assert_accounting_period_open(uuid,date) to authenticated;

create or replace view public.v_financial_close_health with (security_invoker = true) as
select b.id as business_id,
  coalesce(sum(case when c.status = 'blocked' and c.severity in ('critical','high') then 1 else 0 end),0)::int as blocking_controls,
  coalesce(sum(case when c.status in ('pending','warning') then 1 else 0 end),0)::int as open_controls,
  coalesce(sum(case when c.status = 'passed' then 1 else 0 end),0)::int as passed_controls,
  count(c.id)::int as total_controls,
  case when coalesce(sum(case when c.status = 'blocked' and c.severity in ('critical','high') then 1 else 0 end),0) > 0 then 'blocked'
       when coalesce(sum(case when c.status in ('pending','warning') then 1 else 0 end),0) > 0 then 'in_review'
       when count(c.id) > 0 then 'ready' else 'not_started' end as close_readiness
from public.businesses b left join public.financial_close_controls c on c.business_id = b.id group by b.id;
revoke all on public.v_financial_close_health from anon;
grant select on public.v_financial_close_health to authenticated;

commit;
