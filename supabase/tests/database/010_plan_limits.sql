-- pgTAP test for public.enforce_product_plan_limit(). The test derives the
-- configured Starter limit from plan_catalog so it cannot drift from pricing.
begin;
select plan(4);

insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000a2');
insert into public.businesses (id, name, owner_id, plan)
  values ('00000000-0000-0000-0000-0000000000b2', 'Starter Business', '00000000-0000-0000-0000-0000000000a2', 'starter');

DO $$
DECLARE v_limit integer;
BEGIN
  SELECT max_products INTO v_limit FROM public.plan_catalog WHERE plan='starter';
  IF v_limit IS NULL OR v_limit <= 0 THEN RAISE EXCEPTION 'starter plan has no valid max_products'; END IF;
  EXECUTE format($sql$
    insert into public.products (business_id,name,price,stock)
    select '00000000-0000-0000-0000-0000000000b2','Product '||g,1000,10
    from generate_series(1,%s) g
  $sql$, v_limit);
END $$;

SELECT is(
  (select count(*)::int from public.products where business_id='00000000-0000-0000-0000-0000000000b2'),
  (select max_products from public.plan_catalog where plan='starter'),
  'fixture fills the Starter business exactly to its configured product limit'
);

SELECT throws_ok(
  $$ INSERT INTO public.products (business_id,name,price,stock)
     VALUES ('00000000-0000-0000-0000-0000000000b2','Product overflow',1000,10) $$,
  '23514',
  NULL,
  'the first product beyond the configured Starter limit is rejected'
);

SELECT is(
  (select count(*)::int from public.products where business_id='00000000-0000-0000-0000-0000000000b2'),
  (select max_products from public.plan_catalog where plan='starter'),
  'product count remains at the configured Starter limit after rejection'
);

update public.businesses set plan='pro' where id='00000000-0000-0000-0000-0000000000b2';
select lives_ok(
  $$ insert into public.products (business_id,name,price,stock) values ('00000000-0000-0000-0000-0000000000b2','Product overflow (pro)',1000,10) $$,
  'upgrading to Pro removes the Starter product cap'
);

select * from finish();
rollback;
