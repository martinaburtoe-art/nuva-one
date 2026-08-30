INSERT INTO public.ai_tool_registry
  (id, label, capability, provider, model, cost_units, plans, daily_limit, monthly_limit, description)
VALUES
  ('studio.strategy','Nüva Strategy','strategy','google','gemini-3.1-pro-preview',3,ARRAY['free','pro','business','enterprise'],5,30,'Diagnóstico y prioridades estratégicas.'),
  ('studio.document','Nüva Documents','document','google','gemini-3.1-pro-preview',2,ARRAY['free','pro','business','enterprise'],5,30,'Documentos empresariales y reportes.'),
  ('studio.image_edit','Nüva Creative Edit','image_edit','google','gemini-3.1-flash-image',5,ARRAY['free','pro','business','enterprise'],2,10,'Edición y transformación de imágenes.')
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  capability = EXCLUDED.capability,
  provider = EXCLUDED.provider,
  model = EXCLUDED.model,
  cost_units = EXCLUDED.cost_units,
  plans = EXCLUDED.plans,
  daily_limit = EXCLUDED.daily_limit,
  monthly_limit = EXCLUDED.monthly_limit,
  description = EXCLUDED.description,
  updated_at = now();
