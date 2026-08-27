revoke all on function public.sync_cost_transaction() from public;
revoke all on function public.sync_cost_transaction() from anon;
revoke all on function public.sync_cost_transaction() from authenticated;
alter function public.set_cost_updated_at() set search_path = public;
