begin;
select plan(4);

create temporary table agency_recovery_fixture (
  mission_id uuid not null default gen_random_uuid(),
  task_id uuid not null default gen_random_uuid()
) on commit drop;
insert into agency_recovery_fixture default values;

insert into public.agency_missions(id, title, objective, status, priority, metadata)
select mission_id, 'Expired lease recovery test', 'Verify exhausted leases become visible failures', 'running', 1000,
       '{"mode":"durable-autonomous-agency","scope":"test"}'::jsonb
from agency_recovery_fixture;

insert into public.agency_tasks(
  id, mission_id, title, objective, agent_id, status, priority,
  attempt_count, max_attempts, lease_id
)
select task_id, mission_id, 'Exhausted task fixture', 'Must not remain queued after lease recovery',
       'qa', 'running', 1000, 3, 3, null
from agency_recovery_fixture;

-- Recovery runs before claim selection. The fixture task is exhausted and must not be claimed again.
select public.agency_claim_task('qa', 900);

select is(
  (select status from public.agency_tasks where id=(select task_id from agency_recovery_fixture)),
  'failed',
  'expired task at max_attempts is marked failed rather than left queued'
);

select is(
  (select error->>'code' from public.agency_tasks where id=(select task_id from agency_recovery_fixture)),
  'max_attempts_exhausted',
  'recovery stores a machine-readable max-attempts error'
);

select ok(
  (select completed_at is not null from public.agency_tasks where id=(select task_id from agency_recovery_fixture)),
  'exhausted task receives a terminal timestamp'
);

select is(
  (select count(*)::integer from public.agency_events
    where task_id=(select task_id from agency_recovery_fixture)
      and event_type='task.recovery_exhausted'),
  1,
  'recovery emits exactly one owner-visible failure event'
);

select * from finish();
rollback;
