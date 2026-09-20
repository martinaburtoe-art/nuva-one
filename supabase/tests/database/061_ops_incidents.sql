BEGIN;
SELECT plan(5);

SELECT has_table('public', 'ops_incidents', 'ops_incidents existe');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.ops_incidents'::regclass), 'RLS habilitado');
SELECT ok(NOT has_table_privilege('anon', 'public.ops_incidents', 'SELECT'), 'anon sin acceso');
SELECT ok(NOT has_table_privilege('authenticated', 'public.ops_incidents', 'SELECT'), 'authenticated sin acceso');
SELECT ok(has_table_privilege('service_role', 'public.ops_incidents', 'INSERT') AND has_table_privilege('service_role', 'public.ops_incidents', 'UPDATE'), 'service_role puede escribir');

SELECT * FROM finish();
ROLLBACK;
