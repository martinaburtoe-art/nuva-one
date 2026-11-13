BEGIN;
SELECT plan(44);

SELECT has_column('public', 'payment_intents', 'payment_url', 'payment intents retain the original provider redirect');
SELECT has_column('public', 'payments', 'payment_intent_id', 'payments link to their originating intent');
SELECT has_table('public', 'payment_creation_requests', 'payment creation claims are persisted');
SELECT has_index('public', 'payments', 'uq_payments_payment_intent_id', 'one payment row per intent is enforced');
SELECT has_index('public', 'payment_intents', 'uq_payment_intents_provider_commerce_order', 'provider commerce orders are unique');
SELECT has_index('public', 'inventory_movements', 'uq_inventory_movements_source_product', 'inventory source keys are unique per product');
SELECT ok(to_regprocedure('public.settle_payment_intent(text,text,text,numeric,text)') IS NOT NULL, 'atomic settlement RPC exists');
SELECT ok(has_function_privilege('service_role', 'public.settle_payment_intent(text,text,text,numeric,text)', 'EXECUTE'), 'service_role can settle payment intents');
SELECT ok(NOT has_function_privilege('authenticated', 'public.settle_payment_intent(text,text,text,numeric,text)', 'EXECUTE'), 'authenticated users cannot settle payment intents');
SELECT ok(NOT has_table_privilege('authenticated', 'public.payment_creation_requests', 'SELECT'), 'authenticated users cannot read payment creation claims');

INSERT INTO auth.users (id)
VALUES ('00000000-0000-0000-0000-0000000000a1'),
       ('00000000-0000-0000-0000-0000000000a2');

INSERT INTO public.businesses (id, name, owner_id, plan)
VALUES ('00000000-0000-0000-0000-0000000000b1', 'Atomic Settlement Test', '00000000-0000-0000-0000-0000000000a1', 'starter');

INSERT INTO public.products (id, business_id, name, price, stock)
VALUES ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Idempotent Widget', 1000, 10);

INSERT INTO public.sales (id, business_id, status, total, items, is_credit, paid_amount)
VALUES ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', 'pending', 5000, '[]'::jsonb, true, 0);

INSERT INTO public.payment_intents (id, business_id, sale_id, provider, token, commerce_order, amount, status)
VALUES
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1', 'flow', 'token-paid-once', 'order-paid-once', 4000, 'pending'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1', 'flow', 'token-mismatch', 'order-mismatch', 500, 'pending'),
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1', 'flow', 'token-pending', 'order-pending', 500, 'pending'),
  ('00000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1', 'flow', 'token-rejected', 'order-rejected', 500, 'pending'),
  ('00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1', 'flow', 'token-overpay', 'order-overpay', 2000, 'pending');

INSERT INTO public.payment_creation_requests (
  business_id, sale_id, provider, idempotency_key, commerce_order, amount, subject, status
)
VALUES (
  '00000000-0000-0000-0000-0000000000b1',
  '00000000-0000-0000-0000-0000000000d1',
  'flow', 'idempotency-key-1', 'nuva-order-claim-1', 1000, 'POS test', 'creating'
);

SELECT is(
  (SELECT count(*)::int FROM public.payment_creation_requests WHERE idempotency_key = 'idempotency-key-1'),
  1,
  'payment creation claim is persisted before provider creation'
);
SELECT throws_ok(
  $$ INSERT INTO public.payment_creation_requests (business_id, sale_id, provider, idempotency_key, commerce_order, amount, subject)
     VALUES ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1', 'flow', 'idempotency-key-1', 'nuva-order-claim-duplicate', 1000, 'POS test') $$,
  '23505',
  NULL,
  'same tenant idempotency key cannot create a second provider request'
);
SELECT throws_ok(
  $$ INSERT INTO public.payment_creation_requests (business_id, sale_id, provider, idempotency_key, commerce_order, amount, subject)
     VALUES ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1', 'flow', 'idempotency-key-2', 'nuva-order-claim-1', 1000, 'POS test') $$,
  '23505',
  NULL,
  'provider commerce order cannot be reused by another request'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.payment_creation_requests', 'SELECT'),
  'anonymous users cannot read payment creation claims'
);

SELECT ok(
  has_table_privilege('service_role', 'public.payment_creation_requests', 'INSERT'),
  'service_role can create payment claims'
);


SELECT is(
  public.settle_payment_intent('flow', 'token-paid-once', 'paid', 4000, 'order-paid-once')->>'outcome',
  'resolved_paid',
  'a verified payment is settled'
);
SELECT is((SELECT count(*)::int FROM public.payments WHERE payment_intent_id = '00000000-0000-0000-0000-0000000000e1'), 1, 'settlement creates exactly one payment row');
SELECT is((SELECT paid_amount FROM public.sales WHERE id = '00000000-0000-0000-0000-0000000000d1'), 4000::numeric, 'payment trigger updates the sale balance');
SELECT is((SELECT status FROM public.payment_intents WHERE id = '00000000-0000-0000-0000-0000000000e1'), 'paid', 'intent status is committed with payment');
SELECT is((SELECT payment_intent_id FROM public.payments WHERE id = (SELECT id FROM public.payments WHERE payment_intent_id = '00000000-0000-0000-0000-0000000000e1')), '00000000-0000-0000-0000-0000000000e1'::uuid, 'payment row preserves intent identity');
SELECT ok((SELECT processed FROM public.payment_webhook_events WHERE provider = 'flow' AND token = 'token-paid-once'), 'webhook event is marked processed in the same transaction');

SELECT throws_ok(
  $$ INSERT INTO public.payments (payment_intent_id, business_id, sale_id, amount, method)
     VALUES ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1', 4000, 'flow') $$,
  '23505',
  NULL,
  'database unique index blocks a second payment row for the same intent'
);

SELECT is(
  public.settle_payment_intent('flow', 'token-paid-once', 'paid', 4000, 'order-paid-once')->>'outcome',
  'already_processed',
  'a repeated webhook returns the stored outcome'
);
SELECT is((SELECT count(*)::int FROM public.payments WHERE payment_intent_id = '00000000-0000-0000-0000-0000000000e1'), 1, 'a repeated webhook cannot duplicate the payment');

SELECT is(
  public.settle_payment_intent('flow', 'token-mismatch', 'paid', 499, 'order-mismatch')->>'outcome',
  'provider_mismatch',
  'provider amount mismatch is rejected'
);
SELECT is((SELECT status FROM public.payment_intents WHERE id = '00000000-0000-0000-0000-0000000000e2'), 'pending', 'mismatched intent remains pending');
SELECT is((SELECT count(*)::int FROM public.payments WHERE payment_intent_id = '00000000-0000-0000-0000-0000000000e2'), 0, 'mismatched provider data creates no payment');

SELECT is(
  public.settle_payment_intent('flow', 'token-pending', 'pending', NULL, NULL)->>'outcome',
  'resolved_pending',
  'pending provider status does not settle'
);
SELECT ok(NOT (SELECT processed FROM public.payment_webhook_events WHERE provider = 'flow' AND token = 'token-pending'), 'pending webhook remains retryable');

SELECT is(
  public.settle_payment_intent('flow', 'token-rejected', 'rejected', NULL, NULL)->>'outcome',
  'resolved_rejected',
  'rejected provider status is recorded'
);
SELECT is((SELECT status FROM public.payment_intents WHERE id = '00000000-0000-0000-0000-0000000000e4'), 'rejected', 'rejected intent becomes terminal');
SELECT ok((SELECT processed FROM public.payment_webhook_events WHERE provider = 'flow' AND token = 'token-rejected'), 'rejected webhook is closed');

SELECT is(
  public.settle_payment_intent('flow', 'token-overpay', 'paid', 2000, 'order-overpay')->>'outcome',
  'sale_balance_exceeded',
  'settlement rejects an amount above the locked sale balance'
);
SELECT is((SELECT count(*)::int FROM public.payments WHERE payment_intent_id = '00000000-0000-0000-0000-0000000000e5'), 0, 'overpayment creates no payment row');
SELECT is((SELECT paid_amount FROM public.sales WHERE id = '00000000-0000-0000-0000-0000000000d1'), 4000::numeric, 'rejected overpayment leaves sale balance unchanged');

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);

SELECT is(
  (SELECT stock_before::text || ':' || stock_after::text
     FROM public.adjust_product_stock('00000000-0000-0000-0000-0000000000c1', -2, 'Recuento', 'test_receipt', '00000000-0000-0000-0000-0000000000f1')),
  '10:8',
  'first inventory source applies the stock delta'
);
SELECT is(
  (SELECT stock_before::text || ':' || stock_after::text
     FROM public.adjust_product_stock('00000000-0000-0000-0000-0000000000c1', -2, 'Recuento', 'test_receipt', '00000000-0000-0000-0000-0000000000f1')),
  '10:8',
  'same inventory source replays original result'
);
SELECT is((SELECT stock FROM public.products WHERE id = '00000000-0000-0000-0000-0000000000c1'), 8, 'replay does not change stock twice');
SELECT is((SELECT count(*)::int FROM public.inventory_movements WHERE source_type = 'test_receipt' AND source_id = '00000000-0000-0000-0000-0000000000f1'), 1, 'replay creates only one inventory movement');

SELECT throws_ok(
  $$ INSERT INTO public.inventory_movements (
       business_id, product_id, quantity_delta, stock_before, stock_after,
       movement_type, reason, source_type, source_id, created_by
     ) VALUES (
       '00000000-0000-0000-0000-0000000000b1',
       '00000000-0000-0000-0000-0000000000c1',
       -2, 10, 8, 'adjustment', 'Recuento', 'test_receipt',
       '00000000-0000-0000-0000-0000000000f1',
       '00000000-0000-0000-0000-0000000000a1'
     ) $$,
  '23505',
  NULL,
  'database unique index blocks duplicate inventory source rows'
);

SELECT throws_ok(
  $$ SELECT * FROM public.adjust_product_stock('00000000-0000-0000-0000-0000000000c1', -3, 'Recuento', 'test_receipt', '00000000-0000-0000-0000-0000000000f1') $$,
  '23505',
  'La clave de origen ya fue utilizada con un ajuste diferente',
  'reusing an inventory key with a different payload is rejected'
);
SELECT is(
  (SELECT stock_after
     FROM public.adjust_product_stock('00000000-0000-0000-0000-0000000000c1', -1, 'Segundo movimiento', 'test_receipt', '00000000-0000-0000-0000-0000000000f2')),
  7,
  'a different inventory source is applied normally'
);
SELECT throws_ok(
  $$ SELECT * FROM public.adjust_product_stock('00000000-0000-0000-0000-0000000000c1', -20, 'Sobreajuste', 'test_receipt', '00000000-0000-0000-0000-0000000000f3') $$,
  '23514',
  'El ajuste dejaría el stock en negativo',
  'inventory stock cannot become negative'
);

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', true);
SELECT throws_ok(
  $$ SELECT * FROM public.adjust_product_stock('00000000-0000-0000-0000-0000000000c1', 1, 'No autorizado', 'test_receipt', '00000000-0000-0000-0000-0000000000f4') $$,
  '42501',
  'Sin permisos para ajustar inventario',
  'a user outside the business cannot adjust its inventory'
);

SELECT * FROM finish();
ROLLBACK;
