-- Quota reservation/release is a server-side concern. Client roles must not be able to call
-- these SECURITY DEFINER functions directly with an arbitrary business_id.
revoke execute on function public.reserve_ai_tool_quota(uuid, text, integer) from authenticated, anon;
revoke execute on function public.release_ai_tool_quota(uuid, text, integer) from authenticated, anon;
