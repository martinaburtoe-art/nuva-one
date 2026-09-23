-- Medical leave payroll hardening (Chile)
ALTER TABLE public.people_payroll_inputs
  ADD COLUMN IF NOT EXISTS medical_leave_days numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS medical_leave_rima numeric NOT NULL DEFAULT 0;

ALTER TABLE public.people_payroll_inputs
  ADD CONSTRAINT people_payroll_inputs_medical_leave_days_nonnegative_ck CHECK (medical_leave_days >= 0),
  ADD CONSTRAINT people_payroll_inputs_medical_leave_rima_nonnegative_ck CHECK (medical_leave_rima >= 0);

CREATE OR REPLACE FUNCTION public.people_medical_leave_days(p_employee_id uuid,p_start date,p_end date)
RETURNS numeric LANGUAGE plpgsql STABLE SET search_path=public AS $$
DECLARE d date:=p_start; n numeric:=0;
BEGIN
 IF p_end<p_start THEN RETURN 0; END IF;
 WHILE d<=p_end LOOP
   IF EXISTS (SELECT 1 FROM public.people_absences pa WHERE pa.employee_id=p_employee_id AND pa.starts_on<=d AND pa.ends_on>=d AND lower(coalesce(pa.absence_type,'')) IN ('medical_leave','licencia_medica','licencia médica')) THEN n:=n+1; END IF;
   d:=d+1;
 END LOOP;
 RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.people_unpaid_absence_days(p_employee_id uuid,p_start date,p_end date)
RETURNS numeric LANGUAGE plpgsql STABLE SET search_path=public AS $$
DECLARE d date:=p_start; n numeric:=0;
BEGIN
 IF p_end<p_start THEN RETURN 0; END IF;
 WHILE d<=p_end LOOP
   IF EXISTS (SELECT 1 FROM public.people_absences pa WHERE pa.employee_id=p_employee_id AND pa.starts_on<=d AND pa.ends_on>=d AND coalesce(pa.paid,false)=false AND lower(coalesce(pa.absence_type,'')) NOT IN ('vacation','medical_leave','licencia_medica','licencia médica')) THEN n:=n+1; END IF;
   d:=d+1;
 END LOOP;
 RETURN n;
END $$;

REVOKE ALL ON FUNCTION public.people_medical_leave_days(uuid,date,date) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.people_unpaid_absence_days(uuid,date,date) FROM PUBLIC,anon,authenticated;

-- calculate_people_payroll_period(uuid) is updated in the deployed database to cl-2026.9:
-- * excludes medical leave from unpaid-absence helper
-- * records medical leave days
-- * applies employer SIS/SSP on RIMA during medical leave
-- * uses the correct pre/post-August 2026 employer rate
-- * warns when a medical leave has no RIMA input
