BEGIN;
SELECT plan(85);

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
