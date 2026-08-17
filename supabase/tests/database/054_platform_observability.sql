BEGIN;
SELECT plan(9);

SELECT has_table('public', 'platform_events', 'platform_events exists');
SELECT has_function('public', 'platform_metrics', ARRAY['timestamptz','timestamptz'], 'platform_metrics exists');
SELECT has_index('public', 'platform_events', 'idx_platform_events_created', 'created index exists');
SELECT has_index('public', 'platform_events', 'idx_platform_events_type_created', 'type index exists');
SELECT has_index('public', 'platform_events', 'idx_platform_events_business_created', 'business index exists');
SELECT has_table_privilege('anon', 'public.platform_events', 'SELECT') = false AS anon_cannot_read;
SELECT has_table_privilege('authenticated', 'public.platform_events', 'SELECT') = false AS authenticated_cannot_read;
SELECT has_function_privilege('anon', 'public.platform_metrics(timestamptz,timestamptz)', 'EXECUTE') = false AS anon_cannot_execute_metrics;
SELECT has_function_privilege('authenticated', 'public.platform_metrics(timestamptz,timestamptz)', 'EXECUTE') = false AS authenticated_cannot_execute_metrics;

SELECT * FROM finish();
ROLLBACK;
