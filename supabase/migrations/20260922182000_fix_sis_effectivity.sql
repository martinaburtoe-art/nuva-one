-- Correct SIS parameter validity window for 2026.
UPDATE public.people_legal_parameters SET effective_to='2026-03-31',notes='Tasa SIS vigente hasta marzo 2026.'
WHERE country_code='CL' AND parameter_key='sis_rate' AND effective_from='2026-01-01';
DELETE FROM public.people_legal_parameters WHERE country_code='CL' AND parameter_key='sis_rate' AND effective_from='2026-04-01' AND value_numeric=0.0162;
INSERT INTO public.people_legal_parameters(country_code,parameter_key,value_numeric,effective_from,effective_to,source_url,source_reference,notes)
VALUES('CL','sis_rate',0.0154,'2026-04-01',NULL,'https://www.spensiones.cl/inf_estadistica/iftafp/2026/03/NE-prv202603.pdf','SP — SIS vigente 2026','Tasa SIS vigente 2026; cargo empleador.')
ON CONFLICT(country_code,parameter_key,effective_from) DO UPDATE SET value_numeric=EXCLUDED.value_numeric,effective_to=EXCLUDED.effective_to,source_url=EXCLUDED.source_url,source_reference=EXCLUDED.source_reference,notes=EXCLUDED.notes;