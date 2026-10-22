-- Nüva People: restrict sensitive HR/payroll data to business owners and admins.
-- Proposal only: do not apply to production without review and the paired pgTAP suite.
-- Staff operational reads are provided through people_employee_operational, which omits
-- national identifiers, contact details, banking, health/pension, and compensation fields.

DO $migration$
DECLARE
  t text;
  had_insert boolean;
  had_update boolean;
  had_delete boolean;
  policy_row record;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'people_employees',
    'people_contracts',
    'people_documents',
    'people_absences',
    'people_leave_requests',
    'people_compliance_items',
    'people_vacation_balances',
    'people_payroll_periods',
    'people_payroll_inputs',
    'people_payroll_items',
    'people_payroll_liquidations',
    'people_payroll_postings',
    'people_payroll_runs',
    'people_lre_rows',
    'people_lre_exports',
    'people_karin_cases',
    'people_gratification_settings',
    'people_gratification_settlements'
  ] LOOP
    IF to_regclass(format('public.%I', t)) IS NULL THEN
      RAISE EXCEPTION 'Expected Nüva People table public.% is missing; aborting hardening', t;
    END IF;

    SELECT
      coalesce(bool_or(cmd IN ('INSERT', 'ALL')), false),
      coalesce(bool_or(cmd IN ('UPDATE', 'ALL')), false),
      coalesce(bool_or(cmd IN ('DELETE', 'ALL')), false)
    INTO had_insert, had_update, had_delete
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = t;

    -- Replace every policy on these sensitive tables so an older permissive policy
    -- cannot continue granting access alongside the new restrictive policy set.
    FOR policy_row IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_row.policyname, t);
    END LOOP;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format(
      'CREATE POLICY people_sensitive_select_admin ON public.%I FOR SELECT TO authenticated
       USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY[''owner'',''admin'']::public.member_role[]))',
      t
    );

    IF had_insert THEN
      EXECUTE format(
        'CREATE POLICY people_sensitive_insert_admin ON public.%I FOR INSERT TO authenticated
         WITH CHECK (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY[''owner'',''admin'']::public.member_role[]))',
        t
      );
    END IF;

    IF had_update THEN
      EXECUTE format(
        'CREATE POLICY people_sensitive_update_admin ON public.%I FOR UPDATE TO authenticated
         USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY[''owner'',''admin'']::public.member_role[]))
         WITH CHECK (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY[''owner'',''admin'']::public.member_role[]))',
        t
      );
    END IF;

    IF had_delete THEN
      EXECUTE format(
        'CREATE POLICY people_sensitive_delete_admin ON public.%I FOR DELETE TO authenticated
         USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY[''owner'',''admin'']::public.member_role[]))',
        t
      );
    END IF;
  END LOOP;
END
$migration$;

-- Operational employee directory for staff: intentionally excludes sensitive columns.
-- The explicit membership predicate is required because a view owner can bypass table RLS.
CREATE OR REPLACE VIEW public.people_employee_operational
WITH (security_barrier = true) AS
SELECT
  e.id,
  e.business_id,
  e.first_name,
  e.last_name,
  e.hire_date,
  e.employment_status,
  e.employment_type,
  e.job_title,
  e.department,
  e.manager_id,
  e.created_at,
  e.updated_at
FROM public.people_employees AS e
WHERE private.is_business_member(e.business_id, (SELECT auth.uid()));

GRANT SELECT ON public.people_employee_operational TO authenticated;

COMMENT ON VIEW public.people_employee_operational IS
  'Limited operational employee directory for authenticated business members. Sensitive HR, identity, banking, health and compensation fields are intentionally excluded.';
