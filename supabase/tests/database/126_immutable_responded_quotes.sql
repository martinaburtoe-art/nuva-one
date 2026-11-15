BEGIN;
SELECT plan(4);

INSERT INTO auth.users (id)
VALUES ('00000000-0000-0000-0000-00000000ac01');
INSERT INTO public.businesses (id, name, owner_id, plan)
VALUES ('00000000-0000-0000-0000-00000000ac02', 'Immutable Quote Test',
  '00000000-0000-0000-0000-00000000ac01', 'starter');
INSERT INTO public.quotes (
  id, business_id, customer_name, items, subtotal, discount_pct, tax, total,
  status, tax_treatment, vat_rate, price_basis
) VALUES
  ('00000000-0000-0000-0000-00000000ac03', '00000000-0000-0000-0000-00000000ac02',
   'Cliente aceptó', '[{"name":"Servicio","qty":1,"price":1000}]'::jsonb,
   1000, 0, 190, 1190, 'accepted', 'taxable', 19, 'net'),
  ('00000000-0000-0000-0000-00000000ac04', '00000000-0000-0000-0000-00000000ac02',
   'Cliente rechazó', '[{"name":"Servicio","qty":1,"price":1000}]'::jsonb,
   1000, 0, 190, 1190, 'rejected', 'taxable', 19, 'net'),
  ('00000000-0000-0000-0000-00000000ac05', '00000000-0000-0000-0000-00000000ac02',
   'Respuesta persistida', '[{"name":"Servicio","qty":1,"price":1000}]'::jsonb,
   1000, 0, 190, 1190, 'draft', 'taxable', 19, 'net'),
  ('00000000-0000-0000-0000-00000000ac06', '00000000-0000-0000-0000-00000000ac02',
   'Borrador editable', '[{"name":"Servicio","qty":1,"price":1000}]'::jsonb,
   1000, 0, 190, 1190, 'draft', 'taxable', 19, 'net');

INSERT INTO public.document_share_links (
  business_id, quote_id, token_hash, expires_at, response_action, responded_at
) VALUES (
  '00000000-0000-0000-0000-00000000ac02',
  '00000000-0000-0000-0000-00000000ac05',
  repeat('a', 64),
  now() + interval '1 day',
  'accepted',
  now()
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000ac01', true);

SELECT throws_ok(
  $q$UPDATE public.quotes SET subject = 'Oferta alterada' WHERE id = '00000000-0000-0000-0000-00000000ac03'$q$,
  '23514', 'QUOTE_RESPONSE_IMMUTABLE',
  'accepted quote content cannot be changed after customer response'
);
SELECT throws_ok(
  $q$UPDATE public.quotes SET subject = 'Oferta alterada' WHERE id = '00000000-0000-0000-0000-00000000ac04'$q$,
  '23514', 'QUOTE_RESPONSE_IMMUTABLE',
  'rejected quote content cannot be changed after customer response'
);
SELECT throws_ok(
  $q$UPDATE public.quotes SET customer_name = 'Otro cliente' WHERE id = '00000000-0000-0000-0000-00000000ac05'$q$,
  '23514', 'QUOTE_RESPONSE_IMMUTABLE',
  'persisted portal response prevents edits even if quote status is reset to draft'
);
SELECT lives_ok(
  $q$UPDATE public.quotes SET subject = 'Borrador actualizado' WHERE id = '00000000-0000-0000-0000-00000000ac06'$q$,
  'draft quote remains editable when no active share link exists'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
