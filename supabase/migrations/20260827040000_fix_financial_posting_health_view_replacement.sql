-- Nüva One — fix incompatible replacement of v_financial_posting_health
-- PostgreSQL cannot CREATE OR REPLACE VIEW when the new definition removes or
-- reorders existing columns. The previous posting v1 view exposed
-- pending_count/blocked_count/posted_count/pending_amount/last_queued_at,
-- while posting v3 attempted a different column contract. Drop/recreate is
-- intentional here because this is a schema contract change.
begin;

-- Recreate the view atomically as a new contract. There are currently no
-- downstream database objects that depend on this view; application callers
-- consume it by column name.
drop view if exists public.v_financial_posting_health;

create view public.v_financial_posting_health
with (security_invoker = true)
as
select
  x.business_id,
  count(*) filter (where x.accounting_posting_status = 'posted')::integer as posted,
  count(*) filter (where x.accounting_posting_status = 'pending')::integer as pending,
  count(*) filter (where x.accounting_posting_status = 'error')::integer as errors
from (
  select business_id, accounting_posting_status from public.sales
  union all
  select business_id, accounting_posting_status from public.purchases
) x
group by x.business_id;

revoke all on public.v_financial_posting_health from public, anon;
grant select on public.v_financial_posting_health to authenticated;

commit;
