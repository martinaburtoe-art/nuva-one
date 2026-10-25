-- Nüva One — RPC de resumen del dashboard de Nüva People
-- Provee los datos de las tarjetas del dashboard /people:
--   active_employees, pending_leave, expiring_contracts, compliance[], payroll{}
-- Seguridad: SECURITY DEFINER con search_path = public, private.
--   - Cualquier miembro del negocio ve los contadores (activos, licencias pendientes,
--     contratos por vencer, cumplimiento).
--   - El bloque payroll{} (costo empleador por período) solo lo ven owner/admin
--     (remuneraciones). El personal operativo recibe payroll con valores por defecto.
-- Verifica membresía del usuario en el negocio antes de devolver datos.
-- Aislamiento por negocio mediante p_business_id en todas las consultas.
-- Sin JOIN: cada consulta agrega sobre una sola tabla, sin duplicación de filas.
-- Versión: 20261025130000

CREATE OR REPLACE FUNCTION public.people_dashboard_summary(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_member boolean;
  v_is_admin boolean;
  v_active_employees int;
  v_pending_leave int;
  v_expiring_contracts int;
  v_compliance jsonb;
  v_payroll jsonb;
BEGIN
  -- Verificar que el usuario autenticado sea miembro del negocio
  SELECT private.is_business_member(p_business_id, auth.uid()) INTO v_member;
  IF NOT v_member THEN
    RAISE EXCEPTION 'No tiene acceso a este negocio'
      USING ERRCODE = '42501'; -- insufficient_privilege
  END IF;

  -- Solo owner/admin leen el bloque de remuneraciones (costo empleador por período)
  SELECT private.has_business_role(p_business_id, auth.uid(), ARRAY['owner'::member_role, 'admin'::member_role]) INTO v_is_admin;

  -- Colaboradores activos
  SELECT COUNT(*) INTO v_active_employees
  FROM public.people_employees
  WHERE business_id = p_business_id
    AND employment_status = 'active';

  -- Solicitudes de licencia pendientes
  SELECT COUNT(*) INTO v_pending_leave
  FROM public.people_leave_requests
  WHERE business_id = p_business_id
    AND status = 'pending';

  -- Contratos próximos a vencer (dentro de 30 días)
  SELECT COUNT(*) INTO v_expiring_contracts
  FROM public.people_contracts
  WHERE business_id = p_business_id
    AND status = 'active'
    AND end_date IS NOT NULL
    AND end_date >= CURRENT_DATE
    AND end_date <= CURRENT_DATE + INTERVAL '30 days';

  -- Ítems de cumplimiento abiertos (no cerrados)
  SELECT COALESCE(
    (SELECT jsonb_agg(jsonb_build_object(
      'id', id,
      'title', title,
      'status', status,
      'due_date', due_date
    ))
    FROM public.people_compliance_items
    WHERE business_id = p_business_id
      AND status <> 'closed'
    ORDER BY due_date NULLS LAST
    LIMIT 50), '[]'::jsonb) INTO v_compliance;

  -- Último período de nómina con costo empleador (solo owner/admin)
  IF v_is_admin THEN
    SELECT COALESCE(
      (SELECT jsonb_build_object(
        'period', p.period_year::text || '-' || lpad(p.period_month::text, 2, '0'),
        'cost', COALESCE((
          SELECT SUM(pi.employer_cost_amount)
          FROM public.people_payroll_items pi
          WHERE pi.payroll_period_id = p.id
        ), 0),
        'status', p.status
      ))
      FROM public.people_payroll_periods p
      WHERE p.business_id = p_business_id
      ORDER BY p.period_year DESC, p.period_month DESC
      LIMIT 1),
      jsonb_build_object('period', 'Sin período', 'cost', 0, 'status', 'draft')
    ) INTO v_payroll;
  ELSE
    v_payroll := jsonb_build_object('period', 'Sin período', 'cost', 0, 'status', 'draft');
  END IF;

  RETURN jsonb_build_object(
    'active_employees', COALESCE(v_active_employees, 0),
    'pending_leave', COALESCE(v_pending_leave, 0),
    'expiring_contracts', COALESCE(v_expiring_contracts, 0),
    'compliance', v_compliance,
    'payroll', v_payroll
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.people_dashboard_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.people_dashboard_summary(uuid) TO authenticated;
