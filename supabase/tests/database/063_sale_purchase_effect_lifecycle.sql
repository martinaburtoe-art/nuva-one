begin;
select plan(13);

insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000a1');
insert into public.businesses (id, name, owner_id, plan)
  values ('00000000-0000-0000-0000-0000000000b1', 'Lifecycle Test Business', '00000000-0000-0000-0000-0000000000a1', 'starter');
insert into public.products (id, business_id, name, price, stock)
  values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Lifecycle Widget', 1000, 10);

-- Sale starts paid: stock and income transaction are created.
select lives_ok(
  $$ insert into public.sales (id, business_id, status, total, items)
     values ('00000000-0000-0000-0000-0000000000d1',
             '00000000-0000-0000-0000-0000000000b1',
             'paid', 3000,
             jsonb_build_array(jsonb_build_object(
               'product_id', '00000000-0000-0000-0000-0000000000c1',
               'qty', 3,
               'name', 'Lifecycle Widget'
             ))) $$,
  'paid sale applies stock and transaction effects'
);

select is(
  (select stock from public.products where id = '00000000-0000-0000-0000-0000000000c1'),
  7,
  'paid sale decrements stock'
);

select is(
  (select count(*)::int from public.transactions
   where business_id = '00000000-0000-0000-0000-0000000000b1'
     and type = 'income'),
  1,
  'paid sale creates one income transaction'
);

-- Moving paid -> draft must fully revert the original effects.
select lives_ok(
  $$ update public.sales
     set status = 'draft'
     where id = '00000000-0000-0000-0000-0000000000d1' $$,
  'moving a sale out of an active status reverts effects'
);

select is(
  (select stock from public.products where id = '00000000-0000-0000-0000-0000000000c1'),
  10,
  'sale status rollback restores stock'
);

select is(
  (select count(*)::int from public.transactions
   where business_id = '00000000-0000-0000-0000-0000000000b1'
     and type = 'income'),
  0,
  'sale status rollback removes generated transaction'
);

-- Reactivating the sale applies its current values again.
select lives_ok(
  $$ update public.sales
     set status = 'paid', total = 4000
     where id = '00000000-0000-0000-0000-0000000000d1' $,
  'reactivating a sale reapplies current effects'
);

select is(
  (select stock from public.products where id = '00000000-0000-0000-0000-0000000000c1'),
  7,
  'reactivated sale applies current quantity'
);

-- Purchase starts received: stock and expense transaction are created.
select lives_ok(
  $$ insert into public.purchases (id, business_id, status, total, items)
     values ('00000000-0000-0000-0000-0000000000e1',
             '00000000-0000-0000-0000-0000000000b1',
             'received', 2000,
             jsonb_build_array(jsonb_build_object(
               'product_id', '00000000-0000-0000-0000-0000000000c1',
               'qty', 2,
               'name', 'Lifecycle Widget'
             ))) $$,
  'received purchase applies stock and transaction effects'
);

select is(
  (select stock from public.products where id = '00000000-0000-0000-0000-0000000000c1'),
  9,
  'received purchase increments stock'
);

select lives_ok(
  $$ update public.purchases
     set status = 'cancelled'
     where id = '00000000-0000-0000-0000-0000000000e1 $$,
  'moving a purchase out of an active status reverts effects'
);

select is(
  (select stock from public.products where id = '00000000-0000-0000-0000-0000000000c1'),
  7,
  'purchase rollback restores previous stock'
);

select is(
  (select count(*)::int from public.transactions
   where business_id = '00000000-0000-0000-0000-0000000000b1'
     and type = 'expense'),
  0,
  'purchase rollback removes generated transaction'
);

select * from finish();
rollback;
