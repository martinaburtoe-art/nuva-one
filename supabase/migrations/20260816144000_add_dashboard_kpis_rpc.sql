create or replace function public.get_dashboard_kpis(p_business_id uuid)
returns table (
  income numeric,
  expense numeric,
  net numeric,
  inventory_value numeric,
  sales_count bigint,
  products_count bigint
)
language sql
security invoker
set search_path = public
as $$
  select
    coalesce((select sum(t.amount) from public.transactions t where t.business_id = p_business_id and t.type = 'income'), 0)::numeric as income,
    coalesce((select sum(t.amount) from public.transactions t where t.business_id = p_business_id and t.type = 'expense'), 0)::numeric as expense,
    (coalesce((select sum(t.amount) from public.transactions t where t.business_id = p_business_id and t.type = 'income'), 0)
      - coalesce((select sum(t.amount) from public.transactions t where t.business_id = p_business_id and t.type = 'expense'), 0))::numeric as net,
    coalesce((select sum(p.stock * p.price) from public.products p where p.business_id = p_business_id), 0)::numeric as inventory_value,
    (select count(*) from public.sales s where s.business_id = p_business_id and s.status <> 'cancelled')::bigint as sales_count,
    (select count(*) from public.products p where p.business_id = p_business_id)::bigint as products_count
  where private.is_business_member(p_business_id, (select auth.uid()));
$$;

revoke execute on function public.get_dashboard_kpis(uuid) from public;
revoke execute on function public.get_dashboard_kpis(uuid) from anon;
grant execute on function public.get_dashboard_kpis(uuid) to authenticated;
