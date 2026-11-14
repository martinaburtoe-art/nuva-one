BEGIN;
SELECT plan(12);

INSERT INTO auth.users (id)
VALUES ('00000000-0000-0000-0000-00000000ef01');
INSERT INTO public.businesses (id, name, owner_id, plan)
VALUES ('00000000-0000-0000-0000-00000000ef02', 'Gross Basis Test',
  '00000000-0000-0000-0000-00000000ef01', 'starter');

SELECT has_function(
  'public', 'create_manual_internal_invoice', ARRAY['uuid','jsonb'],
  'manual invoice RPC supports gross-price calculations'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000ef01', true);

SELECT lives_ok(
  $q$SELECT public.create_manual_internal_invoice(
    '00000000-0000-0000-0000-00000000ef02',
    '{"customer_name":"Cliente IVA incluido","items":[{"name":"Servicio","qty":1,"price":1190}],"tax_treatment":"taxable","price_basis":"gross","vat_rate":19,"discount_pct":10}'::jsonb
  )$q$,
  'gross-priced invoice with discount can be created'
);

SELECT lives_ok(
  $q$SELECT public.create_manual_internal_invoice(
    '00000000-0000-0000-0000-00000000ef02',
    '{"customer_name":"Cliente exento","items":[{"name":"Servicio exento","qty":1,"price":1000}],"tax_treatment":"exempt","price_basis":"gross","vat_rate":19,"discount_pct":0}'::jsonb
  )$q$,
  'gross-priced exempt invoice can be created without adding VAT'
);
RESET ROLE;

SELECT is(
  (SELECT subtotal FROM public.invoices WHERE customer_name = 'Cliente IVA incluido'),
  1000::numeric,
  'gross input of CLP 1190 is normalized to CLP 1000 net subtotal'
);
SELECT is(
  (SELECT discount_amount FROM public.invoices WHERE customer_name = 'Cliente IVA incluido'),
  100::numeric,
  'discount is applied to the normalized net subtotal'
);
SELECT is(
  (SELECT tax_amount FROM public.invoices WHERE customer_name = 'Cliente IVA incluido'),
  171::numeric,
  'VAT is calculated after the discount on the net taxable base'
);
SELECT is(
  (SELECT total FROM public.invoices WHERE customer_name = 'Cliente IVA incluido'),
  1071::numeric,
  'gross-basis total reconciles to net less discount plus VAT'
);
SELECT is(
  (SELECT price_basis FROM public.invoices WHERE customer_name = 'Cliente IVA incluido'),
  'gross',
  'invoice retains the original gross price basis for accurate document rendering'
);
SELECT is(
  ((SELECT items_snapshot->0->>'price' FROM public.invoices WHERE customer_name = 'Cliente IVA incluido'))::numeric,
  1190::numeric,
  'item snapshot preserves the exact entered gross unit price'
);
SELECT is(
  (SELECT vat_rate FROM public.invoices WHERE customer_name = 'Cliente exento'),
  0::numeric,
  'exempt invoices persist a zero VAT rate even if the payload supplies 19'
);
SELECT is(
  (SELECT total FROM public.invoices WHERE customer_name = 'Cliente exento'),
  1000::numeric,
  'exempt gross-price invoice does not add VAT'
);
SELECT is(
  (SELECT tax_amount FROM public.invoices WHERE customer_name = 'Cliente exento'),
  0::numeric,
  'exempt invoice has zero tax amount'
);

SELECT * FROM finish();
ROLLBACK;
