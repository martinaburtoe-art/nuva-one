-- Nüva People security hardening + legal parameter registry.
-- This migration intentionally follows the existing private.is_business_member(business_id, user_id)
-- and private.has_business_role(business_id, user_id, roles) contracts.

create table if not exists public.people_payroll_parameters (
  id uuid primary key default gen_random_uuid(),
  parameter_key text not null,
  value_numeric numeric(18,6),
  value_text text,
  unit text,
  effective_from date not null,
  effective_to date,
  source_reference text not null,
  source_published_at date,
  notes text,
  created_at timestamptz not null default now(),
  unique (parameter_key, effective_from),
  check (value_numeric is not null or value_text is not null),
  check (effective_to is null or effective_to >= effective_from)
);

create index if not exists idx_people_payroll_parameters_lookup
  on public.people_payroll_parameters(parameter_key, effective_from desc);

create table if not exists public.people_karin_cases (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  employee_id uuid references public.people_employees(id) on delete set null,
  case_number text not null,
  case_type text not null check (case_type in ('harassment_sexual','harassment_workplace','violence_workplace','other')),
  status text not null default 'open' check (status in ('open','protective_measures','investigation','resolved','closed')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  restricted_notes text,
  evidence_manifest jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, case_number)
);

create index if not exists idx_people_karin_business_status
  on public.people_karin_cases(business_id, status);

alter table public.people_payroll_parameters enable row level security;
alter table public.people_karin_cases enable row level security;

-- Replace the permissive foundation policies with role-aware policies.
drop policy if exists people_payroll_parameters_select_admin on public.people_payroll_parameters;
drop policy if exists people_payroll_parameters_write_admin on public.people_payroll_parameters;
create policy people_payroll_parameters_select_authenticated
  on public.people_payroll_parameters for select
  using (auth.uid() is not null);
create policy people_payroll_parameters_write_authenticated
  on public.people_payroll_parameters for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- Payroll must never be visible to generic staff/viewers.
drop policy if exists people_payroll_periods_select_admin on public.people_payroll_periods;
drop policy if exists people_payroll_periods_write_admin on public.people_payroll_periods;
create policy people_payroll_periods_select_admin
  on public.people_payroll_periods for select
  using (private.has_business_role(business_id, auth.uid(), ARRAY['owner','admin']::member_role[]));
create policy people_payroll_periods_write_admin
  on public.people_payroll_periods for all
  using (private.has_business_role(business_id, auth.uid(), ARRAY['owner','admin']::member_role[]))
  with check (private.has_business_role(business_id, auth.uid(), ARRAY['owner','admin']::member_role[]));

drop policy if exists people_payroll_items_select_admin on public.people_payroll_items;
drop policy if exists people_payroll_items_write_admin on public.people_payroll_items;
create policy people_payroll_items_select_admin
  on public.people_payroll_items for select
  using (private.has_business_role(business_id, auth.uid(), ARRAY['owner','admin']::member_role[]));
create policy people_payroll_items_write_admin
  on public.people_payroll_items for all
  using (private.has_business_role(business_id, auth.uid(), ARRAY['owner','admin']::member_role[]))
  with check (private.has_business_role(business_id, auth.uid(), ARRAY['owner','admin']::member_role[]));

-- Restricted Ley Karin data: never expose through generic employee access.
create policy people_karin_cases_select_admin
  on public.people_karin_cases for select
  using (private.has_business_role(business_id, auth.uid(), ARRAY['owner','admin']::member_role[]));
create policy people_karin_cases_write_admin
  on public.people_karin_cases for all
  using (private.has_business_role(business_id, auth.uid(), ARRAY['owner','admin']::member_role[]))
  with check (private.has_business_role(business_id, auth.uid(), ARRAY['owner','admin']::member_role[]));

comment on table public.people_payroll_parameters is 'Versioned Chile payroll/legal parameters. Every production calculation must snapshot the applicable values and source.';
comment on table public.people_karin_cases is 'Restricted Ley Karin case workflow. Access limited to owner/admin.';
