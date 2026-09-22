ALTER TABLE public.people_employees ADD COLUMN IF NOT EXISTS afp_name text;
ALTER TABLE public.people_employees ADD COLUMN IF NOT EXISTS health_system text NOT NULL DEFAULT 'fonasa';
ALTER TABLE public.people_employees ADD COLUMN IF NOT EXISTS health_plan_uf numeric(10,4);
ALTER TABLE public.people_employees ADD COLUMN IF NOT EXISTS health_additional_clp numeric(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.people_employees ADD COLUMN IF NOT EXISTS dependents_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.people_tax_brackets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), country_code text NOT NULL DEFAULT 'CL', tax_type text NOT NULL,
  period_year integer NOT NULL, period_month integer NOT NULL, min_income numeric(14,2) NOT NULL, max_income numeric(14,2),
  factor numeric(12,8) NOT NULL, rebate numeric(14,2) NOT NULL DEFAULT 0, source_url text NOT NULL,
  source_reference text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(country_code,tax_type,period_year,period_month,min_income)
);

CREATE TABLE IF NOT EXISTS public.people_afp_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), country_code text NOT NULL DEFAULT 'CL', afp_name text NOT NULL,
  worker_commission numeric(8,5) NOT NULL, mandatory_rate numeric(8,5) NOT NULL DEFAULT 0.10,
  effective_from date NOT NULL, effective_to date, source_url text NOT NULL, source_reference text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(country_code,afp_name,effective_from)
);

ALTER TABLE public.people_tax_brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people_afp_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS people_tax_select ON public.people_tax_brackets;
CREATE POLICY people_tax_select ON public.people_tax_brackets FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS people_afp_select ON public.people_afp_rates;
CREATE POLICY people_afp_select ON public.people_afp_rates FOR SELECT TO authenticated USING (true);
REVOKE INSERT,UPDATE,DELETE ON public.people_tax_brackets FROM authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.people_afp_rates FROM authenticated;
GRANT SELECT ON public.people_tax_brackets,public.people_afp_rates TO authenticated;

INSERT INTO public.people_afp_rates(country_code,afp_name,worker_commission,effective_from,source_url,source_reference) VALUES
('CL','Capital',0.0144,'2025-10-01','https://www.spensiones.cl/portal/institucional/594/w3-propertyvalue-9897.html','Superintendencia de Pensiones — comisiones vigentes'),
('CL','Cuprum',0.0144,'2025-10-01','https://www.spensiones.cl/portal/institucional/594/w3-propertyvalue-9897.html','Superintendencia de Pensiones — comisiones vigentes'),
('CL','Habitat',0.0127,'2025-10-01','https://www.spensiones.cl/portal/institucional/594/w3-propertyvalue-9897.html','Superintendencia de Pensiones — comisiones vigentes'),
('CL','Modelo',0.0058,'2025-10-01','https://www.spensiones.cl/portal/institucional/594/w3-propertyvalue-9897.html','Superintendencia de Pensiones — comisiones vigentes'),
('CL','PlanVital',0.0116,'2025-10-01','https://www.spensiones.cl/portal/institucional/594/w3-propertyvalue-9897.html','Superintendencia de Pensiones — comisiones vigentes'),
('CL','Provida',0.0145,'2025-10-01','https://www.spensiones.cl/portal/institucional/594/w3-propertyvalue-9897.html','Superintendencia de Pensiones — comisiones vigentes'),
('CL','Uno',0.0046,'2025-10-01','https://www.spensiones.cl/portal/institucional/594/w3-propertyvalue-9897.html','Superintendencia de Pensiones — comisiones vigentes')
ON CONFLICT (country_code,afp_name,effective_from) DO UPDATE SET worker_commission=EXCLUDED.worker_commission;

INSERT INTO public.people_tax_brackets(country_code,tax_type,period_year,period_month,min_income,max_income,factor,rebate,source_url,source_reference) VALUES
('CL','IUSC',2026,9,0,968233.50,0,0,'https://www.sii.cl/valores_y_fechas/impuesto_2da_categoria/impuesto2026.htm','SII — IUSC septiembre 2026'),
('CL','IUSC',2026,9,968233.51,2151630,0.04,38729.34,'https://www.sii.cl/valores_y_fechas/impuesto_2da_categoria/impuesto2026.htm','SII — IUSC septiembre 2026'),
('CL','IUSC',2026,9,2151630.01,3586050,0.08,124794.54,'https://www.sii.cl/valores_y_fechas/impuesto_2da_categoria/impuesto2026.htm','SII — IUSC septiembre 2026'),
('CL','IUSC',2026,9,3586050.01,5020470,0.135,322027.29,'https://www.sii.cl/valores_y_fechas/impuesto_2da_categoria/impuesto2026.htm','SII — IUSC septiembre 2026'),
('CL','IUSC',2026,9,5020470.01,6454890,0.23,798971.94,'https://www.sii.cl/valores_y_fechas/impuesto_2da_categoria/impuesto2026.htm','SII — IUSC septiembre 2026'),
('CL','IUSC',2026,9,6454890.01,8606520,0.304,1276633.80,'https://www.sii.cl/valores_y_fechas/impuesto_2da_categoria/impuesto2026.htm','SII — IUSC septiembre 2026'),
('CL','IUSC',2026,9,8606520.01,22233510,0.35,1672533.72,'https://www.sii.cl/valores_y_fechas/impuesto_2da_categoria/impuesto2026.htm','SII — IUSC septiembre 2026'),
('CL','IUSC',2026,9,22233510.01,null,0.4,2784209.22,'https://www.sii.cl/valores_y_fechas/impuesto_2da_categoria/impuesto2026.htm','SII — IUSC septiembre 2026')
ON CONFLICT DO NOTHING;
