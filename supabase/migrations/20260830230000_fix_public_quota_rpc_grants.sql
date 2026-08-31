-- Fix Nüva Studio quota RPC execution grants.
-- The public wrappers are the PostgREST-facing functions used by /api/studio.
-- The previous migration revoked PUBLIC but failed to grant EXECUTE to authenticated,
-- so valid sessions reached the RPC and received a permission error that was masked as
-- "No se pudo validar el uso disponible.".

REVOKE ALL ON FUNCTION public.reserve_ai_tool_quota(uuid, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_ai_tool_quota(uuid, text, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.reserve_ai_tool_quota(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_ai_tool_quota(uuid, text, integer) TO authenticated;
