-- pgTAP regression test for the security hardening applied this session:
-- trigger-only SECURITY DEFINER functions must not be directly callable via
-- PostgREST's auto-exposed /rest/v1/rpc/<fn> endpoint by anon/authenticated,
-- and public.audit_log must not accept direct writes from those roles either
-- (all legitimate writes go through the log_audit_action trigger, which runs
-- with the table owner's privileges regardless of the caller's grants).
--
-- Run with: supabase test db
begin;
select plan(11);

-- Trigger-only functions: nobody but the table owner (via the trigger) or
-- service_role should be able to invoke these directly.
select ok(
  not has_function_privilege('authenticated', 'public.apply_sale_effects()', 'EXECUTE'),
  'authenticated cannot directly call apply_sale_effects()'
);
select ok(
  not has_function_privilege('anon', 'public.apply_sale_effects()', 'EXECUTE'),
  'anon cannot directly call apply_sale_effects()'
);
select ok(
  not has_function_privilege('authenticated', 'public.enforce_product_plan_limit()', 'EXECUTE'),
  'authenticated cannot directly call enforce_product_plan_limit()'
);
select ok(
  not has_function_privilege('anon', 'public.enforce_product_plan_limit()', 'EXECUTE'),
  'anon cannot directly call enforce_product_plan_limit()'
);
select ok(
  not has_function_privilege('authenticated', 'public.log_audit_action()', 'EXECUTE'),
  'authenticated cannot directly call log_audit_action()'
);
select ok(
  not has_function_privilege('anon', 'public.log_audit_action()', 'EXECUTE'),
  'anon cannot directly call log_audit_action()'
);

-- increment_ai_usage and check_rate_limit ARE meant to be called -- but only
-- by server code using the service-role client, never with the end user's
-- own JWT/anon key.
select ok(
  not has_function_privilege('authenticated', 'public.increment_ai_usage(uuid, integer)', 'EXECUTE'),
  'authenticated cannot directly call increment_ai_usage()'
);
select ok(
  not has_function_privilege('anon', 'public.increment_ai_usage(uuid, integer)', 'EXECUTE'),
  'anon cannot directly call increment_ai_usage()'
);
select ok(
  not has_function_privilege('authenticated', 'public.check_rate_limit(text, integer, integer)', 'EXECUTE'),
  'authenticated cannot directly call check_rate_limit()'
);

-- audit_log: SELECT is governed by RLS (owner/admin only, see policy
-- "Admins read audit_log"), but INSERT/UPDATE/DELETE should be impossible
-- for authenticated/anon at the grant level, full stop -- the audit trail
-- is only trustworthy if a compromised staff account can't tamper with it.
select ok(
  not has_table_privilege('authenticated', 'public.audit_log', 'INSERT'),
  'authenticated cannot INSERT into audit_log directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.audit_log', 'DELETE'),
  'authenticated cannot DELETE from audit_log directly'
);

select * from finish();
rollback;
