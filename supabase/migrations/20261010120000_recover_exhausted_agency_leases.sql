-- Recover expired Agency leases without leaving exhausted tasks permanently queued.
-- A task at max_attempts must become explicitly failed for owner review, not silently requeued.
create or replace function public.agency_claim_task(
  p_agent_id text,
  p_lease_seconds integer default 900
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_task public.agency_tasks%rowtype;
  v_lease public.agency_agent_leases%rowtype;
  v_now timestamptz := now();
begin
  if p_agent_id is null or length(trim(p_agent_id)) = 0 then
    raise exception 'agent_id_required';
  end if;
  if p_lease_seconds < 60 or p_lease_seconds > 21600 then
    raise exception 'invalid_lease_seconds';
  end if;

  update public.agency_agent_leases
     set status = 'expired'
   where status = 'active'
     and expires_at < v_now;

  with recovered as (
    update public.agency_tasks t
       set status = case
             when t.attempt_count >= t.max_attempts then 'failed'
             else 'queued'
           end,
           lease_id = null,
           completed_at = case
             when t.attempt_count >= t.max_attempts then v_now
             else null
           end,
           error = case
             when t.attempt_count >= t.max_attempts then jsonb_build_object(
               'code', 'max_attempts_exhausted',
               'message', 'Lease expired after maximum attempts; owner review required',
               'attempt_count', t.attempt_count,
               'max_attempts', t.max_attempts
             )
             else t.error
           end,
           updated_at = v_now
     where (
       (
         t.status in ('claimed', 'running')
         and (
           t.lease_id is null
           or not exists (
             select 1
               from public.agency_agent_leases l
              where l.id = t.lease_id
                and l.status = 'active'
                and l.expires_at >= v_now
           )
         )
       )
       or (
         t.status = 'queued'
         and t.attempt_count >= t.max_attempts
       )
     )
     returning t.id, t.mission_id, t.agent_id, t.status, t.attempt_count, t.max_attempts
  )
  insert into public.agency_events(
    mission_id, task_id, agent_id, event_type, level, message, payload
  )
  select
    r.mission_id,
    r.id,
    r.agent_id,
    'task.recovery_exhausted',
    'error',
    'Expired lease reached maximum attempts; task marked failed for owner review',
    jsonb_build_object(
      'attempt_count', r.attempt_count,
      'max_attempts', r.max_attempts,
      'reason', 'lease_expired'
    )
  from recovered r
  where r.status = 'failed';

  select t.*
    into v_task
    from public.agency_tasks t
   where t.agent_id = p_agent_id
     and t.status in ('queued', 'failed')
     and (t.next_retry_at is null or t.next_retry_at <= v_now)
     and t.attempt_count < t.max_attempts
     and not exists (
       select 1
         from unnest(t.depends_on) d
         join public.agency_tasks dep on dep.id = d
        where dep.status <> 'completed'
     )
   order by t.priority desc, t.created_at asc
   for update skip locked
   limit 1;

  if not found then
    return null;
  end if;

  v_lease.id := gen_random_uuid();
  v_lease.task_id := v_task.id;
  v_lease.agent_id := p_agent_id;
  v_lease.lease_token := md5(v_lease.id::text || v_task.id::text || clock_timestamp()::text);
  v_lease.status := 'active';
  v_lease.heartbeat_at := v_now;
  v_lease.expires_at := v_now + make_interval(secs => p_lease_seconds);

  insert into public.agency_agent_leases(
    id, task_id, agent_id, lease_token, status, heartbeat_at, expires_at
  )
  values (
    v_lease.id, v_lease.task_id, v_lease.agent_id, v_lease.lease_token,
    'active', v_now, v_lease.expires_at
  );

  update public.agency_tasks
     set status = 'claimed',
         lease_id = v_lease.id,
         claimed_at = coalesce(claimed_at, v_now),
         started_at = coalesce(started_at, v_now),
         attempt_count = attempt_count + 1,
         updated_at = v_now
   where id = v_task.id;

  insert into public.agency_events(
    mission_id, task_id, agent_id, event_type, level, message, payload
  )
  values (
    v_task.mission_id, v_task.id, p_agent_id,
    'task.claimed', 'info', 'Agent claimed durable task',
    jsonb_build_object('lease_id', v_lease.id, 'expires_at', v_lease.expires_at)
  );

  update public.agency_missions
     set status = 'running',
         current_agent_id = p_agent_id,
         last_heartbeat_at = v_now,
         started_at = coalesce(started_at, v_now),
         updated_at = v_now
   where id = v_task.mission_id
     and status in ('queued', 'planning', 'blocked');

  return jsonb_build_object(
    'task', to_jsonb(v_task),
    'lease', jsonb_build_object(
      'id', v_lease.id,
      'token', v_lease.lease_token,
      'expires_at', v_lease.expires_at
    )
  );
end;
$function$;
