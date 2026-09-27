begin;
select plan(13);

select ok(to_regprocedure('public.nuva_core_integrity_audit()') is not null,'core integrity audit function exists');
select ok((select prosecdef from pg_proc where oid='public.nuva_core_integrity_audit()'::regprocedure),'core integrity audit uses security definer');
select ok(has_function_privilege('anon','public.nuva_core_integrity_audit()','EXECUTE') is false,'core integrity audit blocked for anon');
select ok(has_function_privilege('authenticated','public.nuva_core_integrity_audit()','EXECUTE') is false,'core integrity audit blocked for authenticated');

select is((select count(*)::integer from public.nuva_core_integrity_audit() where failures <> 0),0,'core integrity audit has no failing checks');
select is((select count(*)::integer from public.nuva_core_integrity_audit() where severity not in ('critical','high')),0,'core integrity audit severities are controlled');
select is((select count(*)::integer from public.nuva_core_integrity_audit()),11,'core integrity audit exposes all 11 checks');
select is((select count(*)::integer from public.nuva_core_integrity_audit() where check_name='sales_without_transaction' and failures=0),1,'sales transaction integrity is clean');
select is((select count(*)::integer from public.nuva_core_integrity_audit() where check_name='sales_paid_without_stock' and failures=0),1,'sales stock integrity is clean');
select is((select count(*)::integer from public.nuva_core_integrity_audit() where check_name='sales_accounting_pending' and failures=0),1,'sales accounting integrity is clean');
select is((select count(*)::integer from public.nuva_core_integrity_audit() where check_name='purchases_received_without_stock' and failures=0),1,'purchase stock integrity is clean');
select is((select count(*)::integer from public.nuva_core_integrity_audit() where check_name='unbalanced_posted_journals' and failures=0),1,'posted journal balance integrity is clean');
select is((select count(*)::integer from public.nuva_core_integrity_audit() where check_name='action_outcome_orphans' and failures=0),1,'action outcome integrity is clean');

select * from finish();
rollback;