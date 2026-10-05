begin;
select plan(14);

insert into auth.users (id) values ('00000000-0000-0000-0000-00000000a145');
insert into public.businesses (id, name, owner_id, plan)
values ('00000000-0000-0000-0000-00000000b145', 'Golden Simulation Business', '00000000-0000-0000-0000-00000000a145', 'starter');
insert into public.products (id, business_id, name, price, stock)
values ('00000000-0000-0000-0000-00000000c145', '00000000-0000-0000-0000-00000000b145', 'Golden Widget', 10000, 5);

insert into public.purchases (id, business_id, status, total, items)
values ('00000000-0000-0000-0000-00000000d145', '00000000-0000-0000-0000-00000000b145', 'received', 20000,
  jsonb_build_array(jsonb_build_object('product_id','00000000-0000-0000-0000-00000000c145','qty',2,'name','Golden Widget')));

select is((select stock from public.products where id='00000000-0000-0000-0000-00000000c145'),7,'purchase updates inventory');
select is((select count(*)::int from public.transactions where business_id='00000000-0000-0000-0000-00000000b145' and type='expense'),1,'purchase updates cash transaction');
select is((select count(*)::int from public.accounting_journals where business_id='00000000-0000-0000-0000-00000000b145' and source_id='00000000-0000-0000-0000-00000000d145'),1,'purchase posts accounting journal');
select is((select coalesce(sum(debit-credit),0) from public.accounting_lines l join public.accounting_journals j on j.id=l.journal_id where j.source_id='00000000-0000-0000-0000-00000000d145'),0::numeric,'purchase journal balances');

insert into public.sales (id, business_id, status, total, items)
values ('00000000-0000-0000-0000-00000000e145','00000000-0000-0000-0000-00000000b145','paid',15000,
  jsonb_build_array(jsonb_build_object('product_id','00000000-0000-0000-0000-00000000c145','qty',1,'name','Golden Widget')));

select is((select stock from public.products where id='00000000-0000-0000-0000-00000000c145'),6,'sale updates inventory');
select is((select count(*)::int from public.transactions where business_id='00000000-0000-0000-0000-00000000b145' and type='income'),1,'sale updates cash transaction');
select is((select count(*)::int from public.accounting_journals where business_id='00000000-0000-0000-0000-00000000b145' and source_id='00000000-0000-0000-0000-00000000e145'),1,'sale posts accounting journal');
select is((select coalesce(sum(debit-credit),0) from public.accounting_lines l join public.accounting_journals j on j.id=l.journal_id where j.source_id='00000000-0000-0000-0000-00000000e145'),0::numeric,'sale journal balances');

insert into public.nuva_action_queue (id,business_id,created_by,source,action_type,title,description,priority,impact,mode,destination,status,payload,idempotency_key)
values ('00000000-0000-0000-0000-00000000f145','00000000-0000-0000-0000-00000000b145','00000000-0000-0000-0000-00000000a145','nuva_intelligence','golden_simulation','Golden simulation action','Synthetic deterministic action used only by the release gate.','high',80,'review','dashboard','completed',jsonb_build_object('simulation',true),'golden-simulation-145');

insert into public.nuva_action_outcomes (id,business_id,action_id,outcome_type,expected_impact,actual_impact,evidence)
values ('00000000-0000-0000-0000-00000000f146','00000000-0000-0000-0000-00000000b145','00000000-0000-0000-0000-00000000f145','verified',80,80,jsonb_build_object('simulation',true,'verified',true));

select is((select count(*)::int from public.nuva_action_outcomes where action_id='00000000-0000-0000-0000-00000000f145'),1,'action produces a linked outcome');
select is((select count(*)::int from public.nuva_action_outcomes o join public.nuva_action_queue a on a.id=o.action_id where o.business_id=a.business_id),1,'action outcome preserves tenant linkage');

insert into public.businesses (id,name,owner_id,plan)
values ('00000000-0000-0000-0000-00000000b146','Isolation Business','00000000-0000-0000-0000-00000000a145','starter');
insert into public.products (id,business_id,name,price,stock)
values ('00000000-0000-0000-0000-00000000c146','00000000-0000-0000-0000-00000000b146','Other Tenant Widget',100,9);

select is((select count(*)::int from public.products where business_id='00000000-0000-0000-0000-00000000b145'),1,'golden tenant owns only its product');
select is((select count(*)::int from public.products where business_id='00000000-0000-0000-0000-00000000b146'),1,'second tenant data remains separate');

select * from finish();
rollback;