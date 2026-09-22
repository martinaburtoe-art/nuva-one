
DO $$
DECLARE t text; p text;
BEGIN
  FOREACH t IN ARRAY ARRAY['people_absences','people_lre_rows','people_payroll_liquidations','people_terminations','people_vacation_balances'] LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('drop policy if exists %I on public.%I',p,t);
    END LOOP;
  END LOOP;
END $$;

CREATE POLICY people_absences_select ON public.people_absences FOR SELECT TO authenticated USING (private.is_business_member(business_id,auth.uid()));
CREATE POLICY people_absences_insert ON public.people_absences FOR INSERT TO authenticated WITH CHECK (private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]));
CREATE POLICY people_absences_update ON public.people_absences FOR UPDATE TO authenticated USING (private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[])) WITH CHECK (private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]));
CREATE POLICY people_absences_delete ON public.people_absences FOR DELETE TO authenticated USING (private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]));

CREATE POLICY people_lre_select ON public.people_lre_rows FOR SELECT TO authenticated USING (private.is_business_member(business_id,auth.uid()));
CREATE POLICY people_lre_insert ON public.people_lre_rows FOR INSERT TO authenticated WITH CHECK (private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]));
CREATE POLICY people_lre_update ON public.people_lre_rows FOR UPDATE TO authenticated USING (private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[])) WITH CHECK (private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]));
CREATE POLICY people_lre_delete ON public.people_lre_rows FOR DELETE TO authenticated USING (private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]));

CREATE POLICY people_liquidations_select ON public.people_payroll_liquidations FOR SELECT TO authenticated USING (private.is_business_member(business_id,auth.uid()));
CREATE POLICY people_liquidations_insert ON public.people_payroll_liquidations FOR INSERT TO authenticated WITH CHECK (private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]));
CREATE POLICY people_liquidations_update ON public.people_payroll_liquidations FOR UPDATE TO authenticated USING (private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[])) WITH CHECK (private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]));
CREATE POLICY people_liquidations_delete ON public.people_payroll_liquidations FOR DELETE TO authenticated USING (private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]));

CREATE POLICY people_terminations_select ON public.people_terminations FOR SELECT TO authenticated USING (private.is_business_member(business_id,auth.uid()));
CREATE POLICY people_terminations_insert ON public.people_terminations FOR INSERT TO authenticated WITH CHECK (private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]));
CREATE POLICY people_terminations_update ON public.people_terminations FOR UPDATE TO authenticated USING (private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[])) WITH CHECK (private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]));
CREATE POLICY people_terminations_delete ON public.people_terminations FOR DELETE TO authenticated USING (private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]));

CREATE POLICY people_vacation_select ON public.people_vacation_balances FOR SELECT TO authenticated USING (private.is_business_member(business_id,auth.uid()));
CREATE POLICY people_vacation_insert ON public.people_vacation_balances FOR INSERT TO authenticated WITH CHECK (private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]));
CREATE POLICY people_vacation_update ON public.people_vacation_balances FOR UPDATE TO authenticated USING (private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[])) WITH CHECK (private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]));
CREATE POLICY people_vacation_delete ON public.people_vacation_balances FOR DELETE TO authenticated USING (private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]));
