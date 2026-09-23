-- Payroll engine patch: keep SIS as a distinct component only before the August 2026 reform.
-- From August 2026 onward the 2.5% employer SSP contains the SIS component.
DO $$
DECLARE v_def text; v_new text;
BEGIN
 SELECT pg_get_functiondef('public.calculate_people_payroll_period(uuid)'::regprocedure) INTO v_def;
 v_new:=replace(v_def,
 'v_sis_amount:=round(v_pension_base*v_sis,0); v_crp_amount:=round(v_pension_base*v_crp,0);',
 'v_sis_amount:=case when v_period_start<date ''2026-08-01'' then round(v_pension_base*v_sis,0)+v_license_ssp else 0 end; v_crp_amount:=round(v_pension_base*v_crp,0);');
 IF v_new=v_def THEN RAISE EXCEPTION 'Expected SIS component expression not found'; END IF;
 EXECUTE v_new;
END $$;