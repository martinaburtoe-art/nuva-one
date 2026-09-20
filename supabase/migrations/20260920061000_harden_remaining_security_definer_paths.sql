-- Pin SECURITY DEFINER functions to an empty search_path.
-- Both functions use schema-qualified application tables.
alter function public.apply_purchase_effects()
  set search_path = '';

alter function public.get_platform_ai_metrics()
  set search_path = '';
