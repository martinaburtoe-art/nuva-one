-- Owner Console v1 · Pruebas de AUTORIZACIÓN por comportamiento (no solo catálogo).
-- Simula roles reales con request.jwt.claims (patrón estándar Supabase local):
--   owner de plataforma: sub 00000001 con app_metadata.platform_role='owner'
--   usuario normal:      sub 00000002 sin platform_role
--   anon:                sin claims
-- La suite completa corre en la base efímera de CI contra la cadena de migraciones.

BEGIN;
SELECT plan(19);

-- ══ Fixtures (postgres ignora RLS) ═══════════════════════════════════════
INSERT INTO auth.users (id, email, raw_app_meta_data) VALUES
  ('00000000-0000-0000-0000-000000000001', 'owner@console.test', '{"platform_role":"owner"}'::jsonb),
  ('00000000-0000-0000-0000-000000000002', 'member@console.test', '{}'::jsonb);

INSERT INTO public.businesses (id, name, owner_id) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Negocio Console QA', '00000000-0000-0000-0000-000000000002');

INSERT INTO public.forum_topics (id, business_id, business_name, author_user_id, title, body, status) VALUES
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Negocio Console QA', '00000000-0000-0000-0000-000000000002', 'Tema publicado visible', 'Cuerpo de tema publicado para pruebas de visibilidad.', 'published'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Negocio Console QA', '00000000-0000-0000-0000-000000000002', 'Tema retirado por moderacion', 'Cuerpo del tema retirado (unlisted).', 'unlisted'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'Negocio Console QA', '00000000-0000-0000-0000-000000000002', 'Tema borrador de moderacion', 'Cuerpo del borrador visible solo para el owner.', 'draft');

-- ══ Catálogo mínimo ═════════════════════════════════════════════════════
SELECT has_column('public', 'forum_topics', 'is_pinned', 'forum_topics.is_pinned existe');
SELECT has_column('public', 'forum_topics', 'status', 'forum_topics.status existe');
SELECT ok(EXISTS (SELECT 1 FROM pg_policies p WHERE p.tablename='forum_topics' AND p.policyname='Platform owner moderates forum_topics' AND p.cmd='UPDATE' AND 'authenticated'=ANY(p.roles)), 'politica de moderacion UPDATE owner-only existe');
SELECT ok(position('status' IN (SELECT qual FROM pg_policies WHERE tablename='forum_topics' AND policyname='Public read forum_topics')) > 0, 'lectura publica filtra por status');

-- ══ Comportamiento: PROPIETARIO DE PLATAFORMA ════════════════════════════
SELECT set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-000000000001','role','authenticated',
    'app_metadata', jsonb_build_object('platform_role','owner'))::text, true);
SET ROLE authenticated;

UPDATE public.forum_topics SET is_pinned = true
  WHERE id = '30000000-0000-0000-0000-000000000001';
SELECT is((SELECT count(*) FROM public.forum_topics WHERE id='30000000-0000-0000-0000-000000000001' AND is_pinned), 1::bigint, 'owner: puede fijar (UPDATE) un tema');

SELECT is((SELECT count(*) FROM public.forum_topics), 3::bigint, 'owner: ve TODOS los temas (incl. draft y unlisted)');

INSERT INTO public.site_content (content_key, title, body, published) VALUES
  ('home_faq', 'FAQ de pruebas', '{"items":[]}'::jsonb, true);
SELECT is((SELECT count(*) FROM public.site_content WHERE content_key='home_faq'), 1::bigint, 'owner: puede crear site_content');

INSERT INTO public.owner_admin_actions (actor_user_id, action, target_type) VALUES
  ('00000000-0000-0000-0000-000000000001', 'test_action', 'test');
SELECT is((SELECT count(*) FROM public.owner_admin_actions), 1::bigint, 'owner: puede registrar auditoría');

SELECT is((SELECT count(*) FROM public.owner_alert_thresholds), 4::bigint, 'owner: umbrales sembrados (4 iniciales)');

SELECT is((SELECT count(*) FROM public.owner_incidents), 0::bigint, 'owner: sin incidentes iniciales');

RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);

-- ══ Comportamiento: USUARIO NORMAL AUTHENTICATED ═════════════════════════
SELECT set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-000000000002','role','authenticated')::text, true);
SET ROLE authenticated;

SELECT is((SELECT count(*) FROM public.forum_topics), 1::bigint, 'usuario normal: solo ve published (draft y unlisted ocultos)');

UPDATE public.forum_topics SET is_pinned = true
  WHERE id = '30000000-0000-0000-0000-000000000002';
SELECT is((SELECT count(*) FROM public.forum_topics WHERE id='30000000-0000-0000-0000-000000000002' AND is_pinned), 0::bigint, 'usuario normal: NO puede moderar (UPDATE sin efecto)');

SELECT is((SELECT count(*) FROM public.site_content), 1::bigint, 'usuario normal: solo ve site_content publicado');

SELECT throws_ok(
  'INSERT INTO public.site_content (content_key, title, body) VALUES (''hack'', ''x'', ''{}''::jsonb)',
  'new row violates row-level security policy for table "site_content"', 'usuario normal: INSERT en site_content denegado por RLS');

SELECT throws_ok(
  'INSERT INTO public.owner_admin_actions (actor_user_id, action, target_type) VALUES (''00000000-0000-0000-0000-000000000002'', ''hack'', ''hack'')',
  'new row violates row-level security policy for table "owner_admin_actions"', 'usuario normal: INSERT en auditoría denegado por RLS');

SELECT is((SELECT count(*) FROM public.owner_alert_thresholds), 0::bigint, 'usuario normal: NO ve umbrales de alertas');
SELECT is((SELECT count(*) FROM public.owner_incidents), 0::bigint, 'usuario normal: NO ve incidentes');

RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);

-- ══ Comportamiento: ANON (visitante público) ═════════════════════════════
SET ROLE anon;
SELECT is((SELECT count(*) FROM public.forum_topics), 1::bigint, 'anon: solo ve temas published');
SELECT is((SELECT count(*) FROM public.site_content WHERE published), 1::bigint, 'anon: solo ve site_content publicado');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
