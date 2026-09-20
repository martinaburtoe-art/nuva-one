-- pgTAP test for public.apply_sale_effects() (trigger trg_apply_sale_effects
-- on public.sales). This is THE fix for the race condition where two POS
-- terminals could both sell the last unit of a product at the same time.
--
-- Run with: supabase test db
-- (or executed directly against a project via the SQL editor / MCP -- the
-- whole file is wrapped in BEGIN/ROLLBACK, so it never leaves data behind,
-- even against a live/production database.)
begin;
select plan(7);

-- Test fixtures: a throwaway auth user + business + one product with stock=5.
-- Using fixed UUIDs makes the test's own SQL easy to read; they're rolled
-- back at the end regardless.
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000a1');
insert into public.businesses (id, name, owner_id, plan)
  values ('00000000-0000-0000-0000-0000000000b1', 'Test Business', '00000000-0000-0000-0000-0000000000a1', 'starter');
insert into public.products (id, business_id, name, price, stock)
  values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Widget', 1000, 5);

-- 1) A sale for less than available stock succeeds.
select lives_ok(
  $$ insert into public.sales (id, business_id, status, total, items)
     values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', 'paid', 3000,
       jsonb_build_array(jsonb_build_object('product_id', '00000000-0000-0000-0000-0000000000c1', 'qty', 3, 'name', 'Widget'))) $$,
  'a sale within available stock is accepted'
);

-- 2) Stock was actually decremented (5 - 3 = 2), not just accepted without effect.
select is(
  (select stock from public.products where id = '00000000-0000-0000-0000-0000000000c1'),
  2,
  'stock decremented by exactly the quantity sold'
);

-- 3) A follow-up sale asking for MORE than the remaining stock (2 left, asks for 10)
--    must be rejected outright -- this is the oversell bug the fix closes.
--    ERRCODE 'check_violation' = 23514, set explicitly in apply_sale_effects().
select throws_ok(
  $$ insert into public.sales (id, business_id, status, total, items)
     values ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000b1', 'paid', 10000,
       jsonb_build_array(jsonb_build_object('product_id', '00000000-0000-0000-0000-0000000000c1', 'qty', 10, 'name', 'Widget'))) $$,
  '23514',
  'Stock insuficiente para "Widget": no hay 10 unidades disponibles',
  'overselling beyond available stock raises check_violation'
);

-- 4) Stock is unchanged after the rejected sale (still 2, not clamped to 0
--    and not partially decremented) -- confirms the whole insert rolled back,
--    not just silently failed to update.
select is(
  (select stock from public.products where id = '00000000-0000-0000-0000-0000000000c1'),
  2,
  'stock is untouched after a rejected oversell attempt'
);

-- 5) The rejected sale row itself was never persisted (trigger fires
--    BEFORE INSERT, exception aborts the whole statement).
select is(
  (select count(*)::int from public.sales where id = '00000000-0000-0000-0000-0000000000d2'),
  0,
  'the rejected sale itself was never inserted'
);

-- 6) Selling exactly the remaining stock (2) is allowed -- the boundary case,
--    not just "less than" stock.
select lives_ok(
  $$ insert into public.sales (id, business_id, status, total, items)
     values ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000b1', 'paid', 2000,
       jsonb_build_array(jsonb_build_object('product_id', '00000000-0000-0000-0000-0000000000c1', 'qty', 2, 'name', 'Widget'))) $$,
  'selling exactly the remaining stock (boundary case) is accepted'
);

-- 7) ...and stock correctly reaches exactly zero, not negative.
select is(
  (select stock from public.products where id = '00000000-0000-0000-0000-0000000000c1'),
  0,
  'stock reaches exactly zero after selling the last units'
);

select * from finish();
rollback;
