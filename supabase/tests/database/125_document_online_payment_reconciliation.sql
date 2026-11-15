BEGIN;
SELECT plan(11);

SELECT has_column('public', 'payment_intents', 'invoice_id',
  'payment intents can reference an internal invoice');

SELECT has_column('public', 'payment_intents', 'checkout_url',
  'payment intents persist the provider checkout URL for safe reuse');

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'payment_intents'
      AND indexname = 'payment_intents_one_pending_invoice_idx'
  ),
  'each internal invoice can have at most one pending checkout'
);

SELECT has_table('public', 'document_delivery_attempts',
  'document email delivery attempts are auditable');

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.document_delivery_attempts'::regclass),
  'delivery attempts enforce row-level security'
);

SELECT has_function(
  'public',
  'record_provider_internal_invoice_payment',
  ARRAY['uuid','numeric','text','text','text'],
  'provider payment reconciliation RPC exists'
);

SELECT ok(
  has_function_privilege(
    'service_role',
    'public.record_provider_internal_invoice_payment(uuid,numeric,text,text,text)',
    'EXECUTE'
  ),
  'only the backend service role can reconcile provider payments'
);

SELECT ok(
  NOT has_function_privilege(
    'anon',
    'public.record_provider_internal_invoice_payment(uuid,numeric,text,text,text)',
    'EXECUTE'
  ),
  'anonymous callers cannot mark invoices paid'
);

SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.record_provider_internal_invoice_payment(uuid,numeric,text,text,text)',
    'EXECUTE'
  ),
  'authenticated browser clients cannot mark invoices paid'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.document_delivery_attempts', 'SELECT')
  AND NOT has_table_privilege('authenticated', 'public.document_delivery_attempts', 'INSERT,UPDATE,DELETE'),
  'delivery ledger does not expose anonymous access or browser-side writes'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.invoice_payments'::regclass
      AND tgname = 'invoice_payments_expire_pending_checkout'
      AND NOT tgisinternal
  ),
  'confirmed manual or provider payments expire outstanding checkout links'
);

SELECT * FROM finish();
ROLLBACK;
