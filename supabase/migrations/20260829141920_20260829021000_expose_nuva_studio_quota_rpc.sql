CREATE OR REPLACE FUNCTION public.reserve_ai_tool_quota(
  p_business_id uuid,
  p_tool_id text,
  p_units integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  RETURN private.reserve_ai_tool_quota(p_business_id, p_tool_id, p_units);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_ai_tool_quota(
  p_business_id uuid,
  p_tool_id text,
  p_units integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  PERFORM private.release_ai_tool_quota(p_business_id, p_tool_id, p_units);
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_ai_tool_quota(uuid, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_ai_tool_quota(uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_ai_tool_quota(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_ai_tool_quota(uuid, text, integer) TO authenticated;
