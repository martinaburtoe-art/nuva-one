-- Nüva People foundation
-- Scope: Chilean SME HR domain. This migration intentionally separates the
-- employee master data from payroll calculations so the payroll engine can
-- evolve independently as legal parameters change.

create table if not exists public.people_org_units (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  parent_id uuid references public.people_org_units(id) on delete set null,
  name text not null,
  code text,
  cost_center text,
  manager_employee_id uuid,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, name)
);

create table if not exists public.people_employees (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  org_unit_id uuid references public.people_org_units(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  employee_code text not null,
  first_name text not null,
  last_name text not null,
  second_last_name text,
  national_id text,
  personal_email text,
  work_email text,
  phone text,
  birth_date date,
  address text,
  job_title text not null,
  employment_status text not null default 'active' check (employment_status in ('active','leave','terminated','pending')),
  hire_date date not null,
  termination_date date,
  work_location text,
  cost_center text,
  bank_name text,
  bank_account_type text,
  bank_account_last4 text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, employee_code)
);

alter table public.people_org_units
  add constraint people_org_units_manager_fk
  foreign key (manager_employee_id) references public.people_employees(id) on delete set null;

create table if not exists public.people_contracts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  employee_id uuid not null references public.people_employees(id) on delete cascade,
  contract_type text not null check (contract_type in ('indefinite','fixed_term','project','part_time','other')),
  start_date date not null,
  end_date date,
  position text not null,
  ordinary_hours numeric(5,2),
  salary_base numeric(14,2),
  salary_frequency text not null default 'monthly',
  work_schedule jsonb not null default '{}'::jsonb,
  document_path text,
  status text not null default 'active' check (status in ('draft','active','expired','terminated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.people_attendance_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  employee_id uuid not null references public.people_employees(id) on delete cascade,
  event_at timestamptz not null,
  event_type text not null check (event_type in ('clock_in','clock_out','break_start','break_end','manual_adjustment')),
  source text not null default 'manual',
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.people_leave_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  employee_id uuid not null references public.people_employees(id) on delete cascade,
  leave_type text not null check (leave_type in ('vacation','permission','absence','other')),
  start_date date not null,
  end_date date not null,
  working_days numeric(6,2),
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  reason text,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists public.people_payroll_periods (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  period_year integer not null check (period_year between 2020 and 2200),
  period_month integer not null check (period_month between 1 and 12),
  status text not null default 'draft' check (status in ('draft','calculating','calculated','approved','closed')),
  calculated_at timestamptz,
  approved_at timestamptz,
  closed_at timestamptz,
  parameters_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, period_year, period_month)
);

create table if not exists public.people_payroll_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  payroll_period_id uuid not null references public.people_payroll_periods(id) on delete cascade,
  employee_id uuid not null references public.people_employees(id) on delete cascade,
  gross_amount numeric(14,2) not null default 0,
  taxable_amount numeric(14,2) not null default 0,
  deductions_amount numeric(14,2) not null default 0,
  employer_cost_amount numeric(14,2) not null default 0,
  net_amount numeric(14,2) not null default 0,
  components jsonb not null default '{}'::jsonb,
  calculation_warnings jsonb not null default '[]'::jsonb,
  calculation_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (payroll_period_id, employee_id)
);

create table if not exists public.people_documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  employee_id uuid references public.people_employees(id) on delete cascade,
  document_type text not null,
  title text not null,
  storage_path text not null,
  issued_at date,
  expires_at date,
  signed_at timestamptz,
  status text not null default 'active' check (status in ('draft','active','expired','archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.people_compliance_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  employee_id uuid references public.people_employees(id) on delete cascade,
  compliance_type text not null,
  title text not null,
  due_date date,
  status text not null default 'pending' check (status in ('pending','in_progress','compliant','overdue','not_applicable')),
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.people_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  employee_id uuid not null references public.people_employees(id) on delete cascade,
  request_type text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  payload jsonb not null default '{}'::jsonb,
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_people_employees_business_status on public.people_employees(business_id, employment_status);
create index if not exists idx_people_employees_business_org on public.people_employees(business_id, org_unit_id);
create index if not exists idx_people_contracts_business_employee on public.people_contracts(business_id, employee_id);
create index if not exists idx_people_attendance_business_employee_time on public.people_attendance_events(business_id, employee_id, event_at desc);
create index if not exists idx_people_leave_business_status on public.people_leave_requests(business_id, status, start_date);
create index if not exists idx_people_payroll_business_period on public.people_payroll_periods(business_id, period_year desc, period_month desc);
create index if not exists idx_people_payroll_items_business_employee on public.people_payroll_items(business_id, employee_id);
create index if not exists idx_people_documents_business_expiry on public.people_documents(business_id, expires_at);
create index if not exists idx_people_compliance_business_due on public.people_compliance_items(business_id, status, due_date);

-- Tenant isolation. Role-specific write restrictions remain in the application
-- layer until the existing business role helper contract is reused explicitly.
-- This avoids introducing a second authorization model into the security-critical
-- payroll domain during the foundation migration.

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'people_org_units',
    'people_employees',
    'people_contracts',
    'people_attendance_events',
    'people_leave_requests',
    'people_payroll_periods',
    'people_payroll_items',
    'people_documents',
    'people_compliance_items',
    'people_requests'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists %I_select_member on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_insert_member on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_update_member on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_delete_member on public.%I', table_name, table_name);
    execute format('create policy %I_select_member on public.%I for select using (private.is_business_member(business_id))', table_name, table_name);
    execute format('create policy %I_insert_member on public.%I for insert with check (private.is_business_member(business_id))', table_name, table_name);
    execute format('create policy %I_update_member on public.%I for update using (private.is_business_member(business_id)) with check (private.is_business_member(business_id))', table_name, table_name);
    execute format('create policy %I_delete_member on public.%I for delete using (private.is_business_member(business_id))', table_name, table_name);
  end loop;
end $$;

comment on table public.people_employees is 'Nüva People employee master data; contains personal and employment information and must be treated as confidential.';
comment on table public.people_payroll_items is 'Payroll results. The components JSON stores the auditable calculation breakdown and parameters used by the payroll engine.';
comment on table public.people_compliance_items is 'Trackable labour/compliance obligations and deadlines; legal interpretation remains outside the database.';
