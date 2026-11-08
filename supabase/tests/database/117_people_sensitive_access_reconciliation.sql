-- Nüva People sensitive-access reconciliation (pgTAP)
BEGIN;
SELECT plan(15);

-- All seven exposed sensitive tables must have one owner/admin SELECT policy.
SELECT is((
  SELECT count(*)::int FROM (
    SELECT expected.tablename
    FROM (VALUES
      ('people_employees'),('people_contracts'),('people_documents'),
      ('people_payroll_items'),('people_payroll_periods'),
      ('people_payroll_postings'),('people_payroll_runs')
    ) AS expected(tablename)
    WHERE (
      SELECT count(*) FROM pg_policies p
      WHERE p.schemaname='public' AND p.tablename=expected.tablename
        AND p.cmd='SELECT' AND p.permissive='PERMISSIVE'
        AND p.roles @> ARRAY['authenticated'::name]
        AND p.qual LIKE '%private.has_business_role%'
        AND p.qual LIKE '%owner%' AND p.qual LIKE '%admin%'
    ) = 1
  ) verified
), 7, 'each sensitive table has exactly one owner/admin SELECT policy');

SELECT is((
  SELECT count(*) FROM pg_policies
  WHERE schemaname='public'
    AND tablename IN ('people_employees','people_contracts','people_documents',
      'people_payroll_items','people_payroll_periods','people_payroll_postings','people_payroll_runs')
    AND cmd='SELECT' AND permissive='PERMISSIVE'
    AND roles @> ARRAY['authenticated'::name]
    AND policyname='people_member_select'
), 0, 'no broad member SELECT policy remains on sensitive tables');

-- Staff/viewer must not write employee PII, contracts or documents.
SELECT is((
  SELECT count(*) FROM pg_policies
  WHERE schemaname='public'
    AND tablename IN ('people_employees','people_contracts','people_documents')
    AND policyname IN ('people_member_insert','people_member_update')
), 0, 'broad member INSERT/UPDATE policies are removed from PII tables');

SELECT is((
  SELECT count(*) FROM pg_policies
  WHERE schemaname='public'
    AND tablename IN ('people_employees','people_contracts','people_documents')
    AND cmd='INSERT' AND roles @> ARRAY['authenticated'::name]
    AND qual IS NULL
    AND with_check LIKE '%private.has_business_role%'
    AND with_check LIKE '%owner%' AND with_check LIKE '%admin%'
), 3, 'employee, contract and document INSERT is owner/admin only');

SELECT is((
  SELECT count(*) FROM pg_policies
  WHERE schemaname='public'
    AND tablename IN ('people_employees','people_contracts','people_documents')
    AND cmd='UPDATE' AND roles @> ARRAY['authenticated'::name]
    AND qual LIKE '%private.has_business_role%'
    AND qual LIKE '%owner%' AND qual LIKE '%admin%'
    AND with_check LIKE '%private.has_business_role%'
    AND with_check LIKE '%owner%' AND with_check LIKE '%admin%'
), 3, 'employee, contract and document UPDATE is owner/admin only');

SELECT is((
  SELECT count(*) FROM pg_policies
  WHERE schemaname='public'
    AND tablename IN ('people_employees','people_contracts','people_documents')
    AND cmd IN ('INSERT','UPDATE')
    AND (coalesce(qual,'') LIKE '%private.is_business_member%'
      OR coalesce(with_check,'') LIKE '%private.is_business_member%')
), 0, 'PII write policies do not authorize all business members');

-- Preserve the intended read-only operational RPCs for non-admin members.
SELECT ok(to_regprocedure('public.people_employees_limited(uuid)') IS NOT NULL, 'limited employee RPC remains available');
SELECT ok(to_regprocedure('public.people_contracts_limited(uuid)') IS NOT NULL, 'limited contract RPC remains available');
SELECT ok(to_regprocedure('public.people_compliance_items_limited(uuid)') IS NOT NULL, 'limited compliance RPC remains available');
SELECT ok(to_regprocedure('public.people_attendance_limited(uuid)') IS NOT NULL, 'limited attendance RPC remains available');
SELECT ok(to_regprocedure('public.people_leave_requests_limited(uuid)') IS NOT NULL, 'limited leave RPC remains available');
SELECT ok(to_regprocedure('public.people_terminations_limited(uuid)') IS NOT NULL, 'limited termination RPC remains available');
SELECT ok(to_regprocedure('public.people_vacation_balances_limited(uuid)') IS NOT NULL, 'limited vacation RPC remains available');

-- Owner/admin delete policies are preserved.
SELECT is((
  SELECT count(*) FROM pg_policies
  WHERE schemaname='public'
    AND tablename IN ('people_employees','people_contracts','people_documents')
    AND cmd='DELETE' AND qual LIKE '%private.has_business_role%'
    AND qual LIKE '%owner%' AND qual LIKE '%admin%'
), 3, 'owner/admin DELETE policies remain intact');

-- RLS must remain enabled on every affected table.
SELECT is((
  SELECT count(*) FROM pg_class c
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind='r'
    AND c.relname IN ('people_employees','people_contracts','people_documents',
      'people_payroll_items','people_payroll_periods','people_payroll_postings','people_payroll_runs')
    AND c.relrowsecurity
), 7, 'RLS remains enabled on all seven sensitive tables');

SELECT * FROM finish();
ROLLBACK;
