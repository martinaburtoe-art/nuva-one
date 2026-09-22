create or replace function public.get_nuva_business_baseline(
  p_business_id uuid,
  p_days integer default 90
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_days integer := greatest(1, least(coalesce(p_days, 90), 365));
  v_start date := current_date - (greatest(1, least(coalesce(p_days, 90), 365)) - 1);
  v_revenue numeric := 0;
  v_sales_count integer := 0;
  v_units numeric := 0;
  v_variable_costs numeric := 0;
  v_fixed_costs numeric := 0;
  v_purchase_costs numeric := 0;
  v_cost_rows integer := 0;
begin
  if not exists (
    select 1 from public.business_members bm
    where bm.business_id = p_business_id
      and bm.user_id = (select auth.uid())
  ) then
    raise exception 'business_access_denied';
  end if;

  select
    coalesce(sum(s.total), 0),
    count(*)::integer,
    coalesce(sum(
      (select coalesce(sum(greatest(coalesce((item->>'qty')::numeric, 0), 0)), 0)
       from jsonb_array_elements(case when jsonb_typeof(s.items) = 'array' then s.items else '[]'::jsonb end) item)
    ), 0)
  into v_revenue, v_sales_count, v_units
  from public.sales s
  where s.business_id = p_business_id
    and s.sale_date >= v_start
    and s.sale_date <= current_date
    and coalesce(s.status::text, '') not in ('cancelled', 'canceled', 'void', 'anulled');

  select coalesce(sum(
    greatest(coalesce((item->>'qty')::numeric, 0), 0) * coalesce(p.cost, 0)
  ), 0)
  into v_variable_costs
  from public.sales s
  cross join lateral jsonb_array_elements(case when jsonb_typeof(s.items) = 'array' then s.items else '[]'::jsonb end) item
  left join public.products p on p.id = nullif(item->>'product_id', '')::uuid
  where s.business_id = p_business_id
    and s.sale_date >= v_start
    and s.sale_date <= current_date
    and coalesce(s.status::text, '') not in ('cancelled', 'canceled', 'void', 'anulled');

  select
    coalesce(sum(case when lower(coalesce(c.behavior, '')) in ('fixed','fijo','fixed_cost') or lower(coalesce(c.cost_type, '')) in ('fixed','fijo') then coalesce(c.total_amount, c.amount_net, 0) else 0 end), 0),
    coalesce(sum(coalesce(c.total_amount, c.amount_net, 0)), 0),
    count(*)::integer
  into v_fixed_costs, v_purchase_costs, v_cost_rows
  from public.costs c
  where c.business_id = p_business_id
    and c.incurred_at >= v_start
    and c.incurred_at <= current_date;

  if v_variable_costs = 0 and v_purchase_costs > 0 then
    v_variable_costs := v_purchase_costs;
  end if;

  return jsonb_build_object(
    'periodStart', v_start,
    'periodEnd', current_date,
    'days', v_days,
    'revenue', round(v_revenue, 2),
    'salesCount', v_sales_count,
    'volume', round(v_units, 2),
    'variableCosts', round(v_variable_costs, 2),
    'fixedCosts', round(v_fixed_costs, 2),
    'unitPrice', case when v_units > 0 then round(v_revenue / v_units, 2) else 0 end,
    'dataQuality', jsonb_build_object(
      'salesRows', v_sales_count,
      'costRows', v_cost_rows,
      'hasOperationalSales', v_sales_count > 0,
      'hasCostEvidence', v_cost_rows > 0,
      'variableCostSource', case when v_variable_costs = v_purchase_costs and v_purchase_costs > 0 and v_variable_costs > 0 then 'purchases_fallback' else 'sales_product_cost' end
    )
  );
end;
$$;

revoke all on function public.get_nuva_business_baseline(uuid, integer) from public;
grant execute on function public.get_nuva_business_baseline(uuid, integer) to authenticated;
