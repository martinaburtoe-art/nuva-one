begin;
select plan(5);

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
select ok(
  position('extensions.gen_random_bytes(32)' in pg_get_functiondef('public.agency_claim_task_by_id(text, uuid, integer)'::regprocedure)) > 0
  and position('md5(' in pg_get_functiondef('public.agency_claim_task_by_id(text, uuid, integer)'::regprocedure)) = 0,
  'task-scoped lease token uses cryptographically secure random bytes'
);
select ok(
  position('extensions.gen_random_bytes(32)' in pg_get_functiondef('public.agency_claim_task(text, integer)'::regprocedure)) > 0
  and position('md5(' in pg_get_functiondef('public.agency_claim_task(text, integer)'::regprocedure)) = 0,
  'general Agency lease token uses cryptographically secure random bytes'
);

select * from finish();
rollback;
