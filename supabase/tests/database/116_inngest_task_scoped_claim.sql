BEGIN;
SELECT plan(18);

SELECT ok(
  has_function_privilege('service_role', 'public.agency_claim_task_by_id(text, uuid, integer)', 'EXECUTE'),
  'service_role can execute the task-scoped claim RPC'
);
SELECT ok(
  NOT has_function_privilege('anon', 'public.agency_claim_task_by_id(text, uuid, integer)', 'EXECUTE'),
  'anon cannot execute the task-scoped claim RPC'
);
SELECT ok(
  NOT has_function_privilege('authenticated', 'public.agency_claim_task_by_id(text, uuid, integer)', 'EXECUTE'),
  'authenticated cannot execute the task-scoped claim RPC'
);
SELECT ok(
  position('extensions.gen_random_bytes(32)' in pg_get_functiondef('public.agency_claim_task_by_id(text, uuid, integer)'::regprocedure)) > 0
  AND position('md5(' in pg_get_functiondef('public.agency_claim_task_by_id(text, uuid, integer)'::regprocedure)) = 0,
  'task-scoped lease token uses cryptographically secure random bytes'
);
SELECT ok(
  position('extensions.gen_random_bytes(32)' in pg_get_functiondef('public.agency_claim_task(text, integer)'::regprocedure)) > 0
  AND position('md5(' in pg_get_functiondef('public.agency_claim_task(text, integer)'::regprocedure)) = 0,
  'general Agency lease token uses cryptographically secure random bytes'
);

-- Build isolated fixtures; the enclosing transaction rolls them all back.
CREATE TEMP TABLE agency_claim_test_ids ON COMMIT DROP AS
SELECT gen_random_uuid() AS mission_id,
       gen_random_uuid() AS target_task_id,
       gen_random_uuid() AS unrelated_task_id;

INSERT INTO public.agency_missions (id, title, objective)
SELECT mission_id, 'pgTAP scoped claim test', 'Verify one exact task is claimed and completed'
FROM agency_claim_test_ids;

INSERT INTO public.agency_tasks (id, mission_id, title, objective, agent_id, priority)
SELECT target_task_id, mission_id, 'target task', 'Claim only this task', 'finance', 100
FROM agency_claim_test_ids
UNION ALL
SELECT unrelated_task_id, mission_id, 'unrelated task', 'Leave this task untouched', 'sales', 50
FROM agency_claim_test_ids;

CREATE TEMP TABLE agency_wrong_claim (data jsonb) ON COMMIT DROP;
INSERT INTO agency_wrong_claim
SELECT public.agency_claim_task_by_id('sales', target_task_id, 1800)
FROM agency_claim_test_ids;

SELECT is((SELECT data FROM agency_wrong_claim), NULL::jsonb, 'wrong specialist cannot claim another agent task');
SELECT is(
  (SELECT status FROM public.agency_tasks WHERE id=(SELECT target_task_id FROM agency_claim_test_ids)),
  'queued'::text,
  'wrong specialist attempt leaves target task queued'
);

CREATE TEMP TABLE agency_proper_claim (data jsonb) ON COMMIT DROP;
INSERT INTO agency_proper_claim
SELECT public.agency_claim_task_by_id('finance', target_task_id, 1800)
FROM agency_claim_test_ids;

SELECT is(
  (SELECT data->'task'->>'id' FROM agency_proper_claim),
  (SELECT target_task_id::text FROM agency_claim_test_ids),
  'claim returns the exact task UUID requested'
);
SELECT is(
  (SELECT status FROM public.agency_tasks WHERE id=(SELECT target_task_id FROM agency_claim_test_ids)),
  'claimed'::text,
  'only the requested task moves to claimed'
);
SELECT is(
  (SELECT status FROM public.agency_tasks WHERE id=(SELECT unrelated_task_id FROM agency_claim_test_ids)),
  'queued'::text,
  'unrelated queued task remains untouched'
);
SELECT is(
  (SELECT count(*)::int FROM public.agency_agent_leases
   WHERE task_id=(SELECT target_task_id FROM agency_claim_test_ids) AND status='active'),
  1,
  'exactly one active lease is created for the target task'
);
SELECT is(
  (SELECT count(*)::int FROM public.agency_agent_leases
   WHERE task_id=(SELECT unrelated_task_id FROM agency_claim_test_ids)),
  0,
  'no lease is created for the unrelated task'
);
SELECT is(
  length((SELECT data->'lease'->>'token' FROM agency_proper_claim)),
  64,
  'lease bearer token contains 256 bits of random entropy'
);

CREATE TEMP TABLE agency_finish_result (ok boolean) ON COMMIT DROP;
INSERT INTO agency_finish_result
SELECT public.agency_finish_task(
  (SELECT data->'lease'->>'token' FROM agency_proper_claim),
  'completed',
  'pgTAP scoped claim completed',
  jsonb_build_object('engine', 'pgTAP', 'scope', 'exact-task')
);

SELECT is((SELECT ok FROM agency_finish_result), true, 'task-scoped lease can finish the exact claimed task');
SELECT is(
  (SELECT status FROM public.agency_tasks WHERE id=(SELECT target_task_id FROM agency_claim_test_ids)),
  'completed'::text,
  'target task is completed'
);
SELECT is(
  (SELECT status FROM public.agency_agent_leases WHERE task_id=(SELECT target_task_id FROM agency_claim_test_ids)),
  'released'::text,
  'lease is released after completion'
);
SELECT is(
  (SELECT status FROM public.agency_tasks WHERE id=(SELECT unrelated_task_id FROM agency_claim_test_ids)),
  'queued'::text,
  'unrelated task remains queued after target completion'
);
SELECT is(
  (SELECT count(*)::int FROM public.agency_agent_leases
   WHERE task_id=(SELECT target_task_id FROM agency_claim_test_ids) AND status='active'),
  0,
  'no active lease remains for the completed target'
);

SELECT * FROM finish();
ROLLBACK;
