-- Durable execution state for Nüva Studio.
-- Keeps the execution graph resumable across process restarts without exposing
-- service-role operations to the client.

create table if not exists public.nuva_studio_jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'queued' check (status in ('queued','running','waiting','completed','partial','blocked','failed','cancelled')),
  goal text not null,
  plan jsonb not null default '[]'::jsonb,
  checkpoint jsonb not null default '{}'::jsonb,
  result jsonb,
  idempotency_key text not null,
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  last_error text,
  next_run_at timestamptz,
  locked_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nuva_studio_jobs_idempotency_key_nonempty check (length(trim(idempotency_key)) between 1 and 200)
);

create unique index if not exists nuva_studio_jobs_business_idempotency_idx on public.nuva_studio_jobs (business_id, idempotency_key);
create index if not exists nuva_studio_jobs_business_status_idx on public.nuva_studio_jobs (business_id, status, created_at desc);
create index if not exists nuva_studio_jobs_scheduler_idx on public.nuva_studio_jobs (status, next_run_at) where status in ('queued','waiting','running');

create table if not exists public.nuva_studio_job_steps (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.nuva_studio_jobs(id) on delete cascade,
  step integer not null,
  capability text not null,
  instruction text not null,
  depends_on integer[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','running','completed','queued','blocked','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  result jsonb,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (job_id, step)
);
create index if not exists nuva_studio_job_steps_job_status_idx on public.nuva_studio_job_steps (job_id, status, step);

create table if not exists public.nuva_studio_job_callbacks (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.nuva_studio_jobs(id) on delete cascade,
  step integer not null,
  callback_type text not null check (callback_type in ('video','media','generic')),
  token_hash text not null,
  status text not null default 'pending' check (status in ('pending','received','rejected','expired')),
  payload jsonb,
  received_at timestamptz,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  unique (job_id, step, callback_type)
);
create index if not exists nuva_studio_job_callbacks_token_idx on public.nuva_studio_job_callbacks (token_hash, status);

create or replace function public.nuva_studio_jobs_set_updated_at() returns trigger language plpgsql security invoker set search_path = pg_catalog, public as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists nuva_studio_jobs_set_updated_at on public.nuva_studio_jobs;
create trigger nuva_studio_jobs_set_updated_at before update on public.nuva_studio_jobs for each row execute function public.nuva_studio_jobs_set_updated_at();

create or replace function public.nuva_studio_job_steps_set_updated_at() returns trigger language plpgsql security invoker set search_path = pg_catalog, public as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists nuva_studio_job_steps_set_updated_at on public.nuva_studio_job_steps;
create trigger nuva_studio_job_steps_set_updated_at before update on public.nuva_studio_job_steps for each row execute function public.nuva_studio_job_steps_set_updated_at();

alter table public.nuva_studio_jobs enable row level security;
alter table public.nuva_studio_job_steps enable row level security;
alter table public.nuva_studio_job_callbacks enable row level security;

drop policy if exists nuva_studio_jobs_member_select on public.nuva_studio_jobs;
create policy nuva_studio_jobs_member_select on public.nuva_studio_jobs for select to authenticated using (private.is_business_member(business_id, auth.uid()));
drop policy if exists nuva_studio_jobs_member_insert on public.nuva_studio_jobs;
create policy nuva_studio_jobs_member_insert on public.nuva_studio_jobs for insert to authenticated with check (private.is_business_member(business_id, auth.uid()) and user_id = auth.uid());
drop policy if exists nuva_studio_jobs_member_update on public.nuva_studio_jobs;
create policy nuva_studio_jobs_member_update on public.nuva_studio_jobs for update to authenticated using (private.is_business_member(business_id, auth.uid())) with check (private.is_business_member(business_id, auth.uid()));
drop policy if exists nuva_studio_job_steps_member_select on public.nuva_studio_job_steps;
create policy nuva_studio_job_steps_member_select on public.nuva_studio_job_steps for select to authenticated using (exists (select 1 from public.nuva_studio_jobs j where j.id = job_id and private.is_business_member(j.business_id, auth.uid())));
drop policy if exists nuva_studio_job_callbacks_member_select on public.nuva_studio_job_callbacks;
create policy nuva_studio_job_callbacks_member_select on public.nuva_studio_job_callbacks for select to authenticated using (exists (select 1 from public.nuva_studio_jobs j where j.id = job_id and private.is_business_member(j.business_id, auth.uid())));
drop policy if exists nuva_studio_job_callbacks_member_insert on public.nuva_studio_job_callbacks;
create policy nuva_studio_job_callbacks_member_insert on public.nuva_studio_job_callbacks for insert to authenticated with check (exists (select 1 from public.nuva_studio_jobs j where j.id = job_id and private.is_business_member(j.business_id, auth.uid())));

revoke all on table public.nuva_studio_jobs from anon;
revoke all on table public.nuva_studio_job_steps from anon;
revoke all on table public.nuva_studio_job_callbacks from anon;
grant select, insert, update on table public.nuva_studio_jobs to authenticated;
grant select on table public.nuva_studio_job_steps to authenticated;
grant select, insert on table public.nuva_studio_job_callbacks to authenticated;

comment on table public.nuva_studio_jobs is 'Durable, resumable Nüva Studio execution jobs.';
comment on table public.nuva_studio_job_steps is 'Per-step checkpoint state for Nüva Studio jobs.';
comment on table public.nuva_studio_job_callbacks is 'One-time verified callbacks for asynchronous Nüva Studio media work.';
