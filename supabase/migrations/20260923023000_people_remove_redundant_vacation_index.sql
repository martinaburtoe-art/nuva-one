-- El índice único (employee_id, as_of_date) ya cubre exactamente la misma búsqueda.
DROP INDEX IF EXISTS public.idx_people_vacation_employee_date;
