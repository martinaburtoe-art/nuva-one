-- Security follow-up: keep close-control data out of the anonymous API role.
revoke all on public.financial_close_controls from anon;
grant select, insert, update, delete on public.financial_close_controls to authenticated;
revoke all on public.v_financial_close_health from anon;
grant select on public.v_financial_close_health to authenticated;
