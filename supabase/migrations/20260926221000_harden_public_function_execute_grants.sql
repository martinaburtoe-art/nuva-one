-- Hardening: anon should only execute intentionally public RPCs.
-- Payroll, collections and trigger helpers already validate auth/business context
-- (or are trigger-only); direct anonymous execution is unnecessary.

begin;

revoke execute on function public.approve_people_payroll_period(uuid) from anon;
revoke execute on function public.calculate_people_vacation_balance(uuid,date) from anon;
revoke execute on function public.close_people_payroll_period(uuid) from anon;
revoke execute on function public.generate_people_liquidations(uuid) from anon;
revoke execute on function public.get_collection_priorities() from anon;
revoke execute on function public.prepare_people_lre(uuid) from anon;
revoke execute on function public.validate_people_payroll_period(uuid) from anon;
revoke execute on function public.set_cost_updated_at() from anon;
revoke execute on function public.set_pricing_calculation_updated_at() from anon;
revoke execute on function public.touch_nuva_action_queue_updated_at() from anon;
revoke execute on function public.touch_product_codes_updated_at() from anon;
revoke execute on function public.validate_nuva_action_queue_transition() from anon;

commit;
