-- Trigger helpers no deben ser una API pública.
revoke execute on function public.people_validate_afp_overlap() from public,anon,authenticated;
revoke execute on function public.people_validate_contract_timeline() from public,anon,authenticated;
revoke execute on function public.people_validate_employee_timeline() from public,anon,authenticated;
revoke execute on function public.people_validate_legal_parameter_overlap() from public,anon,authenticated;
revoke execute on function public.people_unpaid_absence_days(uuid,date,date) from anon;