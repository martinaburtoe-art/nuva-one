BEGIN;
SELECT plan(14);

INSERT INTO auth.users (id)
VALUES ('00000000-0000-0000-0000-00000000aa01');

INSERT INTO public.businesses (id, name, owner_id, plan)
VALUES ('00000000-0000-0000-0000-00000000bb01', 'Nüva Invoice Test', '00000000-0000-0000-0000-00000000aa01', 'starter');

INSERT INTO public.quotes (
  id, business_id, customer_name, items, subtotal, discount_pct, tax, total,
  status, tax_treatment, vat_rate, price_basis, subject, terms
) VALUES (
  '00000000-0000-0000-0000-00000000dd01',
  '00000000-0000-0000-0000-00000000bb01',
  'Cliente de prueba',
  jsonb_build_array(jsonb_build_object('name','Servicio técnico','qty',2,'price',1000)),
  2000, 0, 380, 2380, 'accepted', 'taxable', 19, 'net',
  'Mantención', 'Pago a 15 días'
);

INSERT INTO public.quotes (
  id, business_id, customer_name, items, subtotal, discount_pct, tax, total,
  status, tax_treatment, vat_rate, price_basis
) VALUES (
  '00000000-0000-0000-0000-00000000dd02',
  '00000000-0000-0000-0000-00000000bb01',
  'Cliente sin aceptar',
  jsonb_build_array(jsonb_build_object('name','Servicio','qty',1,'price',1000)),
  1000, 0, 190, 1190, 'draft', 'taxable', 19, 'net'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000aa01', true);

SELECT lives_ok(
  $$SELECT public.convert_accepted_quote_to_invoice('00000000-0000-0000-0000-00000000dd01')$$,
  'an accepted quote converts into an internal invoice draft'
);

RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM public.invoices WHERE quote_id = '00000000-0000-0000-0000-00000000dd01'),
  1,
  'conversion creates exactly one invoice'
);
SELECT is(
  (SELECT status FROM public.invoices WHERE quote_id = '00000000-0000-0000-0000-00000000dd01'),
  'draft',
  'converted invoice remains a draft until explicitly issued'
);
SELECT is(
  (SELECT total FROM public.invoices WHERE quote_id = '00000000-0000-0000-0000-00000000dd01'),
  2380::numeric,
  'invoice preserves the quote total snapshot'
);
SELECT is(
  (SELECT items_snapshot->0->>'name' FROM public.invoices WHERE quote_id = '00000000-0000-0000-0000-00000000dd01'),
  'Servicio técnico',
  'invoice preserves item descriptions as a snapshot'
);
SELECT is(
  (SELECT document_kind FROM public.invoices WHERE quote_id = '00000000-0000-0000-0000-00000000dd01'),
  'internal_invoice',
  'document is explicitly distinguished from a Chilean DTE'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000aa01', true);
SELECT is(
  public.convert_accepted_quote_to_invoice('00000000-0000-0000-0000-00000000dd01'),
  (SELECT id FROM public.invoices WHERE quote_id = '00000000-0000-0000-0000-00000000dd01'),
  'repeated quote conversion returns the same invoice'
);
SELECT throws_ok(
  $$SELECT public.convert_accepted_quote_to_invoice('00000000-0000-0000-0000-00000000dd02')$$,
  'P0001',
  'La cotización debe estar aceptada antes de emitir un documento de cobro',
  'draft quote cannot be converted into an invoice'
);

SELECT is(
  (SELECT count(*)::int FROM public.invoice_payments WHERE invoice_id = (SELECT id FROM public.invoices WHERE quote_id = '00000000-0000-0000-0000-00000000dd01')),
  0,
  'conversion does not invent or register a payment'
);

SELECT lives_ok(
  $$SELECT public.issue_internal_invoice((SELECT id FROM public.invoices WHERE quote_id = '00000000-0000-0000-0000-00000000dd01'), CURRENT_DATE + 15)$$,
  'authorized operator can issue the internal collection document'
);
RESET ROLE;

SELECT is(
  (SELECT status FROM public.invoices WHERE quote_id = '00000000-0000-0000-0000-00000000dd01'),
  'issued',
  'issuing changes draft to issued'
);
SELECT ok(
  (SELECT issued_at IS NOT NULL AND due_date = CURRENT_DATE + 15 FROM public.invoices WHERE quote_id = '00000000-0000-0000-0000-00000000dd01'),
  'issue timestamp and due date are persisted'
);
SELECT is(
  (SELECT count(*)::int FROM public.invoice_events WHERE invoice_id = (SELECT id FROM public.invoices WHERE quote_id = '00000000-0000-0000-0000-00000000dd01') AND event_type IN ('created_from_quote','issued')),
  2,
  'invoice lifecycle is recorded in an auditable event timeline'
);

SELECT * FROM finish();
ROLLBACK;
