-- Private Owner Console privileged RPCs are invoked only by the owner-metrics Edge Function
-- through the service role. Do not expose these platform-wide aggregates as client-callable RPCs.
revoke execute on function public.get_platform_ai_metrics() from public, anon, authenticated;
revoke execute on function public.get_platform_owner_metrics() from public, anon, authenticated;
grant execute on function public.get_platform_ai_metrics() to service_role;
grant execute on function public.get_platform_owner_metrics() to service_role;
