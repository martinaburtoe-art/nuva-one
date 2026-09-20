-- Competitive operations hardening: fast-sale authorization and available-stock invariants.
-- Applied to production before being committed so the repository remains reproducible.

create or replace function public.create_fast_sale(
  p_customer_id uuid default null,
  p_customer_name text default null,
  p_channel text default 'tienda',
  p_payment_method text default 'efectivo',
  p_is_credit boolean default false,
  p_due_date date default null,
  p_items jsonb default '[]'::jsonb,
  p_notes text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $function$
declare
  v_business uuid;
  v_sale uuid;
  v_total numeric(12,2) := 0;
  v_item jsonb;
  v_pid uuid;
  v_qty int;
  v_price numeric(12,2);
  v_name text;
  v_customer_business uuid;
  v_available int;
begin
  select business_id into v_business
  from public.business_members
  where user_id = auth.uid()
    and status = 'active'
    and private.has_business_role(business_id, auth.uid(), array['owner','admin','staff']::public.member_role[])
  order by created_at limit 1;

  if v_business is null then
    raise exception 'No hay un negocio activo con permisos operativos';
  end if;

  if p_customer_id is not null then
    select business_id into v_customer_business from public.customers where id=p_customer_id;
    if v_customer_business is distinct from v_business then
      raise exception 'Cliente no pertenece al negocio';
    end if;
  end if;

  if p_is_credit and p_customer_id is null then
    raise exception 'La venta a crédito requiere cliente';
  end if;
  if p_is_credit and p_due_date is null then
    raise exception 'La venta a crédito requiere vencimiento';
  end if;
  if p_is_credit and p_due_date < current_date then
    raise exception 'La fecha de vencimiento no puede estar en el pasado';
  end if;

  if jsonb_typeof(coalesce(p_items,'[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_items,'[]'::jsonb)) = 0 then
    raise exception 'La venta requiere al menos un producto';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_pid := nullif(v_item->>'product_id','')::uuid;
    v_qty := coalesce((v_item->>'qty')::int,0);
    if v_pid is null or v_qty <= 0 then
      raise exception 'Producto/cantidad inválidos';
    end if;

    select name, price, greatest(0,stock-reserved_stock-blocked_stock)
      into v_name, v_price, v_available
    from public.products
    where id=v_pid and business_id=v_business
    for update;

    if not found then raise exception 'Producto no encontrado'; end if;
    if v_available < v_qty then
      raise exception 'Stock disponible insuficiente para %', v_name;
    end if;
    v_total := v_total + v_price*v_qty;
  end loop;

  insert into public.sales(
    business_id,customer_id,customer_name,channel,payment_method,status,total,
    notes,items,is_credit,due_date,paid_amount,stock_applied,pos_reference
  )
  values(
    v_business,p_customer_id,nullif(trim(p_customer_name),''),
    lower(coalesce(nullif(trim(p_channel),''),'tienda')),
    lower(coalesce(nullif(trim(p_payment_method),''),'efectivo')),
    case when p_is_credit then 'pending' else 'paid' end,
    v_total,p_notes,p_items,p_is_credit,p_due_date,
    case when p_is_credit then 0 else v_total end,false,
    'NUVA-'||to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS')||'-'||substr(gen_random_uuid()::text,1,8)
  )
  returning id into v_sale;

  return v_sale;
end;
$function$;

revoke execute on function public.create_fast_sale(uuid,text,text,text,boolean,date,jsonb,text) from public, anon;
grant execute on function public.create_fast_sale(uuid,text,text,text,boolean,date,jsonb,text) to authenticated;

create or replace function public.validate_sale_inventory()
returns trigger language plpgsql security definer set search_path=public as $function$
declare item jsonb; pid uuid; requested_qty integer; available_qty integer;
begin
  if NEW.total is null or NEW.total <= 0 then raise exception 'SALE_TOTAL_INVALID'; end if;
  if NEW.status in ('paid','pending') and not coalesce(NEW.stock_applied,false) then
    for item in select * from jsonb_array_elements(coalesce(NEW.items,'[]'::jsonb)) loop
      if nullif(item->>'product_id','') is not null then
        pid := (item->>'product_id')::uuid;
        requested_qty := greatest(coalesce((item->>'qty')::integer,0),0);
        if requested_qty <= 0 then raise exception 'SALE_ITEM_QUANTITY_INVALID'; end if;
        select greatest(0,stock-reserved_stock-blocked_stock) into available_qty
        from public.products where id=pid and business_id=NEW.business_id for update;
        if not found then raise exception 'SALE_PRODUCT_NOT_FOUND'; end if;
        if available_qty < requested_qty then
          raise exception 'SALE_INSUFFICIENT_AVAILABLE_STOCK:%:%',pid,available_qty;
        end if;
      end if;
    end loop;
  end if;
  return NEW;
end;
$function$;

create or replace function public.apply_sale_effects()
returns trigger language plpgsql security definer set search_path=public as $function$
declare item jsonb; tx_id uuid; should_apply boolean; qty_needed int; product_name text;
        updated_id uuid; stock_after int; available_qty int;
begin
  should_apply := NEW.status in ('paid','pending') and not NEW.stock_applied;
  if should_apply then
    for item in select * from jsonb_array_elements(coalesce(NEW.items,'[]'::jsonb)) loop
      if nullif(item->>'product_id','') is not null then
        qty_needed := coalesce((item->>'qty')::int,0);
        if qty_needed <= 0 then raise exception 'La cantidad vendida debe ser mayor que cero' using errcode='22023'; end if;
        select greatest(0,stock-reserved_stock-blocked_stock) into available_qty
        from public.products where id=(item->>'product_id')::uuid and business_id=NEW.business_id for update;
        if not found or available_qty < qty_needed then
          select name into product_name from public.products where id=(item->>'product_id')::uuid and business_id=NEW.business_id;
          raise exception 'Stock disponible insuficiente para "%": no hay % unidades disponibles',
            coalesce(product_name,item->>'name'),qty_needed using errcode='check_violation';
        end if;
        update public.products
        set stock=stock-qty_needed
        where id=(item->>'product_id')::uuid and business_id=NEW.business_id
          and greatest(0,stock-reserved_stock-blocked_stock)>=qty_needed
        returning id,stock into updated_id,stock_after;
        if updated_id is null then raise exception 'Stock disponible insuficiente' using errcode='check_violation'; end if;
        insert into public.inventory_movements(
          business_id,product_id,quantity_delta,stock_before,stock_after,movement_type,reason,source_type,source_id
        ) values(NEW.business_id,updated_id,-qty_needed,stock_after+qty_needed,stock_after,'sale','Salida por venta','sale',NEW.id);
      end if;
    end loop;
    if NEW.transaction_id is null and NEW.total>0 then
      insert into public.transactions(business_id,type,category,amount,description,tx_date)
      values(NEW.business_id,'income','Ventas',NEW.total,'Venta: '||coalesce(NEW.customer_name,'Cliente'),NEW.sale_date)
      returning id into tx_id;
      NEW.transaction_id:=tx_id;
    end if;
    NEW.stock_applied:=true;
  end if;
  return NEW;
end;
$function$;
