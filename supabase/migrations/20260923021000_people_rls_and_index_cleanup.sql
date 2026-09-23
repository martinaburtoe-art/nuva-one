-- Optimiza RLS de People y elimina índices únicos redundantes detectados por el advisor.
-- Mantiene los índices creados por las restricciones UNIQUE como fuente canónica.

DROP INDEX IF EXISTS public.people_payroll_inputs_period_employee_uq;
DROP INDEX IF EXISTS public.people_payroll_liquidations_period_employee_uq;
DROP INDEX IF EXISTS public.people_payroll_periods_business_month_uq;

ALTER POLICY people_absences_delete ON public.people_absences
  USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
ALTER POLICY people_absences_insert ON public.people_absences
  WITH CHECK (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
ALTER POLICY people_absences_select ON public.people_absences
  USING (private.is_business_member(business_id, (SELECT auth.uid())));
ALTER POLICY people_absences_update ON public.people_absences
  USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]))
  WITH CHECK (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));

ALTER POLICY people_lre_delete ON public.people_lre_rows
  USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
ALTER POLICY people_lre_insert ON public.people_lre_rows
  WITH CHECK (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
ALTER POLICY people_lre_select ON public.people_lre_rows
  USING (private.is_business_member(business_id, (SELECT auth.uid())));
ALTER POLICY people_lre_update ON public.people_lre_rows
  USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]))
  WITH CHECK (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));

ALTER POLICY people_liquidations_delete ON public.people_payroll_liquidations
  USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
ALTER POLICY people_liquidations_insert ON public.people_payroll_liquidations
  WITH CHECK (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
ALTER POLICY people_liquidations_select ON public.people_payroll_liquidations
  USING (private.is_business_member(business_id, (SELECT auth.uid())));
ALTER POLICY people_liquidations_update ON public.people_payroll_liquidations
  USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]))
  WITH CHECK (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));

ALTER POLICY people_terminations_delete ON public.people_terminations
  USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
ALTER POLICY people_terminations_insert ON public.people_terminations
  WITH CHECK (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
ALTER POLICY people_terminations_select ON public.people_terminations
  USING (private.is_business_member(business_id, (SELECT auth.uid())));
ALTER POLICY people_terminations_update ON public.people_terminations
  USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]))
  WITH CHECK (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));

ALTER POLICY people_vacation_delete ON public.people_vacation_balances
  USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
ALTER POLICY people_vacation_insert ON public.people_vacation_balances
  WITH CHECK (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
ALTER POLICY people_vacation_select ON public.people_vacation_balances
  USING (private.is_business_member(business_id, (SELECT auth.uid())));
ALTER POLICY people_vacation_update ON public.people_vacation_balances
  USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]))
  WITH CHECK (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
