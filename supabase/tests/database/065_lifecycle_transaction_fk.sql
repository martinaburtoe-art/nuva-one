begin;
select plan(6);

insert into auth.users (id) values ('00000000-0000-0000-0000-00000000d101');
insert into public.businesses (id,name,owner_id,plan)
  values ('00000000-0000-0000-0000-00000000d102','Lifecycle FK Test','00000000-0000-0000-0000-00000000d101','starter');
insert into public.products (id,business_id,name,price,stock)
  values ('00000000-0000-0000-0000-00000000d103','00000000-0000-0000-0000-00000000d102','Lifecycle FK Widget',100,10);

select lives_ok(
  $$ insert into public.sales (id,business_id,status,total,items)
     values ('00000000-0000-0000-0000-00000000d104',
             '00000000-0000-0000-0000-00000000d102',
             'paid',300,
             jsonb_build_array(jsonb_build_object(
               'product_id','00000000-0000-0000-0000-00000000d103',
               'qty',3,'name','Lifecycle FK Widget'))) $$,
  'sale insert applies effects'
);

select lives_ok(
  $$ update public.sales set status='cancelled'
     where id='00000000-0000-0000-0000-00000000d104' $$,
  'active sale cancellation completes without FK recursion'
);

select is(
  (select stock from public.products where id='00000000-0000-0000-0000-00000000d103'),
  10,
  'sale cancellation restores stock'
);

select lives_ok(
  $$ insert into public.purchases (id,business_id,status,total,items)
     values ('00000000-0000-0000-0000-00000000d105',
             '00000000-0000-0000-0000-00000000d102',
             'received',200,
             jsonb_build_array(jsonb_build_object(
               'product_id','00000000-0000-0000-0000-00000000d103',
               'qty',2,'name','Lifecycle FK Widget'))) $$,
  'purchase insert applies effects'
);

select lives_ok(
  $$ update public.purchases set status='cancelled'
     where id='00000000-0000-0000-0000-00000000d105' $$,
  'active purchase cancellation completes without FK recursion'
);

select is(
  (select stock from public.products where id='00000000-0000-0000-0000-00000000d103'),
  10,
  'purchase cancellation restores stock'
);

select * from finish();
rollback;
