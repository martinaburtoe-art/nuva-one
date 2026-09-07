-- Prevent the plan-limits view from bypassing underlying table RLS.
-- The view is exposed through PostgREST, so it must execute with invoker privileges.
alter view public.business_plan_limits set (security_invoker = true);
