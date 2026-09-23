-- LRE internal payload uses descriptive keys, not invented DT numeric codes.
-- Official DT coding must be applied only by the final exporter against the current Supplement schema.
DO $$
DECLARE v_def text; v_new text;
BEGIN
 SELECT pg_get_functiondef('public.prepare_people_lre(uuid)'::regprocedure) INTO v_def;
 v_new:=replace(v_def,'''2101_sueldo'',coalesce((i.components->>''salary'')::numeric,0),''2102_sobresueldo'',i.overtime_amount,''2106_gratificacion'',coalesce((i.components->>''gratification'')::numeric,0),''2111_bonos_fijos'',coalesce((i.components->>''taxable_bonus'')::numeric,0),''2113_bonos_variables'',coalesce((i.components->>''taxable_bonus'')::numeric,0)',
 '''sueldo_base'',coalesce((i.components->>''salary'')::numeric,0),''sobresueldo'',i.overtime_amount,''gratificacion'',coalesce((i.components->>''gratification'')::numeric,0),''bono_taxable'',coalesce((i.components->>''taxable_bonus'')::numeric,0)');
 v_new:=replace(v_new,'''3141_prevision'',coalesce((i.components->>''afp_employee'')::numeric,0),''3143_salud_7pct'',coalesce((i.components->>''health'')::numeric,0),''3151_afc_trabajador'',coalesce((i.components->>''afc_employee'')::numeric,0),''3161_iusc'',i.income_tax',
 '''prevision_afp'',coalesce((i.components->>''afp_employee'')::numeric,0),''salud'',coalesce((i.components->>''health'')::numeric,0),''afc_trabajador'',coalesce((i.components->>''afc_employee'')::numeric,0),''iusc'',i.income_tax');
 IF v_new=v_def THEN RAISE EXCEPTION 'Expected LRE mapping was not found'; END IF;
 EXECUTE v_new;
END $$;