create or replace function public.get_platform_owner_metrics()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  result jsonb;
begin
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'platform_role', '') <> 'owner' then
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
    'income', coalesce((select sum(amount) from public.transactions where type = 'income'), 0),
    'expenses', coalesce((select sum(amount) from public.transactions where type = 'expense'), 0),
    'generated_at', now()
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_platform_owner_metrics() from public, anon, authenticated;
grant execute on function public.get_platform_owner_metrics() to authenticated;
