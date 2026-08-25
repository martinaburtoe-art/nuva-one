-- Caja Pro: session-scoped financial summary.
-- Keep the RPC signature stable with production and resolve membership through
-- the private helper after the membership helper migration.
CREATE OR REPLACE FUNCTION public.get_cash_register_summary(p_cash_register_id UUID)
RETURNS TABLE (
  cash_register_id UUID,
  business_id UUID,
  status TEXT,
  opening_amount NUMERIC,
  cash_sales NUMERIC,
  cash_income NUMERIC,
  cash_withdrawals NUMERIC,
  cash_refunds NUMERIC,
  expected_cash NUMERIC,
  counted_cash NUMERIC,
  difference NUMERIC,
  movement_count BIGINT,
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $function$
declare v_business_id uuid;
begin
  select cr.business_id into v_business_id
  from public.cash_registers cr
  where cr.id = p_cash_register_id;

  if v_business_id is null or not private.is_business_member(v_business_id, (select auth.uid())) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  return query
  with sales_cash as (
    select coalesce(sum(s.paid_amount),0) amount
    from public.sales s
    where s.business_id = v_business_id
      and s.status::text not in ('cancelled','canceled')
      and lower(coalesce(s.payment_method,'')) in ('cash','efectivo')
      and s.created_at >= (select opened_at from public.cash_registers where id = p_cash_register_id)
      and s.created_at <= coalesce((select closed_at from public.cash_registers where id = p_cash_register_id), now())
  ),
  mov as (
    select coalesce(sum(case when lower(m.movement_type) in ('income','ingreso') then m.amount else 0 end),0) income,
           coalesce(sum(case when lower(m.movement_type) in ('withdrawal','retiro','expense','gasto') then m.amount else 0 end),0) withdrawals,
           count(*) movement_count
    from public.cash_register_movements m
    where m.cash_register_id = p_cash_register_id
  ),
  refunds as (select 0::numeric amount)
  select cr.id, cr.business_id, cr.status, cr.opening_amount, sc.amount, m.income, m.withdrawals, rf.amount,
    cr.opening_amount + sc.amount + m.income - m.withdrawals - rf.amount,
    coalesce(cr.counted_cash,0),
    coalesce(cr.counted_cash,0) - (cr.opening_amount + sc.amount + m.income - m.withdrawals - rf.amount),
    m.movement_count, cr.opened_at, cr.closed_at
  from public.cash_registers cr
  cross join sales_cash sc
  cross join mov m
  cross join refunds rf
  where cr.id = p_cash_register_id;
end;
$function$;
REVOKE ALL ON FUNCTION public.get_cash_register_summary(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_cash_register_summary(UUID) TO authenticated;
