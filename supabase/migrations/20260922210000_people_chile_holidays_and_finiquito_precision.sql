-- Nüva People — Chile holiday calendar and precise proportional vacation calculation
CREATE TABLE IF NOT EXISTS public.people_chile_holidays (
  holiday_date date PRIMARY KEY,
  name text NOT NULL,
  holiday_type text NOT NULL DEFAULT 'legal',
  is_working_holiday boolean NOT NULL DEFAULT false
);
INSERT INTO public.people_chile_holidays(holiday_date,name) VALUES
('2026-01-01','Año Nuevo'),('2026-04-03','Viernes Santo'),('2026-04-04','Sábado Santo'),
('2026-05-01','Día del Trabajo'),('2026-05-21','Día de las Glorias Navales'),('2026-06-21','Día Nacional de los Pueblos Indígenas'),
('2026-06-29','San Pedro y San Pablo'),('2026-07-16','Virgen del Carmen'),('2026-08-15','Asunción de la Virgen'),
('2026-09-18','Independencia Nacional'),('2026-09-19','Día de las Glorias del Ejército'),('2026-10-12','Encuentro de Dos Mundos'),
('2026-10-31','Día de las Iglesias Evangélicas y Protestantes'),('2026-11-01','Día de Todos los Santos'),('2026-12-08','Inmaculada Concepción'),('2026-12-25','Navidad')
ON CONFLICT DO NOTHING;
ALTER TABLE public.people_chile_holidays ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS people_chile_holidays_read ON public.people_chile_holidays;
CREATE POLICY people_chile_holidays_read ON public.people_chile_holidays FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.people_add_holiday_days(p_start date,p_habiles numeric)
RETURNS date LANGUAGE plpgsql STABLE AS $$
DECLARE d date:=p_start; n integer:=0;
BEGIN
  WHILE n < ceil(p_habiles) LOOP
    d:=d+1;
    IF extract(isodow FROM d) BETWEEN 1 AND 5 AND NOT EXISTS (SELECT 1 FROM public.people_chile_holidays h WHERE h.holiday_date=d AND NOT h.is_working_holiday) THEN n:=n+1; END IF;
  END LOOP;
  RETURN d;
END $$;

CREATE OR REPLACE FUNCTION public.calculate_people_termination(p_employee_id uuid,p_termination_date date,p_termination_cause text,p_notice_given boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,private AS $$
DECLARE e record;c record;v_service interval;v_years int;v_months int;v_days int;v_service_years numeric:=0;v_vac numeric;v_hab numeric;v_end date;v_calendar numeric;v_notice numeric:=0;v_severance numeric:=0;v_total numeric;
BEGIN
 SELECT * INTO e FROM people_employees WHERE id=p_employee_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'employee not found'; END IF;
 IF NOT private.has_business_role(e.business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]) THEN RAISE EXCEPTION 'owner/admin role required'; END IF;
 SELECT * INTO c FROM people_contracts WHERE employee_id=p_employee_id AND business_id=e.business_id AND status='active' AND start_date<=p_termination_date ORDER BY start_date DESC LIMIT 1;
 IF NOT FOUND THEN RAISE EXCEPTION 'active contract not found'; END IF;
 v_service:=age(p_termination_date,c.start_date);v_years:=extract(year FROM v_service);v_months:=extract(month FROM v_service);v_days:=extract(day FROM v_service);
 IF p_termination_cause IN ('161_necesidades_empresa','161_desahucio') THEN
   v_service_years:=least(v_years+CASE WHEN v_months>6 OR(v_months=6 AND v_days>0) THEN 1 ELSE 0 END,11);
   v_severance:=round(greatest(0,c.salary_amount)*v_service_years,0);
   IF NOT p_notice_given THEN v_notice:=round(greatest(0,c.salary_amount),0); END IF;
 END IF;
 v_hab:=round(1.25*(v_years*12+v_months+v_days/30.0),4);v_end:=people_add_holiday_days(p_termination_date,v_hab);v_calendar:=v_end-p_termination_date;v_vac:=round((greatest(0,c.salary_amount)/30.0)*v_calendar,0);v_total:=round(v_notice+v_severance+v_vac,0);
 INSERT INTO people_terminations(business_id,employee_id,termination_date,termination_cause,notice_pay,severance_years,severance_amount,vacation_pay,other_amount,deductions,total_amount,calculation_version,components,created_by)
 VALUES(e.business_id,p_employee_id,p_termination_date,p_termination_cause,v_notice,v_service_years,v_severance,v_vac,0,0,v_total,'cl-finiquito-2026.2',jsonb_build_object('salary_base',c.salary_amount,'service_years',v_service_years,'vacation_habiles',v_hab,'vacation_calendar_days',v_calendar,'notice_given',p_notice_given),auth.uid());
 RETURN jsonb_build_object('total_amount',v_total,'notice_pay',v_notice,'severance_amount',v_severance,'vacation_pay',v_vac,'vacation_calendar_days',v_calendar);
END $$;
REVOKE ALL ON FUNCTION public.calculate_people_termination(uuid,date,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_people_termination(uuid,date,text,boolean) TO authenticated;
