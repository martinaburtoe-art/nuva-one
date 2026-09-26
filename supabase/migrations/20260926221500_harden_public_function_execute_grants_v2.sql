-- PUBLIC is inherited by anon, so revoke EXECUTE from PUBLIC first.
-- Keep only the intentionally public catalog RPC anonymous.

begin;

revoke execute on function public.approve_people_payroll_period(uuid) from public;
revoke execute on function public.calculate_people_vacation_balance(uuid,date) from public;
revoke execute on function public.close_people_payroll_period(uuid) from public;
revoke execute on function public.generate_people_liquidations(uuid) from public;
revoke execute on function public.get_collection_priorities() from public;
revoke execute on function public.prepare_people_lre(uuid) from public;
revoke execute on function public.validate_people_payroll_period(uuid) from public;
revoke execute on function public.set_cost_updated_at() from public;
revoke execute on function public.set_pricing_calculation_updated_at() from public;
revoke execute on function public.touch_nuva_action_queue_updated_at() from public;
revoke execute on function public.touch_product_codes_updated_at() from public;
revoke execute on function public.validate_nuva_action_queue_transition() from public;

grant execute on function public.approve_people_payroll_period(uuid) to authenticated;
grant execute on function public.calculate_people_vacation_balance(uuid,date) to authenticated;
grant execute on function public.close_people_payroll_period(uuid) to authenticated;
grant execute on function public.generate_people_liquidations(uuid) to authenticated;
grant execute on function public.get_collection_priorities() to authenticated;
grant execute on function public.prepare_people_lre(uuid) to authenticated;
grant execute on function public.validate_people_payroll_period(uuid) to authenticated;

commit;
