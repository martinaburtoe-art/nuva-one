BEGIN;
SELECT plan(3);
SELECT ok(position('has_business_role' in pg_get_functiondef(p.oid)) > 0, 'private summary implementation checks business membership') FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='private' AND p.proname='get_cash_register_summary';
SELECT ok(NOT EXISTS (SELECT 1 FROM information_schema.role_routine_grants WHERE routine_schema='public' AND routine_name='get_cash_register_summary' AND grantee='anon' AND privilege_type='EXECUTE'), 'summary RPC is not exposed to anon');
SELECT ok(EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_cash_register_summary' AND p.prosecdef=false), 'public summary wrapper runs with invoker privileges');
SELECT * FROM finish();
ROLLBACK;
