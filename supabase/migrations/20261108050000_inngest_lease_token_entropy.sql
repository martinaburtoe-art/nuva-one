-- Strengthen the task-scoped Inngest lease bearer token to 256 bits of CSPRNG entropy.
-- Preserve the task scope, function signature and service-role-only access.
CREATE OR REPLACE FUNCTION public.agency_claim_task_by_id(p_agent_id text, p_task_id uuid, p_lease_seconds integer DEFAULT 900)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_task public.agency_tasks%rowtype;
  v_lease public.agency_agent_leases%rowtype;
  v_now timestamptz := now();
begin
  if p_agent_id is null or length(trim(p_agent_id)) = 0 then
    raise exception 'agent_id_required';
  end if;
  if p_task_id is null then
    raise exception 'task_id_required';
  end if;
  if p_lease_seconds < 60 or p_lease_seconds > 21600 then
    raise exception 'invalid_lease_seconds';
  end if;

  update public.agency_agent_leases l
    set status = 'expired'
    where l.task_id = p_task_id
      and l.status = 'active'
      and l.expires_at < v_now
      and exists (
        select 1 from public.agency_tasks t
        where t.id = p_task_id and t.agent_id = p_agent_id
      );

  update public.agency_tasks t
    set status = 'queued', lease_id = null, updated_at = v_now
    where t.id = p_task_id
      and t.agent_id = p_agent_id
      and t.status in ('claimed', 'running')
      and (t.lease_id is null or not exists (
        select 1 from public.agency_agent_leases l
        where l.id = t.lease_id and l.status = 'active' and l.expires_at >= v_now
      ));

  select t.* into v_task
    from public.agency_tasks t
    where t.id = p_task_id
      and t.agent_id = p_agent_id
      and t.status in ('queued', 'failed')
      and (t.next_retry_at is null or t.next_retry_at <= v_now)
      and t.attempt_count < t.max_attempts
      and not exists (
        select 1
        from unnest(t.depends_on) d
        join public.agency_tasks dep on dep.id = d
        where dep.status <> 'completed'
      )
    for update skip locked;

  if not found then
    return null;
  end if;

  v_lease.id := gen_random_uuid();
  v_lease.task_id := v_task.id;
  v_lease.agent_id := p_agent_id;
  v_lease.lease_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_lease.status := 'active';
  v_lease.heartbeat_at := v_now;
  v_lease.expires_at := v_now + make_interval(secs => p_lease_seconds);

  insert into public.agency_agent_leases(
    id, task_id, agent_id, lease_token, status, heartbeat_at, expires_at
  ) values (
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
  ) values (
    v_task.mission_id, v_task.id, p_agent_id, 'task.claimed', 'info',
    'Agent claimed task-scoped Inngest certification task',
    jsonb_build_object('lease_id', v_lease.id, 'expires_at', v_lease.expires_at, 'scope', 'task-id')
  );

  update public.agency_missions
    set status = 'running',
        current_agent_id = p_agent_id,
        last_heartbeat_at = v_now,
        started_at = coalesce(started_at, v_now),
        updated_at = v_now
    where id = v_task.mission_id and status in ('queued', 'planning', 'blocked');

  return jsonb_build_object(
    'task', to_jsonb(v_task),
    'lease', jsonb_build_object(
      'id', v_lease.id, 'token', v_lease.lease_token, 'expires_at', v_lease.expires_at
    )
  );
end;
$function$

REVOKE ALL ON FUNCTION public.agency_claim_task_by_id(text, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.agency_claim_task_by_id(text, uuid, integer) TO service_role;

-- Apply the same CSPRNG token hardening to the general Agency claim RPC.
CREATE OR REPLACE FUNCTION public.agency_claim_task(p_agent_id text, p_lease_seconds integer DEFAULT 900)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
  v_lease.lease_token := encode(extensions.gen_random_bytes(32), 'hex');
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
$function$

REVOKE ALL ON FUNCTION public.agency_claim_task(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.agency_claim_task(text, integer) TO service_role;
