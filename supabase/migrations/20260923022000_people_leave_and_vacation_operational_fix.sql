-- Corrige el cálculo de vacaciones contra el esquema real y completa el flujo
-- solicitud -> aprobación/rechazo -> ausencia efectiva.

CREATE OR REPLACE FUNCTION public.calculate_people_vacation_balance(
  p_employee_id uuid,
  p_as_of_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public', 'private'
AS $function$
DECLARE
  e record;
  accrued numeric;
  used numeric;
  available numeric;
BEGIN
  SELECT * INTO e FROM public.people_employees WHERE id = p_employee_id;
  IF NOT FOUND OR NOT private.is_business_member(e.business_id, (SELECT auth.uid())) THEN
    RAISE EXCEPTION 'employee not accessible';
  END IF;
  accrued := public.people_accrued_vacation_days(e.hire_date, p_as_of_date);
  SELECT COALESCE(sum(public.people_working_days_between(a.starts_on, a.ends_on)), 0)
    INTO used
  FROM public.people_absences a
  WHERE a.employee_id = p_employee_id
    AND a.business_id = e.business_id
    AND a.absence_type = 'vacation'
    AND a.starts_on >= e.hire_date
    AND a.ends_on <= p_as_of_date;
  available := greatest(0, accrued - used);
  INSERT INTO public.people_vacation_balances(
    business_id, employee_id, as_of_date, accrued_days, used_days, available_days, progressive_days
  ) VALUES (e.business_id, p_employee_id, p_as_of_date, accrued, used, available, 0)
  ON CONFLICT(employee_id, as_of_date) DO UPDATE SET
    accrued_days = EXCLUDED.accrued_days,
    used_days = EXCLUDED.used_days,
    available_days = EXCLUDED.available_days,
    progressive_days = EXCLUDED.progressive_days;
  RETURN jsonb_build_object(
    'employee_id', p_employee_id,
    'as_of_date', p_as_of_date,
    'accrued_days', accrued,
    'used_days', used,
    'available_days', available,
    'progressive_days', 0
  );
END
$function$;

CREATE OR REPLACE FUNCTION public.review_people_leave_request(
  p_leave_request_id uuid,
  p_action text,
  p_paid boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public', 'private'
AS $function$
DECLARE
  r record;
  absence_id uuid;
  days numeric;
BEGIN
  SELECT lr.*, e.business_id INTO r
  FROM public.people_leave_requests lr
  JOIN public.people_employees e ON e.id = lr.employee_id
  WHERE lr.id = p_leave_request_id;
  IF NOT FOUND OR NOT private.has_business_role(
    r.business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]
  ) THEN
    RAISE EXCEPTION 'leave request not accessible';
  END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'leave request is not pending'; END IF;
  IF r.start_date > r.end_date OR r.days <= 0 THEN RAISE EXCEPTION 'invalid leave request dates or days'; END IF;
  IF p_action NOT IN ('approve', 'reject') THEN RAISE EXCEPTION 'invalid action'; END IF;
  IF p_action = 'reject' THEN
    UPDATE public.people_leave_requests
    SET status='rejected', approved_by=(SELECT auth.uid()), approved_at=now()
    WHERE id=r.id;
    RETURN jsonb_build_object('leave_request_id',r.id,'status','rejected');
  END IF;
  days := public.people_working_days_between(r.start_date, r.end_date);
  IF r.leave_type='vacation' AND days <= 0 THEN RAISE EXCEPTION 'vacation request has no working days'; END IF;
  INSERT INTO public.people_absences(
    business_id, employee_id, absence_type, starts_on, ends_on, paid, notes
  ) VALUES (
    r.business_id, r.employee_id, r.leave_type, r.start_date, r.end_date, p_paid,
    COALESCE(r.reason, 'Solicitud aprobada desde Nüva People')
  ) RETURNING id INTO absence_id;
  UPDATE public.people_leave_requests
  SET status='approved', approved_by=(SELECT auth.uid()), approved_at=now()
  WHERE id=r.id;
  RETURN jsonb_build_object(
    'leave_request_id',r.id,'status','approved','absence_id',absence_id,
    'working_days',days,'paid',p_paid
  );
END
$function$;

REVOKE ALL ON FUNCTION public.review_people_leave_request(uuid, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_people_leave_request(uuid, text, boolean) TO authenticated;
