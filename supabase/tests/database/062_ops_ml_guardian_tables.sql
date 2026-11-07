BEGIN;
SELECT plan(9);

SELECT has_table('public', 'ops_findings', 'ops_findings existe');
SELECT has_table('public', 'ops_metrics_hourly', 'ops_metrics_hourly existe');
SELECT has_table('public', 'ops_anomalies', 'ops_anomalies existe');
SELECT has_table('public', 'ops_llm_usage', 'ops_llm_usage existe');

SELECT ok(
  (SELECT bool_and(c.relrowsecurity) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname in ('ops_findings','ops_metrics_hourly','ops_anomalies','ops_llm_usage')),
  'RLS habilitado en las 4 tablas'
);
SELECT ok(NOT has_table_privilege('anon', 'public.ops_findings', 'SELECT'), 'anon sin acceso a ops_findings');
SELECT ok(NOT has_table_privilege('authenticated', 'public.ops_anomalies', 'SELECT'), 'authenticated sin acceso a ops_anomalies');
SELECT ok(has_function_privilege('service_role', 'public.ops_record_metric(text,numeric)', 'EXECUTE'), 'service_role puede ejecutar ops_record_metric');
SELECT ok(has_function_privilege('service_role', 'public.ops_detect_anomalies(integer)', 'EXECUTE'), 'service_role puede ejecutar ops_detect_anomalies');

SELECT * FROM finish();
ROLLBACK;
