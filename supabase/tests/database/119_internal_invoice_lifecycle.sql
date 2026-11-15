BEGIN;
SELECT plan(30);

INSERT INTO auth.users (id)
VALUES ('00000000-0000-0000-0000-00000000aa01');

INSERT INTO public.businesses (id, name, owner_id, plan, giro, address, comuna, public_contact_email, public_contact_phone)
VALUES (
  '00000000-0000-0000-0000-00000000bb01', 'Nüva Invoice Test',
  '00000000-0000-0000-0000-00000000aa01', 'starter',
  'Servicios profesionales', 'Av. Uno 123', 'Santiago',
  'contacto@example.test', '+56911111111'
);

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

INSERT INTO public.quotes (
  id, business_id, customer_name, items, subtotal, discount_pct, tax, total,
  status, tax_treatment, vat_rate, price_basis
) VALUES (
  '00000000-0000-0000-0000-00000000dd03',
  '00000000-0000-0000-0000-00000000bb01',
  'Cliente para venta',
  jsonb_build_array(jsonb_build_object('name','Instalación','qty',1,'price',1000)),
  1000, 0, 190, 1190, 'accepted', 'taxable', 19, 'net'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000aa01', true);

SELECT lives_ok(
  $q$SELECT public.convert_accepted_quote_to_invoice('00000000-0000-0000-0000-00000000dd01')$q$,
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
SELECT throws_ok(
  $q$SELECT public.convert_quote_to_sale('00000000-0000-0000-0000-00000000dd01')$q$,
  'P0001',
  'La cotización ya fue convertida en documento interno de cobro',
  'an invoiced quote cannot also become a sale'
);
RESET ROLE;
SELECT is(
  (SELECT issuer_snapshot->>'name' FROM public.invoices WHERE quote_id = '00000000-0000-0000-0000-00000000dd01'),
  'Nüva Invoice Test',
  'invoice preserves issuer identity snapshot'
);
SELECT is(
  (SELECT issuer_snapshot->>'address' FROM public.invoices WHERE quote_id = '00000000-0000-0000-0000-00000000dd01'),
  'Av. Uno 123',
  'invoice preserves issuer address snapshot for the PDF'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000aa01', true);
SELECT is(
  public.convert_accepted_quote_to_invoice('00000000-0000-0000-0000-00000000dd01'),
  (SELECT id FROM public.invoices WHERE quote_id = '00000000-0000-0000-0000-00000000dd01'),
  'repeated quote conversion returns the same invoice'
);
SELECT throws_ok(
  $q$SELECT public.convert_accepted_quote_to_invoice('00000000-0000-0000-0000-00000000dd02')$q$,
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
  $q$SELECT public.issue_internal_invoice((SELECT id FROM public.invoices WHERE quote_id = '00000000-0000-0000-0000-00000000dd01'), CURRENT_DATE + 15)$q$,
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

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000aa01', true);
SELECT throws_ok(
  $q$SELECT public.record_internal_invoice_payment(
    (SELECT id FROM public.invoices WHERE quote_id = '00000000-0000-0000-0000-00000000dd01'),
    1000.5, 'transferencia', 'TRX-DECIMAL', 'manual-invoice-payment-decimal'
  )$q$,
  'P0001',
  'El abono debe ser un importe positivo en pesos enteros',
  'CLP payment amounts must be whole pesos'
);
RESET ROLE;


SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000aa01', true);
SELECT lives_ok(
  $q$SELECT public.record_internal_invoice_payment(
    (SELECT id FROM public.invoices WHERE quote_id = '00000000-0000-0000-0000-00000000dd01'),
    1000, 'transferencia', 'TRX-001', 'manual-invoice-payment-001'
  )$q$,
  'authorized operator can record a partial manual payment'
);
RESET ROLE;

SELECT is(
  (SELECT status FROM public.invoices WHERE quote_id = '00000000-0000-0000-0000-00000000dd01'),
  'partially_paid',
  'partial payment moves invoice into partially_paid state'
);
SELECT ok(
  (SELECT p.transaction_id IS NOT NULL
   FROM public.invoice_payments p
   JOIN public.invoices i ON i.id = p.invoice_id
   WHERE i.quote_id = '00000000-0000-0000-0000-00000000dd01'
     AND p.idempotency_key = 'manual-invoice-payment-001'),
  'confirmed receipt is linked to its cash-flow transaction'
);
SELECT is(
  (SELECT count(*)::int FROM public.transactions
   WHERE business_id = '00000000-0000-0000-0000-00000000bb01'
     AND type = 'income' AND category = 'Cobros de documentos'),
  1,
  'partial payment creates one income transaction'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000aa01', true);
SELECT is(
  public.record_internal_invoice_payment(
    (SELECT id FROM public.invoices WHERE quote_id = '00000000-0000-0000-0000-00000000dd01'),
    1000, 'transferencia', 'TRX-001', 'manual-invoice-payment-001'
  ),
  (SELECT id FROM public.invoice_payments WHERE idempotency_key = 'manual-invoice-payment-001'),
  'repeated payment request returns the original payment id'
);
RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM public.transactions
   WHERE business_id = '00000000-0000-0000-0000-00000000bb01'
     AND type = 'income' AND category = 'Cobros de documentos'),
  1,
  'idempotent payment retry does not duplicate cash-flow transaction'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000aa01', true);
SELECT throws_ok(
  $q$SELECT public.record_internal_invoice_payment(
    (SELECT id FROM public.invoices WHERE quote_id = '00000000-0000-0000-0000-00000000dd01'),
    1381, 'transferencia', 'TRX-OVER', 'manual-invoice-payment-over'
  )$q$,
  'P0001',
  'El abono supera el saldo pendiente',
  'payment cannot exceed the remaining invoice balance'
);
SELECT lives_ok(
  $q$SELECT public.record_internal_invoice_payment(
    (SELECT id FROM public.invoices WHERE quote_id = '00000000-0000-0000-0000-00000000dd01'),
    1380, 'transferencia', 'TRX-002', 'manual-invoice-payment-002'
  )$q$,
  'remaining balance can be settled with a second payment'
);
RESET ROLE;

SELECT is(
  (SELECT status FROM public.invoices WHERE quote_id = '00000000-0000-0000-0000-00000000dd01'),
  'paid',
  'settled invoice moves to paid state'
);
SELECT ok(
  (SELECT paid_at IS NOT NULL FROM public.invoices WHERE quote_id = '00000000-0000-0000-0000-00000000dd01'),
  'fully settled invoice records paid timestamp'
);
SELECT is(
  (SELECT count(*)::int FROM public.transactions
   WHERE business_id = '00000000-0000-0000-0000-00000000bb01'
     AND type = 'income' AND category = 'Cobros de documentos'),
  2,
  'each distinct confirmed payment creates one cash-flow transaction'
);


SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000aa01', true);
SELECT lives_ok(
  $q$SELECT public.convert_quote_to_sale('00000000-0000-0000-0000-00000000dd03')$q$,
  'an accepted quote can still convert into a draft sale when no invoice exists'
);
SELECT throws_ok(
  $q$SELECT public.convert_accepted_quote_to_invoice('00000000-0000-0000-0000-00000000dd03')$q$,
  'P0001',
  'La cotización ya fue convertida en venta',
  'a quote already converted to a sale cannot also become an invoice'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
