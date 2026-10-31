begin;
select plan(30);

-- Least-privilege server-side access required by the Agency APIs.
select ok(has_table_privilege('service_role', 'public.agency_missions', 'SELECT'), 'service_role can read agency_missions');
select ok(has_table_privilege('service_role', 'public.agency_missions', 'INSERT'), 'service_role can create agency_missions');
select ok(has_table_privilege('service_role', 'public.agency_missions', 'UPDATE'), 'service_role can pause/resume agency_missions');
select ok(has_table_privilege('service_role', 'public.agency_tasks', 'SELECT'), 'service_role can read agency_tasks');
select ok(has_table_privilege('service_role', 'public.agency_tasks', 'INSERT'), 'service_role can delegate agency_tasks');
select ok(has_table_privilege('service_role', 'public.agency_events', 'SELECT'), 'service_role can read agency_events');
select ok(has_table_privilege('service_role', 'public.agency_events', 'INSERT'), 'service_role can append agency_events');
select ok(has_table_privilege('service_role', 'public.agency_agent_leases', 'SELECT'), 'service_role can read agency_agent_leases');
select ok(has_table_privilege('service_role', 'public.agency_approvals', 'SELECT'), 'service_role can read agency_approvals');
select ok(has_table_privilege('service_role', 'public.agency_approvals', 'INSERT'), 'service_role can create agency_approvals');
select ok(has_table_privilege('service_role', 'public.agency_approvals', 'UPDATE'), 'service_role can record approval decisions');
select ok(has_table_privilege('service_role', 'public.agency_artifacts', 'SELECT'), 'service_role can read agency_artifacts');
select ok(has_table_privilege('service_role', 'public.agency_artifacts', 'INSERT'), 'service_role can store agency_artifacts');

-- Client roles must remain denied; RLS is not a substitute for SQL grants.
select ok(not has_table_privilege('anon', 'public.agency_missions', 'SELECT'), 'anon cannot read agency_missions');
select ok(not has_table_privilege('authenticated', 'public.agency_missions', 'SELECT'), 'authenticated cannot read agency_missions');
select ok(not has_table_privilege('anon', 'public.agency_tasks', 'SELECT'), 'anon cannot read agency_tasks');
select ok(not has_table_privilege('authenticated', 'public.agency_tasks', 'SELECT'), 'authenticated cannot read agency_tasks');
select ok(not has_table_privilege('anon', 'public.agency_events', 'SELECT'), 'anon cannot read agency_events');
select ok(not has_table_privilege('authenticated', 'public.agency_events', 'SELECT'), 'authenticated cannot read agency_events');
select ok(not has_table_privilege('anon', 'public.agency_agent_leases', 'SELECT'), 'anon cannot read agency_agent_leases');
select ok(not has_table_privilege('authenticated', 'public.agency_agent_leases', 'SELECT'), 'authenticated cannot read agency_agent_leases');
select ok(not has_table_privilege('anon', 'public.agency_approvals', 'SELECT'), 'anon cannot read agency_approvals');
select ok(not has_table_privilege('authenticated', 'public.agency_approvals', 'SELECT'), 'authenticated cannot read agency_approvals');
select ok(not has_table_privilege('anon', 'public.agency_artifacts', 'SELECT'), 'anon cannot read agency_artifacts');
select ok(not has_table_privilege('authenticated', 'public.agency_artifacts', 'SELECT'), 'authenticated cannot read agency_artifacts');

select ok(has_sequence_privilege('service_role', 'public.agency_events_id_seq', 'USAGE'), 'service_role can use agency_events identity sequence');
select ok(has_sequence_privilege('service_role', 'public.agency_events_id_seq', 'SELECT'), 'service_role can inspect agency_events identity sequence');
select ok(not has_sequence_privilege('anon', 'public.agency_events_id_seq', 'USAGE'), 'anon cannot use agency_events identity sequence');
select ok(not has_sequence_privilege('authenticated', 'public.agency_events_id_seq', 'USAGE'), 'authenticated cannot use agency_events identity sequence');

select is(
  (select count(*)::integer
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('agency_missions','agency_tasks','agency_events','agency_agent_leases','agency_approvals','agency_artifacts')
      and c.relrowsecurity),
  6,
  'RLS remains enabled on all six Agency control-plane tables'
);

select * from finish();
rollback;
