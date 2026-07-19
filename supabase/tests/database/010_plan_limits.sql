-- pgTAP test for public.enforce_product_plan_limit() (trigger
-- trg_enforce_product_plan_limit on public.products). This is the trigger
-- that caps a Starter-plan business at 50 products -- enforced at the
-- database level specifically so it can't be bypassed by calling the API
-- directly instead of going through the UI.
begin;
select plan(4);

insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000a2');
insert into public.businesses (id, name, owner_id, plan)
  values ('00000000-0000-0000-0000-0000000000b2', 'Starter Business', '00000000-0000-0000-0000-0000000000a2', 'starter');

-- Fill the business up to exactly the limit (50 products). All 50 must succeed --
-- this fixture setup would itself fail loudly if the trigger were off-by-one.
insert into public.products (business_id, name, price, stock)
select '00000000-0000-0000-0000-0000000000b2', 'Product ' || g, 1000, 10
from generate_series(1, 50) g;

-- 1) Fixture sanity check: exactly 50 products exist.
select is(
  (select count(*)::int from public.products where business_id = '00000000-0000-0000-0000-0000000000b2'),
  50,
  'fixture: starter business has exactly 50 products before the limit test'
);

-- 2) The 51st product on a Starter plan is rejected.
select throws_ok(
  $$ insert into public.products (business_id, name, price, stock)
     values ('00000000-0000-0000-0000-0000000000b2', 'Product 51', 1000, 10) $$,
  '23514',
  'El plan Starter permite hasta 50 productos. Actualiza a Pro para agregar más.',
  'the 51st product on a Starter plan is rejected'
);

-- 3) Count is still exactly 50 after the rejected insert (no partial effect).
select is(
  (select count(*)::int from public.products where business_id = '00000000-0000-0000-0000-0000000000b2'),
  50,
  'product count stays at 50 after the rejected 51st insert'
);

-- 4) The SAME business, upgraded to Pro, is not capped -- the 51st product succeeds.
update public.businesses set plan = 'pro' where id = '00000000-0000-0000-0000-0000000000b2';
select lives_ok(
  $$ insert into public.products (business_id, name, price, stock)
     values ('00000000-0000-0000-0000-0000000000b2', 'Product 51 (pro)', 1000, 10) $$,
  'upgrading to Pro removes the 50-product cap'
);

select * from finish();
rollback;
