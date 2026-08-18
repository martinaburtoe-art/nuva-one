-- Nüva Owner must measure Nüva One itself, never aggregate PYME accounting.
-- Revenue = subscription charges paid to Nüva One.
-- Expenses = explicitly recorded platform costs, not client/business expenses.

create table if not exists public.platform_expenses (
  id uuid primary key default gen_random_uuid(),
  amount numeric(12,2) not null check (amount >= 0),
  category text not null default 'other',
  description text,
  status text not null default 'recorded' check (status in ('recorded','voided')),
  incurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.platform_expenses enable row level security;

drop policy if exists platform_expenses_owner_select on public.platform_expenses;
drop policy if exists platform_expenses_owner_insert on public.platform_expenses;
drop policy if exists platform_expenses_owner_update on public.platform_expenses;
drop policy if exists platform_expenses_owner_delete on public.platform_expenses;

create policy platform_expenses_owner_select on public.platform_expenses
  for select using (coalesce(auth.jwt() -> 'app_metadata' ->> 'platform_role', '') = 'owner');
create policy platform_expenses_owner_insert on public.platform_expenses
  for insert with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'platform_role', '') = 'owner');
create policy platform_expenses_owner_update on public.platform_expenses
  for update using (coalesce(auth.jwt() -> 'app_metadata' ->> 'platform_role', '') = 'owner')
  with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'platform_role', '') = 'owner');
create policy platform_expenses_owner_delete on public.platform_expenses
  for delete using (coalesce(auth.jwt() -> 'app_metadata' ->> 'platform_role', '') = 'owner');

grant select, insert, update, delete on public.platform_expenses to authenticated;

drop function if exists public.get_platform_owner_metrics(uuid);

create or replace function public.get_platform_owner_metrics(p_owner_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  result jsonb;
begin
  if not exists (
    select 1 from auth.users
    where id = p_owner_id
      and coalesce(raw_app_meta_data ->> 'platform_role', '') = 'owner'
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'users', (select count(*) from auth.users),
    'businesses', (select count(*) from public.businesses),
    'memberships', (select count(*) from public.business_members),
    'customers', (select count(*) from public.customers),
    'products', (select count(*) from public.products),
    'sales', (select count(*) from public.sales),
    'transactions', (select count(*) from public.transactions),
    'quotes', (select count(*) from public.quotes),
    'ai_conversations', (select count(*) from public.ai_conversations),
    'ai_messages', (select count(*) from public.ai_messages),
    'income', coalesce((select sum(amount) from public.subscription_charges where status = 'paid'), 0),
    'expenses', coalesce((select sum(amount) from public.platform_expenses where status = 'recorded'), 0),
    'generated_at', now()
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_platform_owner_metrics(uuid) from public, anon, authenticated;
grant execute on function public.get_platform_owner_metrics(uuid) to service_role;
