-- Nüva People sensitive-access reconciliation (pgTAP)
BEGIN;
SELECT plan(30);

-- All nineteen sensitive tables must have one owner/admin SELECT policy.
SELECT is((
  SELECT count(*)::int FROM (
    SELECT expected.tablename
    FROM (VALUES
      ('people_employees'),('people_contracts'),('people_documents'),
      ('people_payroll_items'),('people_payroll_periods'),
      ('people_payroll_postings'),('people_payroll_runs'),
      ('people_payroll_inputs'),('people_lre_exports'),('people_lre_rows'),
      ('people_leave_requests'),('people_absences'),('people_terminations'),('people_vacation_balances'),
      ('people_gratification_settings'),('people_gratification_settlements'),('people_payroll_liquidations'),
      ('people_attendance_events'),('people_compliance_items')
    ) AS expected(tablename)
    WHERE (
      SELECT count(*)::int FROM pg_policies p
      WHERE p.schemaname='public' AND p.tablename=expected.tablename
        AND p.cmd='SELECT' AND p.permissive='PERMISSIVE'
        AND p.roles @> ARRAY['authenticated'::name]
        AND p.qual LIKE '%private.has_business_role%'
        AND p.qual LIKE '%owner%' AND p.qual LIKE '%admin%'
    ) = 1
  ) verified
), 19, 'each sensitive table has exactly one owner/admin SELECT policy');

SELECT is((
  SELECT count(*)::int FROM pg_policies
  WHERE schemaname='public'
    AND tablename IN ('people_employees','people_contracts','people_documents',
      'people_attendance_events','people_compliance_items','people_payroll_items','people_payroll_periods','people_payroll_postings','people_payroll_runs',
      'people_payroll_inputs','people_lre_exports','people_lre_rows','people_leave_requests',
      'people_terminations','people_absences','people_vacation_balances','people_gratification_settings',
      'people_gratification_settlements','people_payroll_liquidations')
    AND cmd='SELECT' AND permissive='PERMISSIVE'
    AND policyname IN ('people_member_select','people_payroll_inputs_select','people_terminations_select','people_vacation_select','people_gratification_settings_select','people_gratification_settlements_select')
), 0, 'no broad member SELECT policy remains on sensitive tables');

-- Staff/viewer must not write employee PII, contracts or documents.
SELECT is((
  SELECT count(*)::int FROM pg_policies
  WHERE schemaname='public'
    AND tablename IN ('people_employees','people_contracts','people_documents')
    AND policyname IN ('people_member_insert','people_member_update')
), 0, 'broad member INSERT/UPDATE policies are removed from PII tables');

SELECT is((
  SELECT count(*)::int FROM pg_policies
  WHERE schemaname='public'
    AND tablename IN ('people_employees','people_contracts','people_documents')
    AND cmd='INSERT' AND roles @> ARRAY['authenticated'::name]
    AND qual IS NULL
    AND with_check LIKE '%private.has_business_role%'
    AND with_check LIKE '%owner%' AND with_check LIKE '%admin%'
), 3, 'employee, contract and document INSERT is owner/admin only');

SELECT is((
  SELECT count(*)::int FROM pg_policies
  WHERE schemaname='public'
    AND tablename IN ('people_employees','people_contracts','people_documents')
    AND cmd='UPDATE' AND roles @> ARRAY['authenticated'::name]
    AND qual LIKE '%private.has_business_role%'
    AND qual LIKE '%owner%' AND qual LIKE '%admin%'
    AND with_check LIKE '%private.has_business_role%'
    AND with_check LIKE '%owner%' AND with_check LIKE '%admin%'
), 3, 'employee, contract and document UPDATE is owner/admin only');

SELECT is((
  SELECT count(*)::int FROM pg_policies
  WHERE schemaname='public'
    AND tablename IN ('people_employees','people_contracts','people_documents')
    AND cmd IN ('INSERT','UPDATE')
    AND (coalesce(qual,'') LIKE '%private.is_business_member%'
      OR coalesce(with_check,'') LIKE '%private.is_business_member%')
), 0, 'PII write policies do not authorize all business members');

-- Staff can submit operational records but cannot edit or self-approve them.
SELECT is((
  SELECT count(*)::int FROM pg_policies
  WHERE schemaname='public'
    AND tablename IN ('people_attendance_events','people_compliance_items','people_leave_requests')
    AND cmd='UPDATE' AND permissive='PERMISSIVE'
    AND roles @> ARRAY['authenticated'::name]
    AND qual LIKE '%private.has_business_role%' AND qual LIKE '%owner%' AND qual LIKE '%admin%'
    AND with_check LIKE '%private.has_business_role%' AND with_check LIKE '%owner%' AND with_check LIKE '%admin%'
), 3, 'attendance, compliance and leave UPDATE is owner/admin-only');
SELECT is((
  SELECT count(*)::int FROM pg_policies
  WHERE schemaname='public'
    AND tablename IN ('people_attendance_events','people_compliance_items','people_leave_requests')
    AND cmd='INSERT' AND permissive='PERMISSIVE'
    AND roles @> ARRAY['authenticated'::name]
    AND qual IS NULL
    AND with_check LIKE '%private.has_business_role%'
    AND with_check LIKE '%staff%'
), 3, 'staff retain INSERT access to attendance, compliance and leave requests');
-- Preserve the intended read-only operational RPCs for non-admin members.
SELECT ok(to_regprocedure('public.people_employees_limited(uuid)') IS NOT NULL, 'limited employee RPC remains available');
SELECT ok(
  NOT has_function_privilege('anon','public.people_employees_limited(uuid)','EXECUTE')
  AND has_function_privilege('authenticated','public.people_employees_limited(uuid)','EXECUTE'),
  'sanitized employee RPC is executable only by authenticated members'
);
SELECT ok(
  NOT has_function_privilege('anon','public.people_leave_requests_limited(uuid)','EXECUTE')
  AND has_function_privilege('authenticated','public.people_leave_requests_limited(uuid)','EXECUTE'),
  'sanitized leave RPC is executable only by authenticated members'
);
SELECT ok(to_regprocedure('public.people_contracts_limited(uuid)') IS NOT NULL, 'limited contract RPC remains available');
SELECT ok(to_regprocedure('public.people_compliance_items_limited(uuid)') IS NOT NULL, 'limited compliance RPC remains available');
SELECT ok(to_regprocedure('public.people_attendance_limited(uuid)') IS NOT NULL, 'limited attendance RPC remains available');
SELECT ok(to_regprocedure('public.people_leave_requests_limited(uuid)') IS NOT NULL, 'limited leave RPC remains available');
SELECT ok(NOT has_function_privilege('authenticated','public.people_terminations_limited(uuid)','EXECUTE'), 'limited termination RPC is not callable by non-admin members');
SELECT ok(pg_get_functiondef('public.people_employees_limited(uuid)'::regprocedure) NOT LIKE '%email%', 'limited employee RPC omits personal email');
SELECT ok(
  position('national_id' in pg_get_functiondef('public.people_employees_limited(uuid)'::regprocedure)) = 0
  AND position('phone' in pg_get_functiondef('public.people_employees_limited(uuid)'::regprocedure)) = 0
  AND position('bank_account' in pg_get_functiondef('public.people_employees_limited(uuid)'::regprocedure)) = 0
  AND position('health_system' in pg_get_functiondef('public.people_employees_limited(uuid)'::regprocedure)) = 0,
  'limited employee RPC omits RUT, phone, bank and health details');
SELECT ok(
  position('salary_amount' in pg_get_functiondef('public.people_contracts_limited(uuid)'::regprocedure)) = 0
  AND position('weekly_hours' in pg_get_functiondef('public.people_contracts_limited(uuid)'::regprocedure)) = 0,
  'limited contract RPC omits salary and work-hour terms');
SELECT ok(
  position('metadata' in pg_get_functiondef('public.people_attendance_limited(uuid)'::regprocedure)) = 0
  AND position('metadata' in pg_get_functiondef('public.people_compliance_items_limited(uuid)'::regprocedure)) = 0
  AND position('evidence_document_id' in pg_get_functiondef('public.people_compliance_items_limited(uuid)'::regprocedure)) = 0,
  'limited attendance and compliance RPCs omit metadata and document references');
SELECT ok(pg_get_functiondef('public.people_leave_requests_limited(uuid)'::regprocedure) NOT LIKE '%reason%', 'limited leave RPC omits free-text reason/health detail');
SELECT ok(NOT has_function_privilege('authenticated','public.people_vacation_balances_limited(uuid)','EXECUTE'), 'vacation balance RPC is unavailable to non-admin members');
SELECT ok(
  position('owner' in pg_get_functiondef('public.calculate_people_vacation_balance(uuid,date)'::regprocedure)) > 0
  AND position('admin' in pg_get_functiondef('public.calculate_people_vacation_balance(uuid,date)'::regprocedure)) > 0,
  'vacation balance calculation enforces owner/admin role');
SELECT ok(position('leave_type <> ''medical''' in pg_get_functiondef('public.people_leave_requests_limited(uuid)'::regprocedure)) > 0, 'limited leave RPC excludes medical leave details');

SELECT is((
  SELECT count(*)::int FROM pg_policies
  WHERE schemaname='public'
    AND tablename IN ('people_attendance_events','people_compliance_items','people_leave_requests')
    AND policyname='people_member_update'
), 0, 'staff cannot update attendance, compliance or leave records directly');

SELECT is((
  SELECT count(*)::int FROM pg_policies
  WHERE schemaname='public'
    AND tablename IN ('people_attendance_events','people_compliance_items','people_leave_requests')
    AND cmd='UPDATE' AND qual LIKE '%private.has_business_role%'
    AND qual LIKE '%owner%' AND qual LIKE '%admin%'
    AND with_check LIKE '%private.has_business_role%'
    AND with_check LIKE '%owner%' AND with_check LIKE '%admin%'
), 3, 'attendance, compliance and leave updates are owner/admin only');

SELECT is((
  SELECT count(*)::int FROM pg_policies
  WHERE schemaname='public'
    AND tablename IN (
      'people_employees','people_contracts','people_documents',
      'people_attendance_events','people_compliance_items','people_absences',
      'people_payroll_items','people_payroll_periods','people_payroll_postings','people_payroll_runs',
      'people_payroll_inputs','people_lre_exports','people_lre_rows','people_leave_requests',
      'people_terminations','people_vacation_balances','people_gratification_settings',
      'people_gratification_settlements','people_payroll_liquidations'
    )
    AND cmd='SELECT' AND permissive='PERMISSIVE'
), 19, 'each sensitive People table has exactly one permissive SELECT policy total');
SELECT is((
  SELECT count(*)::int FROM pg_policies
  WHERE schemaname='public'
    AND policyname IN (
      'people_contracts_select_owner_admin','people_employees_select_owner_admin',
      'people_documents_select_owner_admin','people_lre_rows_select_owner_admin',
      'people_payroll_items_select_owner_admin','people_payroll_periods_select_owner_admin',
      'people_payroll_liquidations_select_owner_admin','people_absences_select_owner_admin'
    )
    AND qual LIKE '%SELECT auth.uid()%'
), 10, 'owner/admin People RLS policies evaluate auth.uid once per statement');
-- Owner/admin delete policies are preserved.
SELECT is((
  SELECT count(*)::int FROM pg_policies
  WHERE schemaname='public'
    AND tablename IN ('people_employees','people_contracts','people_documents')
    AND cmd='DELETE' AND qual LIKE '%private.has_business_role%'
    AND qual LIKE '%owner%' AND qual LIKE '%admin%'
), 3, 'owner/admin DELETE policies remain intact');

-- RLS must remain enabled on every affected table.
SELECT is((
  SELECT count(*)::int FROM pg_class c
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind='r'
    AND c.relname IN ('people_employees','people_contracts','people_documents',
      'people_payroll_items','people_payroll_periods','people_payroll_postings','people_payroll_runs',
      'people_payroll_inputs','people_lre_exports','people_lre_rows','people_leave_requests',
      'people_terminations','people_absences','people_vacation_balances','people_gratification_settings',
      'people_gratification_settlements','people_payroll_liquidations',
      'people_attendance_events','people_compliance_items')
    AND c.relrowsecurity
), 19, 'RLS remains enabled on all nineteen sensitive tables');

SELECT * FROM finish();
ROLLBACK;
