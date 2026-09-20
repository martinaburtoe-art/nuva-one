-- Reconcile the production migration version recorded for remaining
-- SECURITY DEFINER search_path hardening.
alter function public.apply_purchase_effects()
  set search_path = '';

alter function public.get_platform_ai_metrics()
  set search_path = '';
