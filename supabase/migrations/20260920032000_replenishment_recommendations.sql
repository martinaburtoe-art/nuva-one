create or replace function public.get_replenishment_recommendations()
returns table(product_id uuid,product_name text,sku text,available_stock int,reorder_point int,recommended_qty int,unit_cost numeric,estimated_cost numeric,urgency text)
language sql security invoker set search_path=public,pg_temp
as $$
 select p.id,p.name,p.sku,greatest(0,p.stock-p.reserved_stock-p.blocked_stock)::int,
 greatest(coalesce(p.reorder_point,0),coalesce(p.low_stock_threshold,0))::int,
 greatest(0,coalesce(nullif(p.max_stock,0),greatest(coalesce(p.reorder_point,0),coalesce(p.low_stock_threshold,0))*2)-greatest(0,p.stock-p.reserved_stock-p.blocked_stock)-coalesce(p.in_transit_stock,0))::int,
 coalesce(p.cost,0),
 round(coalesce(p.cost,0)*greatest(0,coalesce(nullif(p.max_stock,0),greatest(coalesce(p.reorder_point,0),coalesce(p.low_stock_threshold,0))*2)-greatest(0,p.stock-p.reserved_stock-p.blocked_stock)-coalesce(p.in_transit_stock,0)),2),
 case when greatest(0,p.stock-p.reserved_stock-p.blocked_stock)<=0 then 'critical'
      when greatest(0,p.stock-p.reserved_stock-p.blocked_stock)<=greatest(coalesce(p.reorder_point,0),coalesce(p.low_stock_threshold,0)) then 'high'
      else 'normal' end
 from public.products p
 where p.business_id in (select bm.business_id from public.business_members bm where bm.user_id=auth.uid())
 and greatest(0,p.stock-p.reserved_stock-p.blocked_stock)<=greatest(coalesce(p.reorder_point,0),coalesce(p.low_stock_threshold,0))
 order by 9 asc,p.name;
$$;
revoke all on function public.get_replenishment_recommendations() from public,anon;
grant execute on function public.get_replenishment_recommendations() to authenticated;