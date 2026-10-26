-- Nüva One — Endurecimiento de lectura de Nüva People (PREPARADO, NO APLICADO).
--
-- Requisito de seguridad: remuneraciones, contratos, documentos personales,
-- ausencias y el Libro de Remuneraciones Electrónico (LRE) solo deben ser
-- legibles por el propietario y los administradores del negocio.
--
-- Estado actual (verificado contra supabase_db_vnzyecnbdqbfuxawzrda): RLS está
-- habilitado en todas las tablas people_*, pero sus políticas SELECT usan
-- private.is_business_member(business_id, auth.uid()), por lo que CUALQUIER
-- miembro autenticado del negocio lee salarios, contratos, documentos,
-- liquidaciones y filas del LRE de toda la empresa. Las políticas de
-- INSERT/UPDATE/DELETE ya estaban restringidas a owner/admin y se mantienen.
--
-- Esta migración es un borrador de auditoría: revisar, probar en staging y
-- aplicar solo allí. El frontend lee estas tablas directamente desde el
-- navegador (people-payroll.tsx, people-employees.tsx); tras aplicarla, los
-- roles no administradores dejarán de ver esos datos hasta que se ajusten las
-- consultas/vistas del frontend.

BEGIN;

-- 1. people_employees — directorio con PII (national_id, teléfono, fecha de nacimiento, banco, AFP, salud)
DROP POLICY IF EXISTS people_employees_select_member ON public.people_employees;
CREATE POLICY people_employees_select_owner_admin ON public.people_employees
  FOR SELECT TO authenticated
  USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role, 'admin'::member_role]));

-- 2. people_contracts — salario y condiciones del contrato
DROP POLICY IF EXISTS people_contracts_select_member ON public.people_contracts;
CREATE POLICY people_contracts_select_owner_admin ON public.people_contracts
  FOR SELECT TO authenticated
  USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role, 'admin'::member_role]));

-- 3. people_documents — documentos personales de los empleados
DROP POLICY IF EXISTS people_documents_select_member ON public.people_documents;
CREATE POLICY people_documents_select_owner_admin ON public.people_documents
  FOR SELECT TO authenticated
  USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role, 'admin'::member_role]));

-- 4. people_payroll_items — líneas de remuneración (sueldos, asignaciones, descuentos)
DROP POLICY IF EXISTS people_payroll_items_select_member ON public.people_payroll_items;
DROP POLICY IF EXISTS people_payroll_items_select_admin ON public.people_payroll_items;
CREATE POLICY people_payroll_items_select_owner_admin ON public.people_payroll_items
  FOR SELECT TO authenticated
  USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role, 'admin'::member_role]));

-- 5. people_payroll_periods — períodos de remuneración
DROP POLICY IF EXISTS people_payroll_periods_select_member ON public.people_payroll_periods;
DROP POLICY IF EXISTS people_payroll_periods_select_admin ON public.people_payroll_periods;
CREATE POLICY people_payroll_periods_select_owner_admin ON public.people_payroll_periods
  FOR SELECT TO authenticated
  USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role, 'admin'::member_role]));

-- 6. people_payroll_postings — asientos contables de nómina
DROP POLICY IF EXISTS people_payroll_postings_select_member ON public.people_payroll_postings;
CREATE POLICY people_payroll_postings_select_owner_admin ON public.people_payroll_postings
  FOR SELECT TO authenticated
  USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role, 'admin'::member_role]));

-- 7. people_payroll_runs — procesos de cierre de nómina
DROP POLICY IF EXISTS people_payroll_runs_select_member ON public.people_payroll_runs;
CREATE POLICY people_payroll_runs_select_owner_admin ON public.people_payroll_runs
  FOR SELECT TO authenticated
  USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role, 'admin'::member_role]));

-- 8. people_payroll_liquidations — liquidaciones / finiquitos
DROP POLICY IF EXISTS people_liquidations_select ON public.people_payroll_liquidations;
CREATE POLICY people_payroll_liquidations_select_owner_admin ON public.people_payroll_liquidations
  FOR SELECT TO authenticated
  USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role, 'admin'::member_role]));

-- 9. people_lre_rows — Libro de Remuneraciones Electrónico (SII)
DROP POLICY IF EXISTS people_lre_select ON public.people_lre_rows;
CREATE POLICY people_lre_rows_select_owner_admin ON public.people_lre_rows
  FOR SELECT TO authenticated
  USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role, 'admin'::member_role]));

-- 10. people_absences — inasistencias y licencias médicas (datos de salud)
DROP POLICY IF EXISTS people_absences_select ON public.people_absences;
CREATE POLICY people_absences_select_owner_admin ON public.people_absences
  FOR SELECT TO authenticated
  USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role, 'admin'::member_role]));

COMMIT;
