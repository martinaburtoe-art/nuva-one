BEGIN;
SELECT plan(4);
SELECT has_table('public','platform_events','platform_events exists');
SELECT ok(EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='platform_events' AND indexname='platform_events_occurred_at_idx'),'platform event time index exists');
SELECT is(has_function_privilege('anon','public.platform_metrics(timestamptz,timestamptz)','EXECUTE'),false,'anon cannot execute platform metrics');
SELECT is(has_function_privilege('authenticated','public.platform_metrics(timestamptz,timestamptz)','EXECUTE'),false,'authenticated cannot execute platform metrics');
SELECT * FROM finish();
ROLLBACK;
