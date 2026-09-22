BEGIN;
SELECT plan(16);

SELECT has_table('public','people_employees','people employees exists');
SELECT has_table('public','people_contracts','people contracts exists');
SELECT has_table('public','people_attendance_events','attendance exists');
SELECT has_table('public','people_leave_requests','leave requests exists');
SELECT has_table('public','people_payroll_periods','payroll periods exists');
SELECT has_table('public','people_payroll_items','payroll items exists');
SELECT has_table('public','people_documents','documents exists');
SELECT has_table('public','people_compliance_items','compliance exists');
SELECT has_table('public','people_legal_parameters','legal parameters exists');
SELECT has_table('public','people_lre_exports','LRE exports exists');
SELECT has_table('public','people_karin_cases','Ley Karin cases exists');
SELECT has_table('public','people_vacation_balances','vacation balances exists');
SELECT ok((SELECT value_numeric = 553553 FROM public.people_legal_parameters WHERE country_code='CL' AND parameter_key='minimum_monthly_wage_18_65' AND effective_from='2026-05-01'),'2026 minimum wage is versioned');
SELECT ok((SELECT value_numeric = 42 FROM public.people_legal_parameters WHERE country_code='CL' AND parameter_key='ordinary_weekly_hours' AND effective_from='2026-04-26'),'42 hour rule is versioned');
SELECT ok((SELECT value_numeric = 40 FROM public.people_legal_parameters WHERE country_code='CL' AND parameter_key='ordinary_weekly_hours' AND effective_from='2028-04-26'),'40 hour target is versioned');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid='public.people_karin_cases'::regclass),'Ley Karin table has RLS');

SELECT * FROM finish();
ROLLBACK;
