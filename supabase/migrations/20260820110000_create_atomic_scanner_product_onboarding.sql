create or replace function public.create_product_from_scanner(
  p_business_id uuid,
  p_name text,
  p_code text,
  p_code_type text default 'barcode',
  p_sku text default null,
  p_category text default null,
  p_cost numeric default 0,
  p_price numeric default 0,
  p_initial_stock integer default 0,
  p_low_stock_threshold integer default 5
)
returns table(product_id uuid, sku text, code text, stock_before integer, stock_after integer)
language plpgsql
security definer
set search_path to 'public', 'private'
as $function$
declare
  v_product_id uuid;
  v_sku text;
  v_code text;
  v_before integer := 0;
  v_after integer := 0;
  v_existing uuid;
begin
  if p_business_id is null then raise exception 'Negocio requerido' using errcode = '22023'; end if;
  if not private.has_business_role(p_business_id, (select auth.uid()), array['owner'::member_role,'admin'::member_role,'staff'::member_role]) then
    raise exception 'Sin permisos para crear productos' using errcode = '42501';
  end if;
  v_code := nullif(regexp_replace(coalesce(p_code,''), '\s+', '', 'g'), '');
  if v_code is null then raise exception 'Código requerido' using errcode = '22023'; end if;
  if nullif(trim(coalesce(p_name,'')), '') is null then raise exception 'Nombre del producto requerido' using errcode = '22023'; end if;
  if p_cost < 0 or p_price < 0 or p_initial_stock < 0 or p_low_stock_threshold < 0 then
    raise exception 'Los valores numéricos no pueden ser negativos' using errcode = '22023';
  end if;
  select pc.product_id into v_existing
  from public.product_codes pc
  where pc.business_id = p_business_id and pc.code = v_code and pc.is_active = true
  limit 1;
  if v_existing is not null then raise exception 'El código ya está asociado a un producto' using errcode = '23505'; end if;
  v_sku := nullif(upper(trim(coalesce(p_sku,''))), '');
  if v_sku is null then
    v_sku := public.generate_product_sku(p_business_id, 'SKU');
  end if;
  if exists (select 1 from public.products pr where pr.business_id = p_business_id and upper(coalesce(pr.sku,'')) = upper(v_sku)) then
    raise exception 'El SKU ya existe en este negocio' using errcode = '23505';
  end if;
  insert into public.products(business_id, sku, name, category, cost, price, stock, low_stock_threshold)
  values(p_business_id, v_sku, trim(p_name), nullif(trim(p_category),''), p_cost, p_price, 0, p_low_stock_threshold)
  returning id into v_product_id;
  insert into public.product_codes(business_id, product_id, code, code_type, is_primary, is_active, created_by)
  values(p_business_id, v_product_id, v_code, coalesce(nullif(trim(p_code_type),''),'barcode'), true, true, (select auth.uid()));
  if p_initial_stock > 0 then
    select x.stock_before, x.stock_after into v_before, v_after
    from public.adjust_product_stock(v_product_id, p_initial_stock, 'Stock inicial desde Scanner', 'scanner_initial_stock', v_product_id) x;
  end if;
  return query select v_product_id, v_sku, v_code, v_before, case when p_initial_stock > 0 then v_after else 0 end;
end;
$function$;

revoke all on function public.create_product_from_scanner(uuid,text,text,text,text,text,numeric,numeric,integer,integer) from public;
grant execute on function public.create_product_from_scanner(uuid,text,text,text,text,text,numeric,numeric,integer,integer) to authenticated;
