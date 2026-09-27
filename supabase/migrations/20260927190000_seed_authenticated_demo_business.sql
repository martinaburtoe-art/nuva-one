-- Creates a fully connected authenticated demo business for the signed-in owner.
-- Idempotent by owner + business name; all data is scoped to that owner business.
create or replace function public.create_demo_business_for_current_user()
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_business uuid;
  v_c1 uuid;
  v_c2 uuid;
  v_c3 uuid;
  v_p1 uuid;
  v_p2 uuid;
  v_p3 uuid;
  v_p4 uuid;
begin
  if v_user is null then
    raise exception 'Debes iniciar sesión para crear el negocio de prueba';
  end if;

  select id into v_business
  from public.businesses
  where owner_id = v_user and name = 'Alma Café · Negocio de prueba'
  limit 1;

  if v_business is not null then
    return v_business;
  end if;

  insert into public.businesses (
    name, industry, size, plan, giro, comuna, address,
    public_description, public_enabled, subscription_status
  )
  values (
    'Alma Café · Negocio de prueba',
    'food',
    '6-10',
    'pro',
    'Cafetería y pastelería',
    'Talca',
    '1 Norte 1234, Talca',
    'Negocio ficticio de demostración para probar Nüva One con datos operativos conectados.',
    false,
    'active'
  )
  returning id into v_business;

  insert into public.customers (
    business_id, name, email, phone, notes, status, tags, pipeline_stage,
    address, shipping_comuna, shipping_city, shipping_region
  )
  values
    (v_business,'Camila Rojas','camila.rojas@estudionorte.cl','+56961234567','Cliente frecuente corporativo','active',array['frecuente','empresa'],'won','2 Sur 456','Talca','Talca','Maule'),
    (v_business,'Diego Muñoz','diego.munoz@example.cl','+56962345678','Compra recurrente de café','active',array['recurrente'],'customer','Los Carrera 789','Talca','Talca','Maule'),
    (v_business,'Sofía Pérez','sofia.perez@taller21.cl','+56963456789','Cliente con oportunidad de recompra','lead',array['oportunidad'],'qualified','8 Oriente 321','Talca','Talca','Maule');

  select id into v_c1 from public.customers where business_id=v_business and name='Camila Rojas' limit 1;
  select id into v_c2 from public.customers where business_id=v_business and name='Diego Muñoz' limit 1;
  select id into v_c3 from public.customers where business_id=v_business and name='Sofía Pérez' limit 1;

  insert into public.products (
    business_id, sku, name, category, cost, price, stock,
    low_stock_threshold, reorder_point, max_stock
  )
  values
    (v_business,'CAF-250','Café de especialidad 250 g','Café',4100,8990,0,8,10,60),
    (v_business,'COL-1KG','Granos Colombia 1 kg','Café',10500,18990,0,8,10,40),
    (v_business,'TOR-CHO','Torta de chocolate','Pastelería',13000,24990,0,3,4,20),
    (v_business,'CK-CHO','Cookie chocolate','Pastelería',1100,2990,0,10,12,80);

  select id into v_p1 from public.products where business_id=v_business and sku='CAF-250' limit 1;
  select id into v_p2 from public.products where business_id=v_business and sku='COL-1KG' limit 1;
  select id into v_p3 from public.products where business_id=v_business and sku='TOR-CHO' limit 1;
  select id into v_p4 from public.products where business_id=v_business and sku='CK-CHO' limit 1;

  insert into public.purchases (
    business_id, supplier_name, status, total, category, purchase_date, items, tax_treatment, vat_rate, notes
  )
  values
    (v_business,'Café Andino SpA','received',123000,'Insumos',current_date-18,
      jsonb_build_array(jsonb_build_object('product_id',v_p1,'name','Café de especialidad 250 g','qty',30,'price',4100)),
      'taxable',19,'Reposición inicial de café'),
    (v_business,'Importadora Colombia Ltda.','received',157500,'Insumos',current_date-15,
      jsonb_build_array(jsonb_build_object('product_id',v_p2,'name','Granos Colombia 1 kg','qty',15,'price',10500)),
      'taxable',19,'Reposición de granos'),
    (v_business,'Pastelería Central','received',156000,'Insumos',current_date-12,
      jsonb_build_array(jsonb_build_object('product_id',v_p3,'name','Torta de chocolate','qty',12,'price',13000)),
      'taxable',19,'Producción y vitrina'),
    (v_business,'Dulce Sur','received',55000,'Insumos',current_date-10,
      jsonb_build_array(jsonb_build_object('product_id',v_p4,'name','Cookie chocolate','qty',50,'price',1100)),
      'taxable',19,'Reposición de pastelería');

  insert into public.sales (
    business_id, customer_id, customer_name, status, total, paid_amount, payment_method,
    channel, sale_date, items, tax_treatment, vat_rate, notes
  )
  values
    (v_business,v_c1,'Camila Rojas','paid',48950,48950,'Débito','tienda',current_date-3,
      jsonb_build_array(
        jsonb_build_object('product_id',v_p3,'name','Torta de chocolate','qty',1,'price',24990),
        jsonb_build_object('product_id',v_p4,'name','Cookie chocolate','qty',2,'price',2990),
        jsonb_build_object('product_id',v_p1,'name','Café de especialidad 250 g','qty',2,'price',8990)
      ),'taxable',19,'Venta corporativa'),
    (v_business,v_c2,'Diego Muñoz','paid',17980,17980,'Transferencia','tienda',current_date-2,
      jsonb_build_array(
        jsonb_build_object('product_id',v_p1,'name','Café de especialidad 250 g','qty',1,'price',8990),
        jsonb_build_object('product_id',v_p2,'name','Granos Colombia 1 kg','qty',1,'price',18990)
      ),'taxable',19,'Compra recurrente'),
    (v_business,v_c3,'Sofía Pérez','paid',30970,30970,'Débito','tienda',current_date-1,
      jsonb_build_array(
        jsonb_build_object('product_id',v_p3,'name','Torta de chocolate','qty',1,'price',24990),
        jsonb_build_object('product_id',v_p4,'name','Cookie chocolate','qty',2,'price',2990)
      ),'taxable',19,'Venta cliente oportunidad'),
    (v_business,null,'Venta mostrador','paid',29940,29940,'Efectivo','pos',current_date,
      jsonb_build_array(
        jsonb_build_object('product_id',v_p1,'name','Café de especialidad 250 g','qty',2,'price',8990),
        jsonb_build_object('product_id',v_p4,'name','Cookie chocolate','qty',4,'price',2990)
      ),'taxable',19,'Venta POS');

  insert into public.transactions (business_id,type,category,amount,description,tx_date)
  values
    (v_business,'expense','Arriendo',320000,'Arriendo mensual del local',current_date-8),
    (v_business,'expense','Servicios',68000,'Luz, agua e internet',current_date-5),
    (v_business,'expense','Marketing',45000,'Campaña local de captación',current_date-4);

  insert into public.customer_activities (business_id,customer_id,type,content,due_date,completed,created_by)
  values
    (v_business,v_c1,'note','Cliente corporativo activo: revisar propuesta de convenio mensual.',null,false,v_user),
    (v_business,v_c2,'task','Contactar para recompra de granos Colombia.',current_date+3,false,v_user),
    (v_business,v_c3,'task','Enviar seguimiento y nueva cotización de pastelería.',current_date+1,false,v_user),
    (v_business,null,'task','Revisar productos bajo punto de reposición.',current_date+2,false,v_user);

  return v_business;
end;
$$;

revoke all on function public.create_demo_business_for_current_user() from public;
grant execute on function public.create_demo_business_for_current_user() to authenticated;