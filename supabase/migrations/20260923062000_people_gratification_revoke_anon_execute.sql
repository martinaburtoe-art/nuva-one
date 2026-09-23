-- Hardening: annual gratification settlement must never be callable by anonymous clients.
revoke execute on function public.calculate_people_gratification_settlement(uuid, integer) from anon;
revoke execute on function public.calculate_people_gratification_settlement(uuid, integer) from public;
grant execute on function public.calculate_people_gratification_settlement(uuid, integer) to authenticated;
