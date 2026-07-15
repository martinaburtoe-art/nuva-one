-- Módulo de Turnos: organización y asignación de horarios de empleados.
-- Solo owner/admin pueden crear, editar o eliminar turnos. El empleado
-- (si tiene cuenta) puede ver únicamente sus propios turnos.

CREATE TABLE IF NOT EXISTS public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  employee_phone TEXT,
  employee_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  week_start DATE NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT shifts_time_order CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_shifts_business_week ON public.shifts(business_id, week_start);
CREATE INDEX IF NOT EXISTS idx_shifts_employee_user ON public.shifts(employee_user_id) WHERE employee_user_id IS NOT NULL;

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage shifts" ON public.shifts
  FOR ALL
  USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role, 'admin'::member_role]))
  WITH CHECK (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role, 'admin'::member_role]));

CREATE POLICY "Employees view own shifts" ON public.shifts
  FOR SELECT USING (employee_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.touch_shifts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_shifts_updated_at ON public.shifts;
CREATE TRIGGER trg_touch_shifts_updated_at
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION public.touch_shifts_updated_at();
