BEGIN;
SELECT plan(19);

INSERT INTO auth.users (id) VALUES
  ('00000000-0000-0000-0000-00000000aa11'),
  ('00000000-0000-0000-0000-00000000aa12');
INSERT INTO public.businesses (id, name, owner_id, plan)
VALUES ('00000000-0000-0000-0000-00000000bb11', 'Share Portal Test',
  '00000000-0000-0000-0000-00000000aa11', 'starter');
INSERT INTO public.quotes (
  id, business_id, customer_name, items, subtotal, discount_pct, tax, total,
  status, tax_treatment, vat_rate, price_basis, valid_until
) VALUES (
  '00000000-0000-0000-0000-00000000cc11',
  '00000000-0000-0000-0000-00000000bb11',
  'Cliente Portal',
  '[{"name":"Servicio","qty":1,"price":1000}]'::jsonb,
  1000, 0, 190, 1190, 'sent', 'taxable', 19, 'net', CURRENT_DATE + 10
);

SELECT ok(to_regclass('public.document_share_links') IS NOT NULL,
  'secure quote share links table exists');
SELECT ok(to_regclass('public.document_share_events') IS NOT NULL,
  'quote sharing audit events table exists');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.document_share_links'::regclass),
  'share links enforce row-level security');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.document_share_events'::regclass),
  'share events enforce row-level security');
SELECT ok(NOT has_table_privilege('anon', 'public.document_share_links', 'SELECT'),
  'anonymous users cannot query stored share tokens');
SELECT ok(NOT has_table_privilege('anon', 'public.document_share_events', 'SELECT'),
  'anonymous users cannot query private sharing audit events');
SELECT ok(has_function_privilege('anon', 'public.get_shared_quote(text)', 'EXECUTE'),
  'anonymous users can resolve a link only through the scoped quote RPC');
SELECT ok(has_function_privilege('anon', 'public.respond_to_shared_quote(text,text,text,text,text)', 'EXECUTE'),
  'anonymous users can submit a customer response only through the scoped RPC');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000aa11', true);
SELECT ok(public.create_quote_share_link(
  '00000000-0000-0000-0000-00000000cc11',
  repeat('a',64), now() + interval '7 days'
) IS NOT NULL, 'business staff can create an expiring share link');
RESET ROLE;

SELECT ok(
  (SELECT token_hash = encode(sha256(convert_to(repeat('a',64),'UTF8')),'hex')
   FROM public.document_share_links WHERE quote_id = '00000000-0000-0000-0000-00000000cc11'),
  'database stores only a one-way token hash'
);

SET LOCAL ROLE anon;
SELECT is(public.get_shared_quote(repeat('a',64))->>'customer_name',
  'Cliente Portal', 'valid public link returns the intended quote');
SELECT ok(NOT (public.get_shared_quote(repeat('a',64)) ? 'business_id'),
  'public quote payload does not expose internal business identifiers');
SELECT is(public.get_shared_quote(repeat('a',64))->>'status',
  'viewed', 'opening a sent quote records its viewed state');
SELECT is((SELECT count(*)::int FROM public.document_share_events
  WHERE quote_id = '00000000-0000-0000-0000-00000000cc11' AND event_type = 'viewed'),
  1, 'reopening a viewed quote does not duplicate the view event');
SELECT is(public.respond_to_shared_quote(
  repeat('a',64), 'accepted', 'Cliente Receptor', 'cliente@example.cl',
  'He revisado y acepto esta cotización en su versión compartida.'
)->>'status', 'accepted', 'customer can accept the exact shared quote');
RESET ROLE;

SELECT is((SELECT status FROM public.quotes WHERE id = '00000000-0000-0000-0000-00000000cc11'),
  'accepted', 'customer acceptance updates the quote lifecycle');
SELECT ok((SELECT responded_at IS NOT NULL AND response_email = 'cliente@example.cl'
  FROM public.document_share_links WHERE quote_id = '00000000-0000-0000-0000-00000000cc11'),
  'acceptance evidence is persisted with timestamp and customer email');

SET LOCAL ROLE anon;
SELECT is(public.get_shared_quote(repeat('a',64)), NULL::jsonb,
  'a responded link cannot be reused to read the quote');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000aa12', true);
SELECT is((SELECT count(*)::int FROM public.document_share_links
  WHERE quote_id = '00000000-0000-0000-0000-00000000cc11'), 0,
  'users outside the business cannot inspect share links');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
