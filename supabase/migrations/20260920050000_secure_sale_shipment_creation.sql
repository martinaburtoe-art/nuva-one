create or replace function public.create_shipment_for_sale(
  p_sale_id uuid,
  p_service_type text default 'standard',
  p_priority text default 'normal',
  p_shipping_address text default null,
  p_eta date default null,
  p_notes text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_sale public.sales%rowtype;
  v_customer public.customers%rowtype;
  v_shipment_id uuid;
begin
  select * into v_sale from public.sales where id = p_sale_id for update;
  if not found then raise exception 'Sale not found'; end if;
  if not private.has_business_role(v_sale.business_id, array['owner','admin','staff']::text[]) then
    raise exception 'Not authorized';
  end if;
  if exists (select 1 from public.shipments where sale_id = p_sale_id and status <> 'cancelled') then
    select id into v_shipment_id from public.shipments where sale_id = p_sale_id and status <> 'cancelled' order by created_at desc limit 1;
    return v_shipment_id;
  end if;
  if p_service_type is null or length(trim(p_service_type)) = 0 then raise exception 'Service type is required'; end if;
  if p_priority not in ('low','normal','high','urgent') then raise exception 'Invalid priority'; end if;
  if v_sale.customer_id is not null then
    select * into v_customer from public.customers where id = v_sale.customer_id and business_id = v_sale.business_id;
  end if;
  insert into public.shipments (
    business_id,sale_id,customer_id,status,shipping_address,eta,notes,customer_name,customer_phone,
    comuna,city,region,service_type,priority,shipping_cost,package_count,payment_type,
    destination_email,destination_rut,destination_postal_code,recipient_contact,declared_value,destination_country
  ) values (
    v_sale.business_id,v_sale.id,v_sale.customer_id,'preparing',
    coalesce(nullif(trim(p_shipping_address),''),v_customer.address),p_eta,p_notes,
    coalesce(v_sale.customer_name,v_customer.name),v_customer.phone,v_customer.shipping_comuna,
    v_customer.shipping_city,v_customer.shipping_region,p_service_type,p_priority,0,1,'prepaid',
    v_customer.email,v_customer.tax_id,v_customer.shipping_postal_code,v_customer.shipping_contact_name,
    v_sale.total,'CL'
  ) returning id into v_shipment_id;
  insert into public.shipment_events (shipment_id,business_id,status,note)
  values (v_shipment_id,v_sale.business_id,'preparing','Despacho creado desde la venta');
  return v_shipment_id;
end;
$$;

revoke execute on function public.create_shipment_for_sale(uuid,text,text,text,date,text) from public, anon;
grant execute on function public.create_shipment_for_sale(uuid,text,text,text,date,text) to authenticated;
