-- Make task finalization idempotent for Inngest/network retries after a committed finish.
-- A repeated finish is accepted only when the released lease, task result and durable event match exactly.
CREATE OR REPLACE FUNCTION public.agency_finish_task(p_lease_token text, p_status text, p_summary text, p_result jsonb DEFAULT '{}'::jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare v_lease agency_agent_leases%rowtype; v_task agency_tasks%rowtype; v_now timestamptz:=now(); v_durable boolean; v_retry boolean;
begin
 if p_status not in ('completed','failed','blocked','waiting_approval') then raise exception 'invalid_task_status'; end if;
 select * into v_lease from agency_agent_leases where lease_token=p_lease_token for update;
 if not found then return false; end if;
 if v_lease.status='released' then
   select * into v_task from agency_tasks where id=v_lease.task_id;
   if not found then return false; end if;
   if v_task.output_summary is not distinct from p_summary
      and v_task.result is not distinct from coalesce(p_result,'{}'::jsonb)
      and exists(
        select 1 from agency_events e
        where e.task_id=v_task.id
          and e.agent_id=v_lease.agent_id
          and e.event_type='task.'||p_status
          and e.message=coalesce(p_summary,'Task finished')
          and e.payload=coalesce(p_result,'{}'::jsonb)
      ) then
     return true;
   end if;
   return false;
 end if;
 if v_lease.status <> 'active' then return false; end if;
 select * into v_task from agency_tasks where id=v_lease.task_id for update;
 if not found then return false; end if;
 select coalesce((metadata->>'mode')='durable-autonomous-agency',false) into v_durable from agency_missions where id=v_task.mission_id;
 v_retry:=p_status='failed' and v_task.attempt_count<v_task.max_attempts;
 update agency_tasks set status=case when v_retry then 'queued' else p_status end,output_summary=p_summary,result=coalesce(p_result,'{}'::jsonb),
 error=case when p_status='failed' then coalesce(p_result,'{}'::jsonb) else null end,
 completed_at=case when v_retry then null else v_now end,
 next_retry_at=case when v_retry then v_now+make_interval(secs=>least(3600,30*(2^least(v_task.attempt_count,6)))) else null end,updated_at=v_now where id=v_task.id;
 update agency_agent_leases set status='released',released_at=v_now,heartbeat_at=v_now where id=v_lease.id;
 insert into agency_events(mission_id,task_id,agent_id,event_type,level,message,payload)
 values(v_task.mission_id,v_task.id,v_lease.agent_id,'task.'||p_status,case when p_status='completed' then 'success' when p_status='failed' then 'error' else 'warn' end,coalesce(p_summary,'Task finished'),coalesce(p_result,'{}'::jsonb));
 if v_durable then
   update agency_missions set status=case when p_status in ('blocked','waiting_approval') then 'blocked' else 'running' end,current_agent_id=v_lease.agent_id,last_heartbeat_at=v_now,updated_at=v_now where id=v_task.mission_id;
 elsif p_status='completed' then
   if not exists(select 1 from agency_tasks where mission_id=v_task.mission_id and status not in ('completed','cancelled')) then update agency_missions set status='completed',completed_at=v_now,last_heartbeat_at=v_now,updated_at=v_now where id=v_task.mission_id; end if;
 elsif p_status in ('failed','blocked','waiting_approval') then update agency_missions set status=case when p_status='waiting_approval' then 'blocked' else p_status end,last_heartbeat_at=v_now,updated_at=v_now where id=v_task.mission_id;
 end if;
 return true;
end; $function$

REVOKE ALL ON FUNCTION public.agency_finish_task(text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.agency_finish_task(text, text, text, jsonb) TO service_role;
