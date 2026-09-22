ALTER TABLE public.people_legal_parameters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS people_legal_parameters_select ON public.people_legal_parameters;
CREATE POLICY people_legal_parameters_select ON public.people_legal_parameters FOR SELECT TO authenticated USING (true);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['people_payroll_periods','people_payroll_items','people_payroll_runs','people_payroll_postings','people_lre_exports'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS people_member_insert ON public.%I',t);
    EXECUTE format('DROP POLICY IF EXISTS people_member_update ON public.%I',t);
    EXECUTE format('CREATE POLICY people_payroll_insert ON public.%I FOR INSERT WITH CHECK (private.has_business_role(business_id,auth.uid(),ARRAY[''owner'',''admin'']::public.member_role[]))',t);
    EXECUTE format('CREATE POLICY people_payroll_update ON public.%I FOR UPDATE USING (private.has_business_role(business_id,auth.uid(),ARRAY[''owner'',''admin'']::public.member_role[])) WITH CHECK (private.has_business_role(business_id,auth.uid(),ARRAY[''owner'',''admin'']::public.member_role[]))',t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS people_member_select ON public.people_karin_cases;
DROP POLICY IF EXISTS people_member_insert ON public.people_karin_cases;
DROP POLICY IF EXISTS people_member_update ON public.people_karin_cases;
DROP POLICY IF EXISTS people_admin_delete ON public.people_karin_cases;
DROP POLICY IF EXISTS people_karin_select ON public.people_karin_cases;
DROP POLICY IF EXISTS people_karin_insert ON public.people_karin_cases;
DROP POLICY IF EXISTS people_karin_update ON public.people_karin_cases;
CREATE POLICY people_karin_select ON public.people_karin_cases FOR SELECT USING (private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]));
CREATE POLICY people_karin_insert ON public.people_karin_cases FOR INSERT WITH CHECK (private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]));
CREATE POLICY people_karin_update ON public.people_karin_cases FOR UPDATE USING (private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[])) WITH CHECK (private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]));
CREATE POLICY people_karin_delete ON public.people_karin_cases FOR DELETE USING (private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]));
