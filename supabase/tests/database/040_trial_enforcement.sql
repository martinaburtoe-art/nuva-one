-- pgTAP test for public.enforce_business_active() / public.business_is_active()
-- (trigger trg_enforce_business_active on products/sales/etc). This is the
-- trigger that makes the 15-day free trial cutoff a real, database-level
-- boundary instead of a client-side-only screen -- so it can't be bypassed
-- by calling the API directly with a still-valid JWT after the trial ends.
begin;
select plan(5);

insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000a3');

-- A Starter business created 20 days ago: trial (15 days) has expired.
insert into public.businesses (id, name, owner_id, plan, created_at)
  values (
    '00000000-0000-0000-0000-0000000000b3',
    'Expired Trial Business',
    '00000000-0000-0000-0000-0000000000a3',
    'starter',
    now() - interval '20 days'
  );

-- A Starter business created 2 days ago: still inside its 15-day trial.
insert into public.businesses (id, name, owner_id, plan, created_at)
  values (
    '00000000-0000-0000-0000-0000000000b4',
    'Active Trial Business',
    '00000000-0000-0000-0000-0000000000a3',
    'starter',
    now() - interval '2 days'
  );

-- 1) business_is_active() reports false once the 15-day trial has elapsed.
select is(
  public.business_is_active('00000000-0000-0000-0000-0000000000b3'),
  false,
  'business_is_active() is false for a Starter business past its 15-day trial'
);

-- 2) ...and true while still inside the trial window.
select is(
  public.business_is_active('00000000-0000-0000-0000-0000000000b4'),
  true,
  'business_is_active() is true for a Starter business within its 15-day trial'
);

-- 3) A new product insert is rejected once the trial has expired.
select throws_ok(
  $$ insert into public.products (business_id, name, price, stock)
     values ('00000000-0000-0000-0000-0000000000b3', 'Late product', 1000, 10) $$,
  '42501',
  'Tu prueba gratuita de 15 días terminó. Actualiza a Pro para seguir usando Nüva One.',
  'inserting a product is rejected once the Starter trial has expired'
);

-- 4) The same insert succeeds for a business still inside its trial.
select lives_ok(
  $$ insert into public.products (business_id, name, price, stock)
     values ('00000000-0000-0000-0000-0000000000b4', 'Timely product', 1000, 10) $$,
  'inserting a product succeeds for a Starter business within its trial'
);

-- 5) Upgrading the expired business to Pro immediately lifts the block --
-- no need to wait out or reset the trial clock.
update public.businesses set plan = 'pro' where id = '00000000-0000-0000-0000-0000000000b3';
select lives_ok(
  $$ insert into public.products (business_id, name, price, stock)
     values ('00000000-0000-0000-0000-0000000000b3', 'Post-upgrade product', 1000, 10) $$,
  'upgrading an expired-trial business to Pro immediately lifts the block'
);

select * from finish();
rollback;
