BEGIN;
SELECT plan(70);

SELECT has_column('public', 'payment_intents', 'payment_url', 'payment intents retain the original provider redirect');
SELECT has_column('public', 'payments', 'payment_intent_id', 'payments link to their originating intent');
SELECT has_table('public', 'payment_creation_requests', 'payment creation claims are persisted');
SELECT has_index('public', 'payments', 'uq_payments_payment_intent_id', 'one payment row per intent is enforced');
SELECT has_index('public', 'payment_creation_requests', 'uq_payment_creation_requests_active_sale', 'one unresolved provider creation per sale is enforced');
SELECT has_index('public', 'payment_intents', 'uq_payment_intents_provider_commerce_order', 'provider commerce orders are unique');
SELECT has_index('public', 'inventory_movements', 'uq_inventory_adjustments_source_product', 'inventory source keys are unique per product');
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
  'flow', 'idempotency-key-1', 'order-paid-once', 4000, 'POS test', 'creating'
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
     VALUES ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1', 'flow', 'idempotency-key-2', 'order-paid-once', 1000, 'POS test') $$,
  '23505',
  NULL,
  'provider commerce order cannot be reused by another request'
);
SELECT throws_ok(
  $$ INSERT INTO public.payment_creation_requests (business_id, sale_id, provider, idempotency_key, commerce_order, amount, subject)
     VALUES ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1', 'flow', 'idempotency-key-2', 'nuva-order-claim-2', 1000, 'POS test') $$,
  '23505',
  NULL,
  'a sale cannot have two unresolved external payment creation requests'
);
UPDATE public.payment_creation_requests
   SET status = 'created',
       payment_intent_id = '00000000-0000-0000-0000-0000000000e1'
 WHERE idempotency_key = 'idempotency-key-1';
SELECT throws_ok(
  $$ INSERT INTO public.payment_creation_requests (business_id, sale_id, provider, idempotency_key, commerce_order, amount, subject)
     VALUES ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1', 'flow', 'idempotency-key-3', 'nuva-order-claim-3', 1000, 'POS test') $$,
  '23505',
  NULL,
  'a created request keeps its sale reserved while the provider intent is pending'
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
SELECT is(
  (SELECT status FROM public.payment_creation_requests WHERE idempotency_key = 'idempotency-key-1'),
  'closed',
  'atomic settlement closes the active payment creation request'
);
INSERT INTO public.payment_creation_requests (
  business_id, sale_id, provider, idempotency_key, commerce_order, amount, subject, status
)
VALUES (
  '00000000-0000-0000-0000-0000000000b1',
  '00000000-0000-0000-0000-0000000000d1',
  'flow', 'idempotency-key-3', 'nuva-order-claim-3', 1000, 'POS test', 'creating'
);
SELECT is(
  (SELECT count(*)::int FROM public.payment_creation_requests WHERE sale_id = '00000000-0000-0000-0000-0000000000d1'),
  2,
  'a new deliberate attempt is allowed after the previous intent settles'
);
UPDATE public.payment_creation_requests
   SET status = 'closed',
       payment_intent_id = '00000000-0000-0000-0000-0000000000e2'
 WHERE idempotency_key = 'idempotency-key-3';
INSERT INTO public.payment_creation_requests (
  business_id, sale_id, provider, idempotency_key, commerce_order, amount, subject, status, payment_intent_id
)
VALUES (
  '00000000-0000-0000-0000-0000000000b1',
  '00000000-0000-0000-0000-0000000000d1',
  'flow', 'idempotency-key-5', 'order-overpay', 2000, 'POS overpay test', 'created',
  '00000000-0000-0000-0000-0000000000e5'
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
SELECT is(
  (SELECT status FROM public.payment_creation_requests WHERE idempotency_key = 'idempotency-key-5'),
  'recovery_required',
  'a verified charge exceeding the sale balance is quarantined for reconciliation'
);
SELECT ok(
  (SELECT processed FROM public.payment_webhook_events WHERE provider = 'flow' AND token = 'token-overpay'),
  'verified overpayment webhook is closed after recording the recovery requirement'
);
SELECT throws_ok(
  $$ INSERT INTO public.payment_creation_requests (business_id, sale_id, provider, idempotency_key, commerce_order, amount, subject)
     VALUES ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1', 'flow', 'idempotency-key-6', 'order-after-overpay', 1000, 'POS retry') $$,
  '23505',
  NULL,
  'recovery_required sale remains reserved until manual reconciliation'
);
SELECT is((SELECT count(*)::int FROM public.payments WHERE payment_intent_id = '00000000-0000-0000-0000-0000000000e5'), 0, 'overpayment creates no payment row');
SELECT is((SELECT paid_amount FROM public.sales WHERE id = '00000000-0000-0000-0000-0000000000d1'), 4000::numeric, 'rejected overpayment leaves sale balance unchanged');

SELECT is(
  public.settle_payment_intent('flow', 'token-does-not-exist', 'paid', 500, 'order-does-not-exist')->>'outcome',
  'unknown_token',
  'settlement refuses an unknown provider token'
);

INSERT INTO public.payment_intents (
  id, business_id, sale_id, provider, token, commerce_order, amount, status
)
VALUES (
  '00000000-0000-0000-0000-0000000000e6',
  '00000000-0000-0000-0000-0000000000b1',
  '00000000-0000-0000-0000-0000000000d1',
  'flow', 'token-rollback', 'order-rollback', 500, 'pending'
);

CREATE OR REPLACE FUNCTION public.test_fail_payment_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $
BEGIN
  RAISE EXCEPTION 'forced payment accounting failure'
    USING ERRCODE = 'P0001';
END;
$;

CREATE TRIGGER test_fail_payment_insert
BEFORE INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.test_fail_payment_insert();

SELECT throws_ok(
  $ SELECT public.settle_payment_intent('flow', 'token-rollback', 'paid', 500, 'order-rollback') $,
  'P0001',
  'forced payment accounting failure',
  'a payment trigger failure aborts the whole settlement transaction'
);
SELECT is((SELECT status FROM public.payment_intents WHERE id = '00000000-0000-0000-0000-0000000000e6'), 'pending', 'failed settlement leaves intent pending');
SELECT is((SELECT count(*)::int FROM public.payments WHERE payment_intent_id = '00000000-0000-0000-0000-0000000000e6'), 0, 'failed settlement leaves no payment row');
SELECT is((SELECT count(*)::int FROM public.payment_webhook_events WHERE provider = 'flow' AND token = 'token-rollback'), 0, 'failed settlement rolls back webhook receipt');

DROP TRIGGER test_fail_payment_insert ON public.payments;
DROP FUNCTION public.test_fail_payment_insert();

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

INSERT INTO public.purchases (
  id, business_id, status, total, purchase_date, items
)
VALUES (
  '00000000-0000-0000-0000-0000000000f5',
  '00000000-0000-0000-0000-0000000000b1',
  'pending',
  0,
  current_date,
  jsonb_build_array(
    jsonb_build_object('product_id', '00000000-0000-0000-0000-0000000000c1', 'qty', 2),
    jsonb_build_object('product_id', '00000000-0000-0000-0000-0000000000c1', 'qty', 1)
  )
);

UPDATE public.purchases SET status = 'received'
WHERE id = '00000000-0000-0000-0000-0000000000f5';
SELECT is((SELECT stock FROM public.products WHERE id = '00000000-0000-0000-0000-0000000000c1'), 10, 'receiving a purchase adds each line quantity once');
SELECT is((SELECT count(*)::int FROM public.inventory_movements WHERE source_type = 'purchase' AND source_id = '00000000-0000-0000-0000-0000000000f5'), 2, 'purchase receipt records each product line movement');

UPDATE public.purchases SET status = 'received'
WHERE id = '00000000-0000-0000-0000-0000000000f5';
SELECT is((SELECT stock FROM public.products WHERE id = '00000000-0000-0000-0000-0000000000c1'), 10, 'repeated received status does not apply stock twice');
SELECT is((SELECT count(*)::int FROM public.inventory_movements WHERE source_type = 'purchase' AND source_id = '00000000-0000-0000-0000-0000000000f5'), 2, 'repeated received status creates no duplicate movement');

UPDATE public.purchases SET status = 'pending'
WHERE id = '00000000-0000-0000-0000-0000000000f5';
SELECT is((SELECT stock FROM public.products WHERE id = '00000000-0000-0000-0000-0000000000c1'), 7, 'moving a received purchase back to pending reverses its stock effect');
SELECT is((SELECT count(*)::int FROM public.inventory_movements WHERE source_type = 'purchase_reversal' AND source_id = '00000000-0000-0000-0000-0000000000f5'), 2, 'purchase reversal is recorded per line');

UPDATE public.purchases SET status = 'received'
WHERE id = '00000000-0000-0000-0000-0000000000f5';
SELECT is((SELECT stock FROM public.products WHERE id = '00000000-0000-0000-0000-0000000000c1'), 10, 'a deliberate re-receipt applies the purchase effect once again');
SELECT is((SELECT count(*)::int FROM public.inventory_movements WHERE source_type = 'purchase' AND source_id = '00000000-0000-0000-0000-0000000000f5'), 4, 'a deliberate re-receipt adds new auditable movements');

SELECT is(
  (SELECT stock_after
     FROM public.adjust_product_stock('00000000-0000-0000-0000-0000000000c1', -8, 'Consumo de prueba', 'test_receipt', '00000000-0000-0000-0000-0000000000f6')),
  2,
  'inventory can consume part of received purchase stock'
);
SELECT throws_ok(
  $$ UPDATE public.purchases SET status = 'pending' WHERE id = '00000000-0000-0000-0000-0000000000f5' $$,
  '23514',
  'No es posible revertir compra: stock insuficiente',
  'purchase reversal is rejected when its stock has already been consumed'
);
SELECT is((SELECT status::text FROM public.purchases WHERE id = '00000000-0000-0000-0000-0000000000f5'), 'received', 'failed purchase reversal rolls back purchase status');
SELECT ok((SELECT stock_applied FROM public.purchases WHERE id = '00000000-0000-0000-0000-0000000000f5'), 'failed purchase reversal preserves stock_applied');
SELECT is((SELECT stock FROM public.products WHERE id = '00000000-0000-0000-0000-0000000000c1'), 2, 'failed purchase reversal rolls back every stock decrement');

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', true);
SELECT throws_ok(
  $$ SELECT * FROM public.adjust_product_stock('00000000-0000-0000-0000-0000000000c1', 1, 'No autorizado', 'test_receipt', '00000000-0000-0000-0000-0000000000f4') $$,
  '42501',
  'Sin permisos para ajustar inventario',
  'a user outside the business cannot adjust its inventory'
);

SELECT * FROM finish();
ROLLBACK;
