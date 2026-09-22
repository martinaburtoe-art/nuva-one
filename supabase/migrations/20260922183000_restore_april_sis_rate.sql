-- Restore correct SIS rate transition: 1.54% Jan-Mar, 1.62% Apr onward.
UPDATE public.people_legal_parameters SET effective_to='2026-03-31'
WHERE country_code='CL' AND parameter_key='sis_rate' AND effective_from='2026-01-01';
INSERT INTO public.people_legal_parameters(country_code,parameter_key,value_numeric,effective_from,effective_to,source_url,source_reference,notes)
VALUES('CL','sis_rate',0.0162,'2026-04-01',NULL,'https://www.spensiones.cl/portal/institucional/594/w3-article-8046.html','SP — SIS vigente desde abril 2026','Tasa SIS vigente desde abril 2026; cargo empleador.')
ON CONFLICT(country_code,parameter_key,effective_from) DO UPDATE SET value_numeric=EXCLUDED.value_numeric,effective_to=EXCLUDED.effective_to,source_url=EXCLUDED.source_url,source_reference=EXCLUDED.source_reference,notes=EXCLUDED.notes;