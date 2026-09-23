-- Remove duplicate indexes identified by Supabase performance advisor.
drop index if exists public.nuva_action_outcomes_business_time_idx;
drop index if exists public.nuva_autopilot_policies_business_id_idx;
drop index if exists public.nuva_intelligence_events_business_time_idx;
drop index if exists public.nuva_simulation_scenarios_business_id_idx;
drop index if exists public.ux_people_payroll_period_business_month;