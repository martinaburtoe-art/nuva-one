BEGIN;
SELECT plan(10);

INSERT INTO auth.users (id) VALUES
  ('00000000-0000-0000-0000-00000000ea01'),
  ('00000000-0000-0000-0000-00000000ea02');

INSERT INTO public.businesses (id, name, owner_id, plan)
VALUES (
  '00000000-0000-0000-0000-00000000eb01',
  'Nüva Template Test',
  '00000000-0000-0000-0000-00000000ea01',
  'starter'
);

SELECT ok(
  to_regclass('public.document_templates') IS NOT NULL,
  'document template storage migration creates its table'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.document_templates'::regclass),
  'document templates enforce row-level security'
);
SELECT ok(
  has_table_privilege('authenticated', 'public.document_templates', 'SELECT'),
  'authenticated business members can read templates subject to RLS'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.document_templates', 'SELECT'),
  'anonymous users cannot read private business templates'
);
SELECT ok(
  has_table_privilege('authenticated', 'public.document_templates', 'INSERT'),
  'authenticated owners can attempt template creation subject to RLS'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000ea01', true);
SELECT lives_ok(
  $q$INSERT INTO public.document_templates (business_id, name, document_kind, is_default, design, created_by)
     VALUES ('00000000-0000-0000-0000-00000000eb01', 'Marca principal', 'all', TRUE,
       '{"brandColor":"#182741","showLogo":true,"showTaxId":true,"footerNote":"Gracias por preferirnos"}'::jsonb,
       '00000000-0000-0000-0000-00000000ea01')$q$,
  'business owner can create the default document template'
);
SELECT is(
  (SELECT design->>'brandColor' FROM public.document_templates
   WHERE business_id = '00000000-0000-0000-0000-00000000eb01' AND is_default),
  '#182741',
  'template stores its brand color as JSON design data'
);
SELECT lives_ok(
  $q$UPDATE public.document_templates SET design = design || '{"showLogo":false}'::jsonb
     WHERE business_id = '00000000-0000-0000-0000-00000000eb01'$q$,
  'business owner can update the document template'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000ea02', true);
SELECT is(
  (SELECT count(*)::int FROM public.document_templates
   WHERE business_id = '00000000-0000-0000-0000-00000000eb01'),
  0,
  'a user outside the business cannot read its templates'
);
SELECT throws_ok(
  $q$INSERT INTO public.document_templates (business_id, name, document_kind, design)
     VALUES ('00000000-0000-0000-0000-00000000eb01', 'Intruso', 'all', '{}'::jsonb)$q$,
  '42501',
  'new row violates row-level security policy for table "document_templates"',
  'a user outside the business cannot create a template'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
