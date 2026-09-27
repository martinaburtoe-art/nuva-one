create or replace function public.nuva_core_integrity_audit()
returns table(check_name text, failures bigint, severity text)
language sql
security definer
set search_path = public
as $$
  select * from (
    values
      ('sales_without_transaction', (select count(*) from public.sales where status='paid' and transaction_id is null), 'critical'),
      ('sales_paid_without_stock', (select count(*) from public.sales where status='paid' and coalesce(stock_applied,false)=false), 'critical'),
      ('sales_accounting_pending', (select count(*) from public.sales where status='paid' and accounting_posting_status <> 'posted'), 'high'),
      ('purchases_received_without_stock', (select count(*) from public.purchases where status='received' and coalesce(stock_applied,false)=false), 'critical'),
      ('purchases_accounting_pending', (select count(*) from public.purchases where status in ('received','paid') and accounting_posting_status <> 'posted'), 'high'),
      ('orphan_accounting_lines', (select count(*) from public.accounting_lines l left join public.accounting_journals j on j.id=l.journal_id where j.id is null), 'critical'),
      ('unbalanced_posted_journals', (select count(*) from (select j.id from public.accounting_journals j join public.accounting_lines l on l.journal_id=j.id where j.status='posted' group by j.id having abs(sum(l.debit)-sum(l.credit)) > 0.01) q), 'critical'),
      ('orphan_inventory_movements', (select count(*) from public.inventory_movements m left join public.products p on p.id=m.product_id and p.business_id=m.business_id where p.id is null), 'critical'),
      ('orphan_cash_ledger', (select count(*) from public.financial_cash_ledger c left join public.businesses b on b.id=c.business_id where b.id is null), 'critical'),
      ('action_outcome_orphans', (select count(*) from public.nuva_action_outcomes o left join public.nuva_action_queue a on a.id=o.action_id where o.action_id is not null and a.id is null), 'high'),
      ('open_critical_risks_without_action', (select count(*) from public.nuva_risks r where r.status in ('open','acknowledged') and r.severity='critical' and coalesce(r.recommended_action,'{}'::jsonb)='{}'::jsonb), 'high')
  ) as checks(check_name, failures, severity);
$$;
revoke all on function public.nuva_core_integrity_audit() from public, anon, authenticated;
comment on function public.nuva_core_integrity_audit() is 'Internal Nüva One cross-module consistency gate. Service role only; read-only audit.';
