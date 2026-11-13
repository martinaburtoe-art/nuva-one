BEGIN;
SELECT plan(25);

SELECT has_table('public', 'payment_recovery_audit', 'payment recovery decisions have an audit table');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.payment_recovery_audit'::regclass), 'recovery audit table has row-level security enabled');
SELECT ok(has_table_privilege('service_role', 'public.payment_recovery_audit', 'SELECT'), 'service_role can read recovery audit');
SELECT ok(NOT has_table_privilege('authenticated', 'public.payment_recovery_audit', 'SELECT'), 'authenticated users cannot read recovery audit');
SELECT ok(to_regprocedure('public.owner_record_payment_recovery_action(uuid,uuid,text,text,jsonb,uuid)') IS NOT NULL, 'owner action RPC exists');
SELECT ok(has_function_privilege('service_role', 'public.owner_record_payment_recovery_action(uuid,uuid,text,text,jsonb,uuid)', 'EXECUTE'), 'service_role can record owner actions');
SELECT ok(NOT has_function_privilege('authenticated', 'public.owner_record_payment_recovery_action(uuid,uuid,text,text,jsonb,uuid)', 'EXECUTE'), 'authenticated users cannot record owner actions');
SELECT ok(to_regprocedure('public.owner_reconcile_payment_recovery(uuid,uuid,text,numeric,text)') IS NOT NULL, 'provider reconciliation RPC exists');
SELECT ok(has_function_privilege('service_role', 'public.owner_reconcile_payment_recovery(uuid,uuid,text,numeric,text)', 'EXECUTE'), 'service_role can reconcile verified provider results');
SELECT ok(NOT has_function_privilege('authenticated', 'public.owner_reconcile_payment_recovery(uuid,uuid,text,numeric,text)', 'EXECUTE'), 'authenticated users cannot reconcile provider results');

INSERT INTO auth.users (id)
VALUES ('00000000-0000-0000-0000-0000000000a1');

INSERT INTO public.businesses (id, name, owner_id, plan)
VALUES ('00000000-0000-0000-0000-0000000000b1', 'Recovery Test Business', '00000000-0000-0000-0000-0000000000a1', 'starter');

INSERT INTO public.sales (id, business_id, status, total, items, is_credit, paid_amount)
VALUES ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', 'pending', 2000, '[]'::jsonb, false, 0);

INSERT INTO public.payment_intents (id,business_id,sale_id,provider,token,commerce_order,amount,status)
VALUES
('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000d1','flow','recovery-token-paid','recovery-order-paid',1000,'pending'),
('00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000d1','flow','recovery-token-rejected','recovery-order-rejected',500,'pending');

INSERT INTO public.payment_creation_requests (
  id,business_id,sale_id,provider,idempotency_key,commerce_order,amount,subject,status,payment_intent_id
) VALUES (
  '00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000d1',
  'flow','recovery-key-paid','recovery-order-paid',1000,'Recovery paid test','recovery_required','00000000-0000-0000-0000-0000000000e1'
),(
  '00000000-0000-0000-0000-0000000000f2','00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000d1',
  'flow','recovery-key-rejected','recovery-order-rejected',500,'Recovery rejected test','recovery_required',NULL
);

SELECT set_config('request.jwt.claim.role','service_role',true);

SELECT is(
  public.owner_record_payment_recovery_action(
    '00000000-0000-0000-0000-0000000000f2',
    '00000000-0000-0000-0000-0000000000a1',
    'link_intent',
    'Vincular intento coincidente',
    '{"source":"test_fixture","matched":true}'::jsonb,
    '00000000-0000-0000-0000-0000000000e2'
  )->>'action',
  'link_intent',
  'owner can link an exact same-business provider intent'
);
SELECT is((SELECT payment_intent_id FROM public.payment_creation_requests WHERE id='00000000-0000-0000-0000-0000000000f2'), '00000000-0000-0000-0000-0000000000e2'::uuid, 'link action persists only the matching intent');
SELECT is((SELECT status FROM public.payment_creation_requests WHERE id='00000000-0000-0000-0000-0000000000f2'), 'recovery_required', 'linking an intent never releases the sale reservation');
SELECT is((SELECT count(*)::int FROM public.payment_recovery_audit WHERE request_id='00000000-0000-0000-0000-0000000000f2'), 1, 'intent linking is audited');
SELECT throws_ok(
  $$ SELECT public.owner_record_payment_recovery_action(
    '00000000-0000-0000-0000-0000000000f2',
    '00000000-0000-0000-0000-0000000000a1',
    'note',
    'Do not store credentials',
    '{"api_key":"must-not-persist"}'::jsonb,
    NULL
  ) $$,
  '22023',
  'sensitive provider material cannot be stored as evidence',
  'audit evidence rejects credentials and provider secrets'
);

SELECT is(
  public.owner_reconcile_payment_recovery(
    '00000000-0000-0000-0000-0000000000f1',
    '00000000-0000-0000-0000-0000000000a1',
    'pending', NULL, NULL
  )->>'outcome',
  'provider_pending',
  'pending provider response leaves the request quarantined'
);
SELECT is((SELECT status FROM public.payment_creation_requests WHERE id='00000000-0000-0000-0000-0000000000f1'), 'recovery_required', 'pending provider result does not release reservation');
SELECT is(
  public.owner_reconcile_payment_recovery(
    '00000000-0000-0000-0000-0000000000f1',
    '00000000-0000-0000-0000-0000000000a1',
    'paid', 999, 'recovery-order-paid'
  )->>'outcome',
  'provider_mismatch',
  'provider amount mismatch remains quarantined'
);
SELECT is((SELECT count(*)::int FROM public.payments WHERE payment_intent_id='00000000-0000-0000-0000-0000000000e1'), 0, 'mismatched provider evidence creates no payment');
SELECT is(
  public.owner_reconcile_payment_recovery(
    '00000000-0000-0000-0000-0000000000f1',
    '00000000-0000-0000-0000-0000000000a1',
    'paid', 1000, 'recovery-order-paid'
  )->>'outcome',
  'resolved_paid',
  'verified matching provider payment settles atomically'
);
SELECT is((SELECT status FROM public.payment_creation_requests WHERE id='00000000-0000-0000-0000-0000000000f1'), 'closed', 'verified paid result closes the recovery request');
SELECT is((SELECT status FROM public.payment_intents WHERE id='00000000-0000-0000-0000-0000000000e1'), 'paid', 'verified paid result updates the payment intent');
SELECT is((SELECT count(*)::int FROM public.payments WHERE payment_intent_id='00000000-0000-0000-0000-0000000000e1'), 1, 'verified recovery creates one payment row');
SELECT is((SELECT paid_amount FROM public.sales WHERE id='00000000-0000-0000-0000-0000000000d1'), 1000::numeric, 'payment trigger updates the sale balance');
SELECT is(
  public.owner_reconcile_payment_recovery(
    '00000000-0000-0000-0000-0000000000f2',
    '00000000-0000-0000-0000-0000000000a1',
    'rejected', NULL, NULL
  )->>'outcome',
  'verified_rejected',
  'verified provider rejection safely releases the reservation'
);
SELECT is((SELECT status FROM public.payment_creation_requests WHERE id='00000000-0000-0000-0000-0000000000f2'), 'closed', 'verified rejection closes the request');
SELECT is((SELECT status FROM public.payment_intents WHERE id='00000000-0000-0000-0000-0000000000e2'), 'rejected', 'verified rejection updates the linked intent');
SELECT is((SELECT count(*)::int FROM public.payment_recovery_audit), 5, 'every link and provider verification is recorded');

SELECT * FROM finish();
ROLLBACK;
