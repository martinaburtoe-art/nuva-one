BEGIN;
SELECT plan(31);

INSERT INTO auth.users (id) VALUES
  ('00000000-0000-0000-0000-00000000a901'),
  ('00000000-0000-0000-0000-00000000a902');

INSERT INTO public.businesses (id, name, owner_id, plan) VALUES
  ('00000000-0000-0000-0000-00000000b901', 'P0 Ledger Business A', '00000000-0000-0000-0000-00000000a901', 'starter'),
  ('00000000-0000-0000-0000-00000000b902', 'P0 Ledger Business B', '00000000-0000-0000-0000-00000000a901', 'starter'),
  ('00000000-0000-0000-0000-00000000b903', 'P0 Ledger Business C', '00000000-0000-0000-0000-00000000a901', 'starter');

INSERT INTO public.products (id, business_id, name, price, stock) VALUES
  ('00000000-0000-0000-0000-00000000c901', '00000000-0000-0000-0000-00000000b901', 'Ledger Product A', 1000, 10),
  ('00000000-0000-0000-0000-00000000c902', '00000000-0000-0000-0000-00000000b902', 'Ledger Product B', 1000, 10),
  ('00000000-0000-0000-0000-00000000c903', '00000000-0000-0000-0000-00000000b903', 'Ledger Product C', 1000, 10);

-- Sale apply, reversal, re-apply with changed quantity. Each stock delta must
-- have its own immutable movement row with before/after values.
INSERT INTO public.sales (id, business_id, status, total, items)
VALUES (
  '00000000-0000-0000-0000-00000000d901',
  '00000000-0000-0000-0000-00000000b901',
  'paid', 3000,
  jsonb_build_array(jsonb_build_object(
    'product_id', '00000000-0000-0000-0000-00000000c901',
    'qty', 3, 'name', 'Ledger Product A'
  ))
);

SELECT is(
  (SELECT stock FROM public.products WHERE id = '00000000-0000-0000-0000-00000000c901'),
  7,
  'paid sale decrements stock'
);
SELECT is(
  (SELECT count(*)::int FROM public.inventory_movements
   WHERE business_id = '00000000-0000-0000-0000-00000000b901'
     AND source_type = 'sale' AND source_id = '00000000-0000-0000-0000-00000000d901'),
  1,
  'sale writes one source-linked movement'
);
SELECT is(
  (SELECT quantity_delta FROM public.inventory_movements
   WHERE source_type = 'sale' AND source_id = '00000000-0000-0000-0000-00000000d901'),
  -3::numeric,
  'sale movement records the signed stock delta'
);
SELECT is(
  (SELECT stock_before::text || ':' || stock_after::text FROM public.inventory_movements
   WHERE source_type = 'sale' AND source_id = '00000000-0000-0000-0000-00000000d901'),
  '10:7',
  'sale movement records exact before and after stock'
);

UPDATE public.sales SET status = 'draft'
WHERE id = '00000000-0000-0000-0000-00000000d901';

SELECT is(
  (SELECT stock FROM public.products WHERE id = '00000000-0000-0000-0000-00000000c901'),
  10,
  'draft transition restores sale stock'
);
SELECT is(
  (SELECT count(*)::int FROM public.inventory_movements
   WHERE source_type = 'sale_reversal' AND source_id = '00000000-0000-0000-0000-00000000d901'),
  1,
  'sale reversal is appended to the movement ledger'
);
SELECT is(
  (SELECT quantity_delta FROM public.inventory_movements
   WHERE source_type = 'sale_reversal' AND source_id = '00000000-0000-0000-0000-00000000d901'),
  3::numeric,
  'sale reversal records the positive compensating delta'
);

UPDATE public.sales
SET status = 'paid',
    total = 2000,
    items = jsonb_build_array(jsonb_build_object(
      'product_id', '00000000-0000-0000-0000-00000000c901',
      'qty', 2, 'name', 'Ledger Product A'
    ))
WHERE id = '00000000-0000-0000-0000-00000000d901';

SELECT is(
  (SELECT stock FROM public.products WHERE id = '00000000-0000-0000-0000-00000000c901'),
  8,
  'reactivated edited sale applies its new quantity'
);
SELECT is(
  (SELECT count(*)::int FROM public.inventory_movements
   WHERE source_type IN ('sale', 'sale_reversal')
     AND source_id = '00000000-0000-0000-0000-00000000d901'),
  3,
  'sale edit creates a complete append-only event sequence'
);
SELECT is(
  (SELECT sum(quantity_delta) FROM public.inventory_movements
   WHERE source_type IN ('sale', 'sale_reversal')
     AND source_id = '00000000-0000-0000-0000-00000000d901'),
  -2::numeric,
  'sale movement net equals the currently applied sale quantity'
);

-- Purchase receipt and cancellation use the same append-only compensating model.
INSERT INTO public.purchases (id, business_id, status, total, items)
VALUES (
  '00000000-0000-0000-0000-00000000e901',
  '00000000-0000-0000-0000-00000000b901',
  'received', 4000,
  jsonb_build_array(jsonb_build_object(
    'product_id', '00000000-0000-0000-0000-00000000c901',
    'qty', 4, 'name', 'Ledger Product A'
  ))
);

SELECT is(
  (SELECT stock FROM public.products WHERE id = '00000000-0000-0000-0000-00000000c901'),
  12,
  'received purchase increments stock'
);
SELECT is(
  (SELECT count(*)::int FROM public.inventory_movements
   WHERE source_type = 'purchase' AND source_id = '00000000-0000-0000-0000-00000000e901'),
  1,
  'purchase receipt writes a source-linked movement'
);
SELECT is(
  (SELECT quantity_delta FROM public.inventory_movements
   WHERE source_type = 'purchase' AND source_id = '00000000-0000-0000-0000-00000000e901'),
  4::numeric,
  'purchase movement records the positive stock delta'
);

UPDATE public.purchases SET status = 'cancelled'
WHERE id = '00000000-0000-0000-0000-00000000e901';

SELECT is(
  (SELECT stock FROM public.products WHERE id = '00000000-0000-0000-0000-00000000c901'),
  8,
  'purchase cancellation removes the received quantity'
);
SELECT is(
  (SELECT count(*)::int FROM public.inventory_movements
   WHERE source_type = 'purchase_reversal' AND source_id = '00000000-0000-0000-0000-00000000e901'),
  1,
  'purchase cancellation appends a reversal movement'
);
SELECT is(
  (SELECT quantity_delta FROM public.inventory_movements
   WHERE source_type = 'purchase_reversal' AND source_id = '00000000-0000-0000-0000-00000000e901'),
  -4::numeric,
  'purchase reversal records the negative compensating delta'
);

-- User A belongs to multiple businesses. Fast sale must use the explicit
-- selected business B, not whichever membership happens to sort first.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a901', true);

SELECT set_config(
  'test.fast_sale_id',
  public.create_fast_sale(
    p_business_id := '00000000-0000-0000-0000-00000000b902',
    p_items := jsonb_build_array(jsonb_build_object(
      'product_id', '00000000-0000-0000-0000-00000000c902',
      'qty', 2
    ))
  )::TEXT,
  true
);
RESET ROLE;
SELECT is(
  (
    SELECT business_id
    FROM public.sales
    WHERE id = current_setting('test.fast_sale_id', true)::UUID
  ),
  '00000000-0000-0000-0000-00000000b902'::uuid,
  'authenticated fast sale writes to the explicitly selected business B'
);
SELECT is(
  (SELECT stock FROM public.products WHERE id = '00000000-0000-0000-0000-00000000c902'),
  8,
  'fast sale decrements business B stock'
);
SELECT is(
  (SELECT stock FROM public.products WHERE id = '00000000-0000-0000-0000-00000000c901'),
  8,
  'fast sale leaves business A stock untouched'
);
-- inventory_movements is intentionally not selectable by authenticated.
-- The RPC ran above under authenticated; inspect the internal ledger as the
-- test runner without widening application grants or RLS.
SELECT is(
  (SELECT count(*)::int FROM public.inventory_movements
   WHERE source_type = 'sale'
     AND source_id IN (SELECT id FROM public.sales WHERE business_id = '00000000-0000-0000-0000-00000000b902')),
  1,
  'fast sale also writes its inventory movement'
);
SELECT throws_ok(
  $$SELECT public.create_fast_sale(
    p_business_id := '00000000-0000-0000-0000-00000000b902',
    p_items := jsonb_build_array(jsonb_build_object(
      'product_id', '00000000-0000-0000-0000-00000000c901',
      'qty', 1
    ))
  )$$,
  'P0001',
  'Producto no encontrado',
  'product from another tenant is rejected'
);

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a902', true);
SELECT throws_ok(
  $$SELECT public.create_fast_sale(
    p_business_id := '00000000-0000-0000-0000-00000000b903',
    p_items := jsonb_build_array(jsonb_build_object(
      'product_id', '00000000-0000-0000-0000-00000000c903',
      'qty', 1
    ))
  )$$,
  '42501',
  'No tienes permisos operativos para el negocio seleccionado',
  'user without membership cannot sell into another business'
);

SELECT throws_ok(
  $$SELECT public.create_fast_sale(
    NULL::uuid, NULL::text, 'tienda', 'efectivo', false,
    NULL::date, '[]'::jsonb, NULL::text
  )$$,
  '22023',
  'BUSINESS_CONTEXT_REQUIRED',
  'legacy fast-sale signature fails closed without tenant context'
);

SELECT is(
  (SELECT count(*)::int FROM public.sales WHERE business_id = '00000000-0000-0000-0000-00000000b902'),
  1,
  'rejected cross-tenant and legacy calls create no extra sales'
);
SELECT is(
  (SELECT prosecdef FROM pg_proc
   WHERE oid = 'public.create_fast_sale(uuid,uuid,text,text,text,boolean,date,jsonb,text)'::regprocedure),
  false,
  'new fast-sale RPC remains SECURITY INVOKER'
);
SELECT ok(
  has_function_privilege(
    'authenticated',
    'public.create_fast_sale(uuid,uuid,text,text,text,boolean,date,jsonb,text)',
    'EXECUTE'
  ),
  'authenticated can execute the explicit-business fast-sale RPC'
);
SELECT ok(
  NOT has_function_privilege(
    'anon',
    'public.create_fast_sale(uuid,uuid,text,text,text,boolean,date,jsonb,text)',
    'EXECUTE'
  ),
  'anonymous users cannot execute the explicit-business fast-sale RPC'
);

-- A purchase receipt cannot be reversed through stock that is reserved or blocked.
INSERT INTO public.purchases (id, business_id, status, total, items)
VALUES (
  '00000000-0000-0000-0000-00000000d902',
  '00000000-0000-0000-0000-00000000b901',
  'received', 2000,
  jsonb_build_array(jsonb_build_object(
    'product_id', '00000000-0000-0000-0000-00000000c901',
    'qty', 2, 'name', 'Ledger Product A'
  ))
);
SELECT is(
  (SELECT stock FROM public.products WHERE id='00000000-0000-0000-0000-00000000c901'),
  10,
  'additional purchase receipt increases stock before reserved-stock reversal test'
);
UPDATE public.products SET reserved_stock=9
WHERE id='00000000-0000-0000-0000-00000000c901';
SELECT throws_ok(
  $UPDATE public.purchases SET status='cancelled'
    WHERE id='00000000-0000-0000-0000-00000000d902'$,
  '23514',
  'PURCHASE_REVERSAL_STOCK_RESERVED',
  'purchase reversal is rejected when it would consume reserved or blocked stock'
);
SELECT is(
  (SELECT stock FROM public.products WHERE id='00000000-0000-0000-0000-00000000c901'),
  10,
  'rejected purchase reversal leaves stock unchanged'
);
SELECT is(
  (SELECT count(*)::int FROM public.inventory_movements
   WHERE source_type='purchase_reversal'
     AND source_id='00000000-0000-0000-0000-00000000d902'),
  0,
  'rejected purchase reversal appends no compensating movement'
);

SELECT * FROM finish();
ROLLBACK;
