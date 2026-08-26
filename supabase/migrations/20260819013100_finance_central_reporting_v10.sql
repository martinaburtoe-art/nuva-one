begin;

-- Central financial source of truth for reporting. Views use security_invoker so
-- underlying tenant RLS remains authoritative.
create or replace view public.v_financial_income_statement_monthly
with (security_invoker = true)
as
select
  j.business_id,
  extract(year from j.entry_date)::int as year,
  extract(month from j.entry_date)::int as month,
  a.account_type,
  sum(l.debit)::numeric as debit,
  sum(l.credit)::numeric as credit,
  case
    when a.account_type in ('revenue','other_income') then sum(l.credit - l.debit)
    when a.account_type in ('expense','cost_of_sales','other_expense') then sum(l.debit - l.credit)
    else 0
  end::numeric as signed_amount
from public.accounting_journals j
join public.accounting_lines l on l.journal_id = j.id and l.business_id = j.business_id
join public.accounting_accounts a on a.id = l.account_id and a.business_id = l.business_id
where j.status = 'posted'
group by j.business_id, extract(year from j.entry_date), extract(month from j.entry_date), a.account_type;

create or replace view public.v_financial_trial_balance
with (security_invoker = true)
as
select
  j.business_id,
  a.id as account_id,
  a.code,
  a.name,
  a.account_type,
  sum(l.debit)::numeric as debit,
  sum(l.credit)::numeric as credit,
  sum(l.debit - l.credit)::numeric as net_debit,
  sum(l.credit - l.debit)::numeric as net_credit
from public.accounting_journals j
join public.accounting_lines l on l.journal_id = j.id and l.business_id = j.business_id
join public.accounting_accounts a on a.id = l.account_id and a.business_id = l.business_id
where j.status = 'posted'
group by j.business_id, a.id, a.code, a.name, a.account_type;

create or replace view public.v_financial_cash_flow_daily
with (security_invoker = true)
as
select
  t.business_id,
  t.tx_date as flow_date,
  sum(case when t.type = 'income' then t.amount else 0 end)::numeric as cash_in,
  sum(case when t.type = 'expense' then t.amount else 0 end)::numeric as cash_out,
  sum(case when t.type = 'income' then t.amount when t.type = 'expense' then -t.amount else 0 end)::numeric as net_cash,
  count(*)::bigint as transaction_count
from public.transactions t
group by t.business_id, t.tx_date;

create or replace view public.v_financial_tax_control
with (security_invoker = true)
as
select
  p.business_id,
  p.id as tax_period_id,
  p.period_year,
  p.period_month,
  p.status as period_status,
  p.due_date,
  p.filed_at,
  p.paid_at,
  p.sii_reference,
  f.id as f29_id,
  coalesce(f.sales_taxable_net,0)::numeric as sales_taxable_net,
  coalesce(f.sales_exempt_net,0)::numeric as sales_exempt_net,
  coalesce(f.debit_iva,0)::numeric as debit_iva,
  coalesce(f.credit_iva,0)::numeric as credit_iva,
  coalesce(f.credit_iva_remanent,0)::numeric as credit_iva_remanent,
  coalesce(f.iva_to_pay,0)::numeric as iva_to_pay,
  coalesce(f.ppm_base,0)::numeric as ppm_base,
  coalesce(f.ppm_rate,0)::numeric as ppm_rate,
  coalesce(f.ppm_amount,0)::numeric as ppm_amount,
  coalesce(f.withholdings,0)::numeric as withholdings,
  coalesce(f.other_taxes,0)::numeric as other_taxes,
  coalesce(f.total_to_pay,0)::numeric as total_to_pay,
  coalesce(f.total_documents,0)::int as total_documents,
  case when f.id is null then 'missing_working_paper'
       when p.filed_at is not null then 'filed'
       when p.status in ('closed','paid') or p.paid_at is not null then 'paid'
       else 'in_review' end as control_status
from public.tax_periods p
left join public.tax_f29_returns f on f.tax_period_id = p.id and f.business_id = p.business_id;

create or replace view public.v_financial_management_summary
with (security_invoker = true)
as
select
  b.id as business_id,
  coalesce((select sum(v.signed_amount) from public.v_financial_income_statement_monthly v where v.business_id=b.id and v.account_type='revenue'),0)::numeric as revenue,
  coalesce((select sum(v.signed_amount) from public.v_financial_income_statement_monthly v where v.business_id=b.id and v.account_type='cost_of_sales'),0)::numeric as cost_of_sales,
  coalesce((select sum(v.signed_amount) from public.v_financial_income_statement_monthly v where v.business_id=b.id and v.account_type in ('expense','other_expense')),0)::numeric as operating_expenses,
  coalesce((select sum(v.net_cash) from public.v_financial_cash_flow_daily v where v.business_id=b.id),0)::numeric as net_cash,
  coalesce((select count(*) from public.accounting_journals j where j.business_id=b.id and j.status='posted'),0)::bigint as posted_journals,
  coalesce((select count(*) from public.accounting_journals j where j.business_id=b.id and j.status <> 'posted'),0)::bigint as unposted_journals,
  coalesce((select count(*) from public.tax_periods p where p.business_id=b.id and p.status not in ('closed','paid')),0)::bigint as open_tax_periods
from public.businesses b;

create index if not exists idx_transactions_business_date on public.transactions (business_id, tx_date);
create index if not exists idx_accounting_journals_business_date_status on public.accounting_journals (business_id, entry_date, status);
create index if not exists idx_tax_periods_business_period on public.tax_periods (business_id, period_year, period_month);
create index if not exists idx_tax_f29_period_business on public.tax_f29_returns (business_id, tax_period_id);

commit;
