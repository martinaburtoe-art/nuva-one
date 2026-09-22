create or replace function public.get_nuva_operating_snapshot(
  p_business_id uuid,
  p_days integer default 90
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_base jsonb;
  v_current_revenue numeric := 0;
  v_previous_revenue numeric := 0;
  v_low_stock integer := 0;
  v_credit_outstanding numeric := 0;
  v_trend_pct numeric := 0;
  v_signals jsonb := '[]'::jsonb;
begin
  if not exists (
    select 1 from public.business_members bm
    where bm.business_id = p_business_id
      and bm.user_id = (select auth.uid())
  ) then
    raise exception 'business_access_denied';
  end if;

  v_base := public.get_nuva_business_baseline(p_business_id, p_days);

  select coalesce(sum(s.total),0) into v_current_revenue
  from public.sales s
  where s.business_id=p_business_id and s.sale_date >= current_date-29 and s.sale_date <= current_date
    and coalesce(s.status::text,'') not in ('cancelled','canceled','void','anulled');

  select coalesce(sum(s.total),0) into v_previous_revenue
  from public.sales s
  where s.business_id=p_business_id and s.sale_date >= current_date-59 and s.sale_date < current_date-29
    and coalesce(s.status::text,'') not in ('cancelled','canceled','void','anulled');

  if v_previous_revenue > 0 then
    v_trend_pct := round(((v_current_revenue-v_previous_revenue)/v_previous_revenue)*100,1);
  end if;

  select count(*)::integer into v_low_stock
  from public.products p
  where p.business_id=p_business_id
    and coalesce(p.stock,0) <= greatest(coalesce(p.low_stock_threshold,0),coalesce(p.reorder_point,0))
    and greatest(coalesce(p.low_stock_threshold,0),coalesce(p.reorder_point,0)) > 0;

  select coalesce(sum(greatest(coalesce(s.total,0)-coalesce(s.paid_amount,0),0)),0)
  into v_credit_outstanding
  from public.sales s
  where s.business_id=p_business_id and coalesce(s.is_credit,false)=true
    and coalesce(s.status::text,'') not in ('cancelled','canceled','void','anulled');

  if v_trend_pct <= -15 then
    v_signals := v_signals || jsonb_build_array(jsonb_build_object(
      'kind','risk','severity','high','title','Ventas en desaceleración',
      'description','Las ventas de los últimos 30 días están por debajo del período anterior.',
      'metric',v_trend_pct,'evidence',jsonb_build_object('currentRevenue',v_current_revenue,'previousRevenue',v_previous_revenue,'windowDays',30)
    ));
  elsif v_trend_pct >= 15 then
    v_signals := v_signals || jsonb_build_array(jsonb_build_object(
      'kind','opportunity','severity','medium','title','Aceleración comercial',
      'description','Las ventas de los últimos 30 días superan al período anterior.',
      'metric',v_trend_pct,'evidence',jsonb_build_object('currentRevenue',v_current_revenue,'previousRevenue',v_previous_revenue,'windowDays',30)
    ));
  end if;

  if v_low_stock > 0 then
    v_signals := v_signals || jsonb_build_array(jsonb_build_object(
      'kind','risk','severity','medium','title','Inventario bajo',
      'description','Hay productos en o bajo su umbral de reposición.',
      'metric',v_low_stock,'evidence',jsonb_build_object('lowStockProducts',v_low_stock)
    ));
  end if;

  if v_credit_outstanding > 0 then
    v_signals := v_signals || jsonb_build_array(jsonb_build_object(
      'kind','risk','severity','medium','title','Cobranza pendiente',
      'description','Existen ventas a crédito con saldo pendiente.',
      'metric',round(v_credit_outstanding,2),'evidence',jsonb_build_object('outstanding',round(v_credit_outstanding,2))
    ));
  end if;

  if jsonb_array_length(v_signals)=0 then
    v_signals := jsonb_build_array(jsonb_build_object(
      'kind','info','severity','low','title','Sin señales críticas',
      'description','No se detectaron cambios materiales en las reglas operacionales básicas.',
      'metric',0,'evidence',jsonb_build_object('windowDays',30)
    ));
  end if;

  return jsonb_build_object(
    'baseline',v_base,
    'trend',jsonb_build_object('current30',round(v_current_revenue,2),'previous30',round(v_previous_revenue,2),'changePct',v_trend_pct),
    'inventory',jsonb_build_object('lowStockProducts',v_low_stock),
    'receivables',jsonb_build_object('outstanding',round(v_credit_outstanding,2)),
    'signals',v_signals,
    'generatedAt',now()
  );
end;
$$;

revoke all on function public.get_nuva_operating_snapshot(uuid, integer) from public;
grant execute on function public.get_nuva_operating_snapshot(uuid, integer) to authenticated;
