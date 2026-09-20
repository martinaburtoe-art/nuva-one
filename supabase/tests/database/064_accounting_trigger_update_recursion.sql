begin;
select plan(4);

insert into auth.users (id) values ('00000000-0000-0000-0000-00000000a101');
insert into public.businesses (id,name,owner_id,plan)
  values ('00000000-0000-0000-0000-00000000a102','Accounting Trigger Test','00000000-0000-0000-0000-00000000a101','starter');
insert into public.products (id,business_id,name,price,stock)
  values ('00000000-0000-0000-0000-00000000a103','00000000-0000-0000-0000-00000000a102','Accounting Trigger Widget',100,10);

select lives_ok(
  $$ insert into public.sales (id,business_id,status,total,items)
     values ('00000000-0000-0000-0000-00000000a104',
             '00000000-0000-0000-0000-00000000a102',
             'paid',300,
             jsonb_build_array(jsonb_build_object(
               'product_id','00000000-0000-0000-0000-00000000a103',
               'qty',3,'name','Accounting Trigger Widget'))) $$,
  'sale insert remains supported'
);

select lives_ok(
  $$ update public.sales set status='cancelled'
     where id='00000000-0000-0000-0000-00000000a104' $$,
  'sale status updates no longer recurse through accounting auto-post'
);

select lives_ok(
  $$ insert into public.purchases (id,business_id,status,total,items)
     values ('00000000-0000-0000-0000-00000000a105',
             '00000000-0000-0000-0000-00000000a102',
             'received',200,
             jsonb_build_array(jsonb_build_object(
               'product_id','00000000-0000-0000-0000-00000000a103',
               'qty',2,'name','Accounting Trigger Widget'))) $$,
  'purchase insert remains supported'
);

select lives_ok(
  $$ update public.purchases set status='cancelled'
     where id='00000000-0000-0000-0000-00000000a105' $$,
  'purchase status updates no longer recurse through accounting auto-post'
);

select * from finish();
rollback;
