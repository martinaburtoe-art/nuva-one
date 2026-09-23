-- Nüva People — no exponer helpers internos como API pública.
revoke execute on function public.people_accrued_vacation_days(date,date) from public,anon,authenticated;
revoke execute on function public.people_add_holiday_days(date,numeric) from public,anon,authenticated;
revoke execute on function public.people_unpaid_absence_days(uuid,date,date) from public,anon,authenticated;
revoke execute on function public.people_valid_rut(text) from public,anon,authenticated;
revoke execute on function public.people_working_days_between(date,date) from public,anon,authenticated;