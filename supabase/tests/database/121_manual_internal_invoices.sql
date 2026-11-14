BEGIN;
SELECT plan(8);

INSERT INTO auth.users (id) VALUES
  ('00000000-0000-0000-0000-00000000ec01'),
  ('00000000-0000-0000-0000-00000000ec02');
INSERT INTO public.businesses (id, name, owner_id, plan)
VALUES ('00000000-0000-0000-0000-00000000ed01', 'Manual Invoice Test',
  '00000000-0000-0000-0000-00000000ec01', 'starter');

SELECT has_function(
  'public', 'create_manual_internal_invoice', ARRAY['uuid','jsonb'],
  'manual internal invoice RPC is installed'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000ec01', true);
SELECT lives_ok(
  $q$SELECT public.create_manual_internal_invoice(
    '00000000-0000-0000-0000-00000000ed01',
    '{"customer_name":"Cliente directo","customer_snapshot":{"tax_id":"12.345.678-9"},"items":[{"name":"Servicio","qty":2,"price":10000}],"tax_treatment":"taxable","price_basis":"net","vat_rate":19,"discount_pct":10}'::jsonb
  )$q$,
  'business owner can create a manual internal invoice'
);
SELECT is(
  (SELECT count(*)::int FROM public.invoices
   WHERE business_id = '00000000-0000-0000-0000-00000000ed01' AND quote_id IS NULL),
  1,
  'manual invoice is independent from quote conversion'
);
SELECT is(
  (SELECT total::numeric FROM public.invoices
   WHERE business_id = '00000000-0000-0000-0000-00000000ed01'),
  21420::numeric,
  'server recalculates net, discount and Chilean VAT correctly'
);
SELECT is(
  (SELECT event_type FROM public.invoice_events e
   JOIN public.invoices i ON i.id = e.invoice_id
   WHERE i.business_id = '00000000-0000-0000-0000-00000000ed01'),
  'created_manual',
  'manual invoice creation is recorded in the audit timeline'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000ec02', true);
SELECT throws_ok(
  $q$SELECT public.create_manual_internal_invoice(
    '00000000-0000-0000-0000-00000000ed01',
    '{"customer_name":"Intruso","items":[{"name":"Servicio","qty":1,"price":1000}]}'::jsonb
  )$q$,
  'P0001',
  'Sin permisos para crear documentos en este negocio',
  'non-members cannot create manual invoices'
);
RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM public.invoices
   WHERE business_id = '00000000-0000-0000-0000-00000000ed01'),
  1,
  'unauthorized attempts do not create invoices'
);
SELECT * FROM finish();
ROLLBACK;
