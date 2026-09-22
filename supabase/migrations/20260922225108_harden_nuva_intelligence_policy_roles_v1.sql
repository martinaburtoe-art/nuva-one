drop policy if exists "nuva outcomes manager write" on public.nuva_action_outcomes;
drop policy if exists "nuva autopilot manager write" on public.nuva_autopilot_policies;
drop policy if exists "nuva memory manager write" on public.nuva_business_memory;
drop policy if exists "nuva intelligence manager write" on public.nuva_intelligence_events;
drop policy if exists "nuva simulations manager write" on public.nuva_simulation_scenarios;

alter policy "nuva outcomes manager delete" on public.nuva_action_outcomes to authenticated;
alter policy "nuva outcomes manager insert" on public.nuva_action_outcomes to authenticated;
alter policy "nuva outcomes manager update" on public.nuva_action_outcomes to authenticated;
alter policy "nuva outcomes member select" on public.nuva_action_outcomes to authenticated;

alter policy "nuva autopilot manager delete" on public.nuva_autopilot_policies to authenticated;
alter policy "nuva autopilot manager insert" on public.nuva_autopilot_policies to authenticated;
alter policy "nuva autopilot manager update" on public.nuva_autopilot_policies to authenticated;
alter policy "nuva autopilot member select" on public.nuva_autopilot_policies to authenticated;

alter policy "nuva memory manager delete" on public.nuva_business_memory to authenticated;
alter policy "nuva memory manager insert" on public.nuva_business_memory to authenticated;
alter policy "nuva memory manager update" on public.nuva_business_memory to authenticated;
alter policy "nuva memory member select" on public.nuva_business_memory to authenticated;

alter policy "nuva intelligence manager delete" on public.nuva_intelligence_events to authenticated;
alter policy "nuva intelligence manager insert" on public.nuva_intelligence_events to authenticated;
alter policy "nuva intelligence manager update" on public.nuva_intelligence_events to authenticated;
alter policy "nuva intelligence member select" on public.nuva_intelligence_events to authenticated;

alter policy "nuva simulations manager delete" on public.nuva_simulation_scenarios to authenticated;
alter policy "nuva simulations manager insert" on public.nuva_simulation_scenarios to authenticated;
alter policy "nuva simulations manager update" on public.nuva_simulation_scenarios to authenticated;
alter policy "nuva simulations member select" on public.nuva_simulation_scenarios to authenticated;

alter policy "nuva opportunities manager delete" on public.nuva_opportunities to authenticated;
alter policy "nuva opportunities manager insert" on public.nuva_opportunities to authenticated;
alter policy "nuva opportunities manager update" on public.nuva_opportunities to authenticated;
alter policy "nuva opportunities member select" on public.nuva_opportunities to authenticated;

alter policy "nuva risks manager delete" on public.nuva_risks to authenticated;
alter policy "nuva risks manager insert" on public.nuva_risks to authenticated;
alter policy "nuva risks manager update" on public.nuva_risks to authenticated;
alter policy "nuva risks member select" on public.nuva_risks to authenticated;

alter policy "nuva benchmarks manager delete" on public.nuva_benchmarks to authenticated;
alter policy "nuva benchmarks manager insert" on public.nuva_benchmarks to authenticated;
alter policy "nuva benchmarks manager update" on public.nuva_benchmarks to authenticated;
alter policy "nuva benchmarks member select" on public.nuva_benchmarks to authenticated;

-- Performance hardening for remaining HR foreign keys and auth initplans.
create index if not exists people_absences_business_id_idx on public.people_absences(business_id);
create index if not exists people_lre_rows_business_id_idx on public.people_lre_rows(business_id);
create index if not exists people_lre_rows_employee_id_idx on public.people_lre_rows(employee_id);
create index if not exists people_payroll_liquidations_business_id_idx on public.people_payroll_liquidations(business_id);
create index if not exists people_payroll_liquidations_employee_id_idx on public.people_payroll_liquidations(employee_id);
create index if not exists people_payroll_liquidations_payroll_item_id_idx on public.people_payroll_liquidations(payroll_item_id);
create index if not exists people_terminations_business_id_idx on public.people_terminations(business_id);