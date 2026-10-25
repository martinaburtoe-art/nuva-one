-- Nüva People — Concesiones de ejecución para RPC de acceso limitado
-- Revoca acceso público y otorga solo al rol authenticated.
-- Versión: 20261025140001

REVOKE EXECUTE ON FUNCTION public.people_employees_limited(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.people_employees_limited(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.people_attendance_limited(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.people_attendance_limited(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.people_leave_requests_limited(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.people_leave_requests_limited(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.people_vacation_balances_limited(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.people_vacation_balances_limited(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.people_contracts_limited(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.people_contracts_limited(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.people_compliance_items_limited(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.people_compliance_items_limited(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.people_terminations_limited(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.people_terminations_limited(uuid) TO authenticated;
