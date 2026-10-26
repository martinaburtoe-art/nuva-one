-- Nüva One — Ajuste de políticas RLS SELECT para tablas sensibles y faltantes
-- Elimina políticas SELECT preexistentes y crea políticas restrictivas con
-- private.has_business_role para aislamiento owner/admin en todas las tablas
-- que manejan datos de nómina, contratos, ausencias y liquidaciones.
--
-- Nota: esta migración usa un bloque DO para eliminar dinámicamente cualquier
-- política SELECT existente (independiente de su nombre) antes de crear las
-- nuevas, evitando que políticas legacy con private.is_business_member queden
-- activas junto a las nuevas.

BEGIN;

-- Eliminar todas las políticas SELECT existentes de las tablas sensibles
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT polname, polrelid::regclass::text AS tabla
        FROM pg_policy p
        JOIN pg_class c ON c.oid = p.polrelid
        WHERE c.relnamespace = 'public'::regnamespace
          AND c.relname IN (
            'people_employees','people_contracts','people_documents','people_payroll_items',
            'people_payroll_periods','people_payroll_postings','people_payroll_runs',
            'people_payroll_liquidations','people_lre_rows','people_absences',
            'people_payroll_inputs','people_vacation_balances','people_terminations',
            'people_karin_cases'
          )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %s', pol.polname, pol.tabla);
    END LOOP;
END $$;

-- 1. people_employees — directorio con PII
CREATE POLICY people_employees_select_owner_admin ON public.people_employees
  FOR SELECT TO authenticated
  USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role, 'admin'::member_role]));

-- 2. people_contracts — salario y condiciones del contrato
CREATE POLICY people_contracts_select_owner_admin ON public.people_contracts
  FOR SELECT TO authenticated
  USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role, 'admin'::member_role]));

-- 3. people_documents — documentos personales de los empleados
CREATE POLICY people_documents_select_owner_admin ON public.people_documents
  FOR SELECT TO authenticated
  USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role, 'admin'::member_role]));

-- 4. people_payroll_items — líneas de remuneración
CREATE POLICY people_payroll_items_select_owner_admin ON public.people_payroll_items
  FOR SELECT TO authenticated
  USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role, 'admin'::member_role]));

-- 5. people_payroll_periods — períodos de remuneración
CREATE POLICY people_payroll_periods_select_owner_admin ON public.people_payroll_periods
  FOR SELECT TO authenticated
  USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role, 'admin'::member_role]));

-- 6. people_payroll_postings — asientos contables de nómina
CREATE POLICY people_payroll_postings_select_owner_admin ON public.people_payroll_postings
  FOR SELECT TO authenticated
  USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role, 'admin'::member_role]));

-- 7. people_payroll_runs — procesos de cierre de nómina
CREATE POLICY people_payroll_runs_select_owner_admin ON public.people_payroll_runs
  FOR SELECT TO authenticated
  USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role, 'admin'::member_role]));

-- 8. people_payroll_liquidations — liquidaciones / finiquitos
CREATE POLICY people_payroll_liquidations_select_owner_admin ON public.people_payroll_liquidations
  FOR SELECT TO authenticated
  USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role, 'admin'::member_role]));

-- 9. people_lre_rows — Libro de Remuneraciones Electrónico (SII)
CREATE POLICY people_lre_rows_select_owner_admin ON public.people_lre_rows
  FOR SELECT TO authenticated
  USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role, 'admin'::member_role]));

-- 10. people_absences — inasistencias y licencias médicas
CREATE POLICY people_absences_select_owner_admin ON public.people_absences
  FOR SELECT TO authenticated
  USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role, 'admin'::member_role]));

-- 11. people_payroll_inputs — entradas de nómina (faltante en migración previa)
CREATE POLICY people_payroll_inputs_select_owner_admin ON public.people_payroll_inputs
  FOR SELECT TO authenticated
  USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role, 'admin'::member_role]));

-- 12. people_vacation_balances — saldos de vacaciones (faltante en migración previa)
CREATE POLICY people_vacation_balances_select_owner_admin ON public.people_vacation_balances
  FOR SELECT TO authenticated
  USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role, 'admin'::member_role]));

-- 13. people_terminations — terminaciones (faltante en migración previa)
CREATE POLICY people_terminations_select_owner_admin ON public.people_terminations
  FOR SELECT TO authenticated
  USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role, 'admin'::member_role]));

-- 14. people_karin_cases — casos Karin (restringido a owner/admin)
CREATE POLICY people_karin_cases_select_owner_admin ON public.people_karin_cases
  FOR SELECT TO authenticated
  USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role, 'admin'::member_role]));

COMMIT;
