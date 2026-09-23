-- Endurece aprobación de solicitudes: bloqueo de concurrencia,
-- evita solapamientos y no permite aprobar vacaciones sobre el saldo disponible.
CREATE OR REPLACE FUNCTION public.review_people_leave_request(
  p_leave_request_id uuid,
  p_action text,
  p_paid boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public','private'
AS $function$
DECLARE
  r record;
  absence_id uuid;
  days numeric;
  balance jsonb;
  available numeric;
  overlap_count integer;
BEGIN
  SELECT lr.*, e.business_id
    INTO r
  FROM public.people_leave_requests lr
  JOIN public.people_employees e ON e.id = lr.employee_id
  WHERE lr.id = p_leave_request_id
  FOR UPDATE OF lr;

  IF NOT FOUND OR NOT private.has_business_role(
    r.business_id,
    (SELECT auth.uid()),
    ARRAY['owner'::member_role,'admin'::member_role]
  ) THEN
    RAISE EXCEPTION 'leave request not accessible';
  END IF;

  IF r.status <> 'pending' THEN
    RAISE EXCEPTION 'leave request is not pending';
  END IF;

  IF r.start_date > r.end_date OR r.days <= 0 THEN
    RAISE EXCEPTION 'invalid leave request dates or days';
  END IF;

  IF p_action NOT IN ('approve','reject') THEN
    RAISE EXCEPTION 'invalid action';
  END IF;

  IF p_action = 'reject' THEN
    UPDATE public.people_leave_requests
    SET status='rejected',
        approved_by=(SELECT auth.uid()),
        approved_at=now()
    WHERE id=r.id;
    RETURN jsonb_build_object('leave_request_id',r.id,'status','rejected');
  END IF;

  days := public.people_working_days_between(r.start_date,r.end_date);

  IF r.leave_type='vacation' THEN
    IF days <= 0 THEN
      RAISE EXCEPTION 'vacation request has no working days';
    END IF;

    SELECT count(*) INTO overlap_count
    FROM public.people_absences a
    WHERE a.employee_id=r.employee_id
      AND a.business_id=r.business_id
      AND a.absence_type='vacation'
      AND daterange(a.starts_on,a.ends_on,'[]') &&
          daterange(r.start_date,r.end_date,'[]');

    IF overlap_count > 0 THEN
      RAISE EXCEPTION 'vacation request overlaps an existing vacation';
    END IF;

    balance := public.calculate_people_vacation_balance(r.employee_id,r.end_date);
    available := COALESCE((balance->>'available_days')::numeric,0);

    IF days > available + 0.0001 THEN
      RAISE EXCEPTION 'insufficient vacation balance: requested %, available %', days, available;
    END IF;
  END IF;

  INSERT INTO public.people_absences(
    business_id,employee_id,absence_type,starts_on,ends_on,paid,notes
  )
  VALUES(
    r.business_id,r.employee_id,r.leave_type,r.start_date,r.end_date,p_paid,
    COALESCE(r.reason,'Solicitud aprobada desde Nüva People')
  )
  RETURNING id INTO absence_id;

  UPDATE public.people_leave_requests
  SET status='approved',
      approved_by=(SELECT auth.uid()),
      approved_at=now()
  WHERE id=r.id;

  RETURN jsonb_build_object(
    'leave_request_id',r.id,
    'status','approved',
    'absence_id',absence_id,
    'working_days',days,
    'paid',p_paid
  );
END
$function$;

REVOKE ALL ON FUNCTION public.review_people_leave_request(uuid,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_people_leave_request(uuid,text,boolean) TO authenticated;
