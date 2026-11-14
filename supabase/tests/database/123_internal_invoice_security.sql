BEGIN;
SELECT plan(17);

INSERT INTO auth.users (id) VALUES
  ('00000000-0000-0000-0000-00000000fa01'),
  ('00000000-0000-0000-0000-00000000fa02');

INSERT INTO public.businesses (id, name, owner_id, plan)
VALUES ('00000000-0000-0000-0000-00000000fb01', 'Invoice Security Test',
  '00000000-0000-0000-0000-00000000fa01', 'starter');

INSERT INTO public.invoices (
  id, business_id, invoice_number, status, customer_name,
  subtotal, discount_amount, tax_treatment, price_basis, vat_rate, tax_amount, total
) VALUES (
  '00000000-0000-0000-0000-00000000fc01',
  '00000000-0000-0000-0000-00000000fb01',
  1, 'issued', 'Cliente privado', 1000, 0, 'taxable', 'net', 19, 190, 1190
);

INSERT INTO public.invoice_payments (
  id, business_id, invoice_id, amount, payment_method, idempotency_key, status
) VALUES (
  '00000000-0000-0000-0000-00000000fd01',
  '00000000-0000-0000-0000-00000000fb01',
  '00000000-0000-0000-0000-00000000fc01',
  500, 'transferencia', 'security-test-payment-01', 'confirmed'
);

INSERT INTO public.invoice_events (
  business_id, invoice_id, event_type, event_data
) VALUES (
  '00000000-0000-0000-0000-00000000fb01',
  '00000000-0000-0000-0000-00000000fc01',
  'issued', '{"test":true}'::jsonb
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.invoices'::regclass),
  'invoices enforce row-level security'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.invoice_payments'::regclass),
  'invoice payments enforce row-level security'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.invoice_events'::regclass),
  'invoice events enforce row-level security'
);
SELECT ok(has_table_privilege('authenticated', 'public.invoices', 'SELECT'),
  'authenticated users have SELECT privilege subject to RLS');
SELECT ok(has_table_privilege('authenticated', 'public.invoice_payments', 'SELECT'),
  'authenticated users have payment SELECT privilege subject to RLS');
SELECT ok(has_table_privilege('authenticated', 'public.invoice_events', 'SELECT'),
  'authenticated users have event SELECT privilege subject to RLS');
SELECT ok(NOT has_table_privilege('anon', 'public.invoices', 'SELECT'),
  'anonymous users cannot read invoices');
SELECT ok(NOT has_table_privilege('anon', 'public.invoice_payments', 'SELECT'),
  'anonymous users cannot read payments');
SELECT ok(NOT has_table_privilege('anon', 'public.invoice_events', 'SELECT'),
  'anonymous users cannot read events');
SELECT ok(NOT has_table_privilege('authenticated', 'public.invoices', 'INSERT'),
  'authenticated users cannot insert invoices directly');
SELECT ok(NOT has_table_privilege('authenticated', 'public.invoice_payments', 'INSERT'),
  'authenticated users cannot insert payments directly');
SELECT ok(NOT has_table_privilege('authenticated', 'public.invoice_events', 'INSERT'),
  'authenticated users cannot insert audit events directly');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000fa01', true);
SELECT is((SELECT count(*)::int FROM public.invoices WHERE id = '00000000-0000-0000-0000-00000000fc01'),
  1, 'business owner can read its invoice');
SELECT is((SELECT count(*)::int FROM public.invoice_payments WHERE id = '00000000-0000-0000-0000-00000000fd01'),
  1, 'business owner can read its invoice payment');
SELECT is((SELECT count(*)::int FROM public.invoice_events WHERE invoice_id = '00000000-0000-0000-0000-00000000fc01'),
  1, 'business owner can read its invoice timeline');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000fa02', true);
SELECT is((SELECT count(*)::int FROM public.invoices WHERE id = '00000000-0000-0000-0000-00000000fc01'),
  0, 'user outside the business cannot read its invoices');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
