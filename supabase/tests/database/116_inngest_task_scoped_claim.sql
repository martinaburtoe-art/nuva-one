begin;
select plan(3);

select ok(
  has_function_privilege('service_role', 'public.agency_claim_task_by_id(text, uuid, integer)', 'EXECUTE'),
  'service_role can execute the task-scoped claim RPC'
);
select ok(
  not has_function_privilege('anon', 'public.agency_claim_task_by_id(text, uuid, integer)', 'EXECUTE'),
  'anon cannot execute the task-scoped claim RPC'
);
select ok(
  not has_function_privilege('authenticated', 'public.agency_claim_task_by_id(text, uuid, integer)', 'EXECUTE'),
  'authenticated cannot execute the task-scoped claim RPC'
);

select * from finish();
rollback;
