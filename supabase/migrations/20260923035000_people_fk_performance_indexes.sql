-- Nüva People — covering indexes for tenant-aware foreign keys.
-- Evita scans innecesarios en validaciones FK y operaciones por tenant.

create index if not exists idx_people_absences_employee_business_fk on public.people_absences (business_id, employee_id);
create index if not exists idx_people_contracts_employee_business_fk on public.people_contracts (business_id, employee_id);
create index if not exists idx_people_leave_requests_employee_business_fk on public.people_leave_requests (business_id, employee_id);
create index if not exists idx_people_lre_rows_employee_business_fk on public.people_lre_rows (business_id, employee_id);
create index if not exists idx_people_lre_rows_period_business_fk on public.people_lre_rows (business_id, payroll_period_id);
create index if not exists idx_people_payroll_inputs_employee_business_fk on public.people_payroll_inputs (business_id, employee_id);
create index if not exists idx_people_payroll_inputs_period_business_fk on public.people_payroll_inputs (business_id, payroll_period_id);
create index if not exists idx_people_payroll_items_employee_business_fk on public.people_payroll_items (business_id, employee_id);
create index if not exists idx_people_payroll_items_period_business_fk on public.people_payroll_items (business_id, payroll_period_id);
create index if not exists idx_people_payroll_liquidations_employee_business_fk on public.people_payroll_liquidations (business_id, employee_id);
create index if not exists idx_people_payroll_liquidations_period_business_fk on public.people_payroll_liquidations (business_id, payroll_period_id);
create index if not exists idx_people_payroll_runs_period_business_fk on public.people_payroll_runs (business_id, payroll_period_id);
create index if not exists idx_people_payroll_postings_period_business_fk on public.people_payroll_postings (business_id, payroll_period_id);