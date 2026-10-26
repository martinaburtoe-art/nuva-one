-- Nüva People — RPC de acceso limitado para personal operativo
-- Provee datos de tablas people a usuarios staff/viewer sin exponer
-- remuneraciones, contratos completos, documentos ni liquidaciones.
-- Seguridad: SECURITY DEFINER con search_path = public, private.
--   - Verifica membresía del usuario en el negocio antes de devolver datos.
--   - Devuelve solo columnas no sensibles (sin salarios, montos, RUT, bancario).
--   - Aislamiento por negocio mediante p_business_id en todas las consultas.
-- Versión: 20261025140000

-- Colaboradores: solo campos de identificación y cargo (sin RUT, teléfono, bancario)
CREATE OR REPLACE FUNCTION public.people_employees_limited(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE v_member boolean;
BEGIN
  SELECT private.is_business_member(p_business_id, auth.uid()) INTO v_member;
  IF NOT v_member THEN
    RAISE EXCEPTION 'No tiene acceso a este negocio'
      USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', id,
      'first_name', first_name,
      'last_name', last_name,
      'email', email,
      'job_title', job_title,
      'department', department,
      'employment_status', employment_status
    ))
    FROM public.people_employees
    WHERE business_id = p_business_id
    ORDER BY last_name, first_name
  ), '[]'::jsonb);
END;
$$;

-- Eventos de asistencia: solo metadatos del evento (sin datos sensibles del empleado)
CREATE OR REPLACE FUNCTION public.people_attendance_limited(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE v_member boolean;
BEGIN
  SELECT private.is_business_member(p_business_id, auth.uid()) INTO v_member;
  IF NOT v_member THEN
    RAISE EXCEPTION 'No tiene acceso a este negocio'
      USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', id,
      'employee_id', employee_id,
      'event_at', event_at,
      'event_type', event_type,
      'source', source,
      'created_at', created_at
    ))
    FROM public.people_attendance_events
    WHERE business_id = p_business_id
    ORDER BY event_at DESC
    LIMIT 500
  ), '[]'::jsonb);
END;
$$;

-- Solicitudes de licencia: datos operativos (sin información de nómina)
CREATE OR REPLACE FUNCTION public.people_leave_requests_limited(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE v_member boolean;
BEGIN
  SELECT private.is_business_member(p_business_id, auth.uid()) INTO v_member;
  IF NOT v_member THEN
    RAISE EXCEPTION 'No tiene acceso a este negocio'
      USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', id,
      'employee_id', employee_id,
      'leave_type', leave_type,
      'start_date', start_date,
      'end_date', end_date,
      'days', days,
      'status', status,
      'reason', reason,
      'created_at', created_at
    ))
    FROM public.people_leave_requests
    WHERE business_id = p_business_id
    ORDER BY created_at DESC
    LIMIT 500
  ), '[]'::jsonb);
END;
$$;

-- Vacaciones: saldos disponibles (sin desglose de acumulación detallada)
CREATE OR REPLACE FUNCTION public.people_vacation_balances_limited(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE v_member boolean;
BEGIN
  SELECT private.is_business_member(p_business_id, auth.uid()) INTO v_member;
  IF NOT v_member THEN
    RAISE EXCEPTION 'No tiene acceso a este negocio'
      USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', id,
      'employee_id', employee_id,
      'as_of_date', as_of_date,
      'accrued_days', accrued_days,
      'used_days', used_days,
      'available_days', available_days
    ))
    FROM public.people_vacation_balances
    WHERE business_id = p_business_id
  ), '[]'::jsonb);
END;
$$;

-- Contratos: solo fechas y estado (sin salario_amount ni salary_type)
CREATE OR REPLACE FUNCTION public.people_contracts_limited(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE v_member boolean;
BEGIN
  SELECT private.is_business_member(p_business_id, auth.uid()) INTO v_member;
  IF NOT v_member THEN
    RAISE EXCEPTION 'No tiene acceso a este negocio'
      USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', id,
      'employee_id', employee_id,
      'contract_type', contract_type,
      'start_date', start_date,
      'end_date', end_date,
      'status', status
    ))
    FROM public.people_contracts
    WHERE business_id = p_business_id
  ), '[]'::jsonb);
END;
$$;

-- Cumplimiento: ítems abiertos (sin documentos ni evidencias)
CREATE OR REPLACE FUNCTION public.people_compliance_items_limited(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE v_member boolean;
BEGIN
  SELECT private.is_business_member(p_business_id, auth.uid()) INTO v_member;
  IF NOT v_member THEN
    RAISE EXCEPTION 'No tiene acceso a este negocio'
      USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', id,
      'employee_id', employee_id,
      'category', category,
      'title', title,
      'status', status,
      'due_date', due_date
    ))
    FROM public.people_compliance_items
    WHERE business_id = p_business_id
      AND status <> 'closed'
    ORDER BY due_date NULLS LAST
    LIMIT 200
  ), '[]'::jsonb);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.people_compliance_items_limited(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.people_compliance_items_limited(uuid) TO authenticated;

-- Terminaciones: solo fecha y causal (sin montos de indemnización ni finiquito)
CREATE OR REPLACE FUNCTION public.people_terminations_limited(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE v_member boolean;
BEGIN
  SELECT private.is_business_member(p_business_id, auth.uid()) INTO v_member;
  IF NOT v_member THEN
    RAISE EXCEPTION 'No tiene acceso a este negocio'
      USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', id,
      'employee_id', employee_id,
      'termination_date', termination_date,
      'termination_cause', termination_cause
    ))
    FROM public.people_terminations
    WHERE business_id = p_business_id
    ORDER BY termination_date DESC
  ), '[]'::jsonb);
END;
$$;
