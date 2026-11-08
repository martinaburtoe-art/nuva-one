-- Subscription-aware enforcement for the 15-day Starter trial.
BEGIN;
SELECT plan(16);

SELECT ok(
  to_regprocedure('public.enforce_business_active()') IS NOT NULL,
  'database trial enforcement trigger function is installed'
);
SELECT ok(
  NOT has_function_privilege('anon', 'public.business_is_active(uuid)', 'EXECUTE'),
  'anon cannot query arbitrary business subscription/trial status'
);
SELECT ok(
  NOT has_function_privilege('authenticated', 'public.business_is_active(uuid)', 'EXECUTE'),
  'authenticated users cannot query arbitrary business subscription/trial status'
);
SELECT is((
  SELECT count(*)::int
  FROM pg_trigger tr
  JOIN pg_class rel ON rel.oid = tr.tgrelid
  JOIN pg_namespace ns ON ns.oid = rel.relnamespace
  WHERE ns.nspname = 'public'
    AND rel.relname IN (
      'products','customers','suppliers','sales','purchases','quotes','transactions',
      'cash_registers','cash_register_movements','costs','customer_activities',
      'inventory_stocktakes','inventory_stocktake_lines','product_codes',
      'purchase_payments','shifts','shipments'
    )
    AND tr.tgname = 'trg_enforce_business_active'
    AND NOT tr.tgisinternal
), 17, 'trial enforcement is installed on all 17 billable operational tables');

INSERT INTO auth.users (id)
VALUES ('00000000-0000-0000-0000-0000000000c0');

INSERT INTO public.businesses (
  id, name, owner_id, plan, created_at, subscription_status, billing_provider
)
VALUES
  ('00000000-0000-0000-0000-0000000000c1', 'Expired Starter', '00000000-0000-0000-0000-0000000000c0', 'starter', now() - interval '20 days', 'active', 'none'),
  ('00000000-0000-0000-0000-0000000000c2', 'Trial Starter', '00000000-0000-0000-0000-0000000000c0', 'starter', now() - interval '2 days', 'active', 'none'),
  ('00000000-0000-0000-0000-0000000000c3', 'Paid Starter', '00000000-0000-0000-0000-0000000000c0', 'starter', now() - interval '90 days', 'active', 'mercadopago'),
  ('00000000-0000-0000-0000-0000000000c4', 'Pro Demo', '00000000-0000-0000-0000-0000000000c0', 'pro', now() - interval '90 days', 'active', 'none'),
  ('00000000-0000-0000-0000-0000000000c5', 'Paused Pro', '00000000-0000-0000-0000-0000000000c0', 'pro', now() - interval '90 days', 'paused', 'mercadopago'),
  ('00000000-0000-0000-0000-0000000000c6', 'Cancelled Pro', '00000000-0000-0000-0000-0000000000c0', 'pro', now() - interval '90 days', 'canceled', 'mercadopago'),
  ('00000000-0000-0000-0000-0000000000c7', 'Pending Starter', '00000000-0000-0000-0000-0000000000c0', 'starter', now() - interval '90 days', 'pending', 'mercadopago'),
  ('00000000-0000-0000-0000-0000000000c8', 'Pending Trial Starter', '00000000-0000-0000-0000-0000000000c0', 'starter', now() - interval '2 days', 'pending', 'mercadopago'),
  ('00000000-0000-0000-0000-0000000000c9', 'Pending Pro Checkout', '00000000-0000-0000-0000-0000000000c0', 'pro', now() - interval '90 days', 'pending', 'mercadopago');

SELECT is(public.business_is_active('00000000-0000-0000-0000-0000000000c1'), false, 'expired unpaid Starter is inactive');
SELECT is(public.business_is_active('00000000-0000-0000-0000-0000000000c2'), true, 'Starter remains active within its 15-day trial');
SELECT is(public.business_is_active('00000000-0000-0000-0000-0000000000c3'), true, 'paid Starter remains active after day 15');
SELECT is(public.business_is_active('00000000-0000-0000-0000-0000000000c4'), true, 'active no-payment Pro demo remains available');
SELECT is(public.business_is_active('00000000-0000-0000-0000-0000000000c5'), false, 'paused Pro subscription is inactive');
SELECT is(public.business_is_active('00000000-0000-0000-0000-0000000000c6'), false, 'cancelled Pro subscription is inactive');
SELECT is(public.business_is_active('00000000-0000-0000-0000-0000000000c7'), false, 'pending paid subscription outside the trial is not treated as active');
SELECT is(public.business_is_active('00000000-0000-0000-0000-0000000000c8'), true, 'pending checkout does not interrupt a still-valid Starter trial');
SELECT is(public.business_is_active('00000000-0000-0000-0000-0000000000c9'), true, 'pending checkout preserves an existing Pro entitlement');

SELECT lives_ok(
  $$INSERT INTO public.products (business_id, name, price, stock)
    VALUES ('00000000-0000-0000-0000-0000000000c3', 'Paid Starter product', 1000, 10)$$,
  'paid Starter can continue creating products after day 15'
);
SELECT throws_ok(
  $$INSERT INTO public.products (business_id, name, price, stock)
    VALUES ('00000000-0000-0000-0000-0000000000c5', 'Paused Pro product', 1000, 10)$$,
  '42501',
  'Tu prueba gratuita de 15 días terminó. Elige un plan para seguir usando Nüva One.',
  'paused Pro cannot continue billable writes'
);
SELECT throws_ok(
  $$INSERT INTO public.products (business_id, name, price, stock)
    VALUES ('00000000-0000-0000-0000-0000000000c6', 'Cancelled Pro product', 1000, 10)$$,
  '42501',
  'Tu prueba gratuita de 15 días terminó. Elige un plan para seguir usando Nüva One.',
  'cancelled Pro cannot continue billable writes'
);

SELECT * FROM finish();
ROLLBACK;
