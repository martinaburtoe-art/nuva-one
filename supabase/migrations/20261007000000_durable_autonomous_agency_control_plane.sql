-- Durable autonomous agency control plane for Nüva One.
-- Internal-only tables: service_role/server routes own access; RLS is defense in depth.

create table if not exists public.agency_missions (
  id uuid primary key default gen_random_uuid(), title text not null, objective text not null,
  status text not null default 'queued' check (status in ('queued','planning','running','blocked','paused','completed','cancelled','failed')),
  priority integer not null default 50 check (priority between 0 and 100), owner_user_id uuid,
  current_agent_id text, metadata jsonb not null default '{}'::jsonb, success_criteria jsonb not null default '[]'::jsonb,
  last_heartbeat_at timestamptz, started_at timestamptz, completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.agency_tasks (
  id uuid primary key default gen_random_uuid(), mission_id uuid not null references public.agency_missions(id) on delete cascade,
  parent_task_id uuid references public.agency_tasks(id) on delete set null, title text not null, objective text not null,
  agent_id text not null, status text not null default 'queued' check (status in ('queued','claimed','running','blocked','waiting_approval','completed','failed','cancelled')),
  priority integer not null default 50 check (priority between 0 and 100), attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 20), depends_on uuid[] not null default '{}'::uuid[],
  input_context jsonb not null default '{}'::jsonb, output_summary text, result jsonb not null default '{}'::jsonb,
  error jsonb, lease_id uuid, claimed_at timestamptz, started_at timestamptz, completed_at timestamptz,
  next_retry_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.agency_events (
  id bigint generated always as identity primary key, mission_id uuid references public.agency_missions(id) on delete cascade,
  task_id uuid references public.agency_tasks(id) on delete cascade, agent_id text, event_type text not null,
  level text not null default 'info' check (level in ('debug','info','warn','error','success')), message text not null,
  payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create table if not exists public.agency_agent_leases (
  id uuid primary key default gen_random_uuid(), task_id uuid not null unique references public.agency_tasks(id) on delete cascade,
  agent_id text not null, lease_token text not null unique,
  status text not null default 'active' check (status in ('active','released','expired')),
  heartbeat_at timestamptz not null default now(), expires_at timestamptz not null,
  created_at timestamptz not null default now(), released_at timestamptz
);

create table if not exists public.agency_approvals (
  id uuid primary key default gen_random_uuid(), mission_id uuid references public.agency_missions(id) on delete cascade,
  task_id uuid references public.agency_tasks(id) on delete cascade, requested_by_agent text not null,
  action_type text not null, risk_level text not null check (risk_level in ('medium','high','critical')),
  description text not null, payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','approved','rejected','expired')),
  decided_by uuid, decided_at timestamptz, decision_note text, created_at timestamptz not null default now()
);

create table if not exists public.agency_artifacts (
  id uuid primary key default gen_random_uuid(), mission_id uuid references public.agency_missions(id) on delete cascade,
  task_id uuid references public.agency_tasks(id) on delete cascade, agent_id text not null,
  artifact_type text not null, name text not null, uri text, content_hash text,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create index if not exists agency_missions_queue_idx on public.agency_missions(status, priority desc, created_at asc);
create index if not exists agency_tasks_queue_idx on public.agency_tasks(status, priority desc, next_retry_at, created_at);
create index if not exists agency_tasks_mission_idx on public.agency_tasks(mission_id, status);
create index if not exists agency_events_mission_idx on public.agency_events(mission_id, created_at desc);
create index if not exists agency_events_task_idx on public.agency_events(task_id, created_at desc);
create index if not exists agency_leases_expiry_idx on public.agency_agent_leases(status, expires_at);
create index if not exists agency_approvals_status_idx on public.agency_approvals(status, created_at desc);
create index if not exists agency_artifacts_task_idx on public.agency_artifacts(task_id, created_at desc);

alter table public.agency_missions enable row level security;
alter table public.agency_tasks enable row level security;
alter table public.agency_events enable row level security;
alter table public.agency_agent_leases enable row level security;
alter table public.agency_approvals enable row level security;
alter table public.agency_artifacts enable row level security;

revoke all on public.agency_missions from anon, authenticated;
revoke all on public.agency_tasks from anon, authenticated;
revoke all on public.agency_events from anon, authenticated;
revoke all on public.agency_agent_leases from anon, authenticated;
revoke all on public.agency_approvals from anon, authenticated;
revoke all on public.agency_artifacts from anon, authenticated;

create or replace function public.agency_claim_task(p_agent_id text, p_lease_seconds integer default 900)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$
declare v_task agency_tasks%rowtype; v_lease agency_agent_leases%rowtype; v_now timestamptz:=now();
begin
  if p_agent_id is null or length(trim(p_agent_id))=0 then raise exception 'agent_id_required'; end if;
  if p_lease_seconds < 60 or p_lease_seconds > 21600 then raise exception 'invalid_lease_seconds'; end if;
  update agency_agent_leases set status='expired' where status='active' and expires_at<v_now;
  update agency_tasks t set status='queued',lease_id=null,updated_at=v_now
    where status in ('claimed','running') and (lease_id is null or not exists(select 1 from agency_agent_leases l where l.id=t.lease_id and l.status='active' and l.expires_at>=v_now));
  select t.* into v_task from agency_tasks t where t.agent_id=p_agent_id and t.status in ('queued','failed')
    and (t.next_retry_at is null or t.next_retry_at<=v_now) and t.attempt_count<t.max_attempts
    and not exists(select 1 from unnest(t.depends_on) d join agency_tasks dep on dep.id=d where dep.status<>'completed')
    order by t.priority desc,t.created_at asc for update skip locked limit 1;
  if not found then return null; end if;
  v_lease.id:=gen_random_uuid(); v_lease.task_id:=v_task.id; v_lease.agent_id:=p_agent_id;
  v_lease.lease_token:=encode(gen_random_bytes(24),'hex'); v_lease.status:='active'; v_lease.heartbeat_at:=v_now;
  v_lease.expires_at:=v_now+make_interval(secs=>p_lease_seconds);
  insert into agency_agent_leases(id,task_id,agent_id,lease_token,status,heartbeat_at,expires_at)
    values(v_lease.id,v_lease.task_id,v_lease.agent_id,v_lease.lease_token,'active',v_now,v_lease.expires_at);
  update agency_tasks set status='claimed',lease_id=v_lease.id,claimed_at=coalesce(claimed_at,v_now),started_at=coalesce(started_at,v_now),attempt_count=attempt_count+1,updated_at=v_now where id=v_task.id;
  insert into agency_events(mission_id,task_id,agent_id,event_type,level,message,payload)
    values(v_task.mission_id,v_task.id,p_agent_id,'task.claimed','info','Agent claimed durable task',jsonb_build_object('lease_id',v_lease.id,'expires_at',v_lease.expires_at));
  update agency_missions set status='running',current_agent_id=p_agent_id,last_heartbeat_at=v_now,started_at=coalesce(started_at,v_now),updated_at=v_now
    where id=v_task.mission_id and status in ('queued','planning','blocked');
  return jsonb_build_object('task',to_jsonb(v_task),'lease',jsonb_build_object('id',v_lease.id,'token',v_lease.lease_token,'expires_at',v_lease.expires_at));
end; $$;

create or replace function public.agency_heartbeat(p_lease_token text, p_extend_seconds integer default 900)
returns boolean language plpgsql security definer set search_path = public, pg_catalog as $$
declare v_lease agency_agent_leases%rowtype; v_now timestamptz:=now();
begin
  update agency_agent_leases set heartbeat_at=v_now,expires_at=v_now+make_interval(secs=>greatest(60,least(p_extend_seconds,21600)))
    where lease_token=p_lease_token and status='active' and expires_at>=v_now returning * into v_lease;
  if not found then return false; end if;
  update agency_tasks set status='running',updated_at=v_now where id=v_lease.task_id;
  update agency_missions m set last_heartbeat_at=v_now,updated_at=v_now where exists(select 1 from agency_tasks t where t.id=v_lease.task_id and t.mission_id=m.id);
  return true;
end; $$;

create or replace function public.agency_finish_task(p_lease_token text, p_status text, p_summary text, p_result jsonb default '{}'::jsonb)
returns boolean language plpgsql security definer set search_path = public, pg_catalog as $$
declare v_lease agency_agent_leases%rowtype; v_task agency_tasks%rowtype; v_now timestamptz:=now(); v_durable boolean;
begin
  if p_status not in ('completed','failed','blocked','waiting_approval') then raise exception 'invalid_task_status'; end if;
  select * into v_lease from agency_agent_leases where lease_token=p_lease_token and status='active' for update;
  if not found then return false; end if;
  select * into v_task from agency_tasks where id=v_lease.task_id for update;
  if not found then return false; end if;
  select coalesce((metadata->>'mode')='durable-autonomous-agency',false) into v_durable from agency_missions where id=v_task.mission_id;
  update agency_tasks set status=p_status,output_summary=p_summary,result=coalesce(p_result,'{}'::jsonb),
    error=case when p_status='failed' then coalesce(p_result,'{}'::jsonb) else null end,completed_at=v_now,
    next_retry_at=case when p_status='failed' and attempt_count<max_attempts then v_now+make_interval(secs=>least(3600,30*(2^least(attempt_count,6)))) else null end,updated_at=v_now where id=v_task.id;
  update agency_agent_leases set status='released',released_at=v_now,heartbeat_at=v_now where id=v_lease.id;
  insert into agency_events(mission_id,task_id,agent_id,event_type,level,message,payload)
    values(v_task.mission_id,v_task.id,v_lease.agent_id,'task.'||p_status,case when p_status='completed' then 'success' when p_status='failed' then 'error' else 'warn' end,coalesce(p_summary,'Task finished'),coalesce(p_result,'{}'::jsonb));
  if p_status='completed' and v_durable then
    update agency_missions set status='running',current_agent_id=v_lease.agent_id,last_heartbeat_at=v_now,updated_at=v_now where id=v_task.mission_id;
  elsif p_status='completed' then
    if not exists(select 1 from agency_tasks where mission_id=v_task.mission_id and status not in ('completed','cancelled')) then
      update agency_missions set status='completed',completed_at=v_now,last_heartbeat_at=v_now,updated_at=v_now where id=v_task.mission_id;
    end if;
  elsif p_status in ('failed','blocked','waiting_approval') then
    update agency_missions set status=case when p_status='waiting_approval' then 'blocked' else p_status end,last_heartbeat_at=v_now,updated_at=v_now where id=v_task.mission_id;
  end if;
  return true;
end; $$;

revoke all on function public.agency_claim_task(text, integer) from public, anon, authenticated;
revoke all on function public.agency_heartbeat(text, integer) from public, anon, authenticated;
revoke all on function public.agency_finish_task(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.agency_claim_task(text, integer) to service_role;
grant execute on function public.agency_heartbeat(text, integer) to service_role;
grant execute on function public.agency_finish_task(text, text, text, jsonb) to service_role;

do $$
declare m uuid;
begin
  select id into m from public.agency_missions where title='Nüva One — Mercado: misión autónoma permanente' and status not in ('completed','cancelled') limit 1;
  if m is null then
    insert into public.agency_missions(title,objective,priority,success_criteria,metadata)
    values('Nüva One — Mercado: misión autónoma permanente','Convertir Nüva One en un producto realmente listo para mercado mediante trabajo autónomo verificable, continuo, seguro y recuperable.',100,
      '[{"id":"C1","name":"Code Integrity","target":"PASS"},{"id":"C2","name":"Integration","target":"PASS"},{"id":"C3","name":"Business Integrity","target":"PASS"},{"id":"C4","name":"Experience","target":"PASS"},{"id":"C5","name":"Production","target":"PASS"}]'::jsonb,
      '{"mode":"durable-autonomous-agency","scope":"market-readiness"}'::jsonb) returning id into m;
    insert into public.agency_tasks(mission_id,title,objective,agent_id,priority) values
      (m,'Orquestar misión','Priorizar evidencia, coordinar especialistas y mantener el objetivo hasta cierre verificable.','orchestrator',100),
      (m,'Construcción','Implementar reparaciones y mejoras verificadas de alto valor.','constructor',95),
      (m,'Finanzas','Validar y reparar finanzas, caja y contabilidad sin romper determinismo.','finance',90),
      (m,'Ventas','Validar ventas, CRM, cotizaciones y conversión.','sales',85),
      (m,'Supply','Validar compras, inventario, stock y fulfillment.','supply',85),
      (m,'People','Validar Nüva People, nómina, contratos y RRHH.','people',80),
      (m,'Compliance','Validar cumplimiento chileno, riesgos y evidencia.','compliance',80),
      (m,'Growth','Validar onboarding, activación, SEO y crecimiento.','growth',75),
      (m,'Security','Validar auth, RLS, tenant isolation y AppSec.','security',100),
      (m,'QA','Ejecutar regresión determinista y cerrar defectos verificables.','qa',95),
      (m,'Sentinel','Observar runtime, reliability, incidentes y health.','sentinel',90),
      (m,'UX','Validar accesibilidad, responsive, estados y experiencia.','ux',75),
      (m,'Release','Mantener gates, CI/CD y certificación de release.','release',95);
    insert into public.agency_events(mission_id,agent_id,event_type,level,message,payload)
      values(m,'orchestrator','mission.bootstrap','success','Persistent autonomous mission initialized',jsonb_build_object('agents',13,'scope','market-readiness'));
  end if;
end $$;
