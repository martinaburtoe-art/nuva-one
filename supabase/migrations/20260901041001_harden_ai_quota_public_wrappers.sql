-- The public RPC wrappers only delegate to private SECURITY DEFINER functions.
-- Keep the exposed wrappers SECURITY INVOKER so authenticated clients do not
-- receive a directly executable SECURITY DEFINER surface.

CREATE OR REPLACE FUNCTION public.reserve_ai_tool_quota(
  p_business_id uuid,
  p_tool_id text,
  p_units integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public', 'private'
AS $function$
BEGIN
  RETURN private.reserve_ai_tool_quota(p_business_id, p_tool_id, p_units);
END;
$function$;

CREATE OR REPLACE FUNCTION public.release_ai_tool_quota(
  p_business_id uuid,
  p_tool_id text,
  p_units integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public', 'private'
AS $function$
BEGIN
  PERFORM private.release_ai_tool_quota(p_business_id, p_tool_id, p_units);
END;
$function$;
