begin;

-- Nüva One — finance integrity + tax control v3
-- Applied to production first, then committed here so schema-as-code remains aligned.

create or replace function private.guard_accounting_journal_period()
returns trigger language plpgsql security definer set search_path = public, private as $$
declare v_business_id uuid; v_entry_date date;
begin
  v_business_id := coalesce(new.business_id, old.business_id);
  v_entry_date := coalesce(new.entry_date, old.entry_date);
  if exists (select 1 from public.accounting_period_closures c where c.business_id=v_business_id and v_entry_date between c.period_start and c.period_end and c.status in ('closed','locked','finalized')) then
    raise exception 'ACCOUNTING_PERIOD_CLOSED';
  end if;
  return coalesce(new,old);
end;
$$;
revoke all on function private.guard_accounting_journal_period() from public, anon, authenticated;
drop trigger if exists trg_guard_accounting_journal_period on public.accounting_journals;
create trigger trg_guard_accounting_journal_period before insert or update or delete on public.accounting_journals for each row execute function private.guard_accounting_journal_period();

create or replace function private.validate_accounting_journal_integrity()
returns trigger language plpgsql security definer set search_path = public, private as $$
declare d numeric; c numeric; bad_business boolean;
begin
  if new.status='posted' then
    select coalesce(sum(debit),0),coalesce(sum(credit),0) into d,c from public.accounting_lines where journal_id=new.id and business_id=new.business_id;
    if round(d,2)<>round(c,2) then raise exception 'ACCOUNTING_JOURNAL_UNBALANCED'; end if;
    select exists(select 1 from public.accounting_lines l left join public.accounting_accounts a on a.id=l.account_id where l.journal_id=new.id and (a.id is null or a.business_id<>new.business_id or l.business_id<>new.business_id)) into bad_business;
    if bad_business then raise exception 'ACCOUNTING_JOURNAL_TENANT_MISMATCH'; end if;
  end if;
  return new;
end;
$$;
revoke all on function private.validate_accounting_journal_integrity() from public, anon, authenticated;
drop trigger if exists trg_validate_accounting_journal_integrity on public.accounting_journals;
create trigger trg_validate_accounting_journal_integrity after insert or update on public.accounting_journals for each row execute function private.validate_accounting_journal_integrity();

create or replace view public.v_financial_control_center with (security_invoker=true) as
with posting as (select business_id,count(*) filter(where status='pending')::int pending_postings,count(*) filter(where status='blocked')::int blocked_postings,count(*) filter(where status='posted')::int posted_postings,coalesce(sum(gross_amount) filter(where status in('pending','blocked')),0)::numeric(18,2) pending_posting_amount from public.financial_posting_queue group by business_id),
source_rec as (select business_id,count(*) filter(where status='missing_accounting_entry')::int missing_source_entries,count(*) filter(where status='linked')::int linked_source_entries,count(*)::int total_sources from public.v_financial_source_reconciliation group by business_id),
close_health as (select business_id,blocking_controls,open_controls,passed_controls,total_controls,close_readiness from public.v_financial_close_health),
tax as (select business_id,count(*) filter(where status in('planned','due','overdue','partial'))::int open_tax_payments,coalesce(sum(greatest(0,amount-coalesce(paid_amount,0))) filter(where status in('planned','due','overdue','partial')),0)::numeric(18,2) open_tax_amount from public.tax_payments group by business_id)
select b.id business_id,coalesce(p.pending_postings,0) pending_postings,coalesce(p.blocked_postings,0) blocked_postings,coalesce(p.posted_postings,0) posted_postings,coalesce(p.pending_posting_amount,0) pending_posting_amount,coalesce(r.missing_source_entries,0) missing_source_entries,coalesce(r.linked_source_entries,0) linked_source_entries,coalesce(r.total_sources,0) total_sources,coalesce(c.blocking_controls,0) blocking_controls,coalesce(c.open_controls,0) open_controls,coalesce(c.passed_controls,0) passed_controls,coalesce(c.total_controls,0) total_controls,coalesce(c.close_readiness,'not_started') close_readiness,coalesce(t.open_tax_payments,0) open_tax_payments,coalesce(t.open_tax_amount,0) open_tax_amount,case when coalesce(p.blocked_postings,0)>0 or coalesce(r.missing_source_entries,0)>0 or coalesce(c.blocking_controls,0)>0 then 'blocked' when coalesce(p.pending_postings,0)>0 or coalesce(c.open_controls,0)>0 or coalesce(t.open_tax_payments,0)>0 then 'in_review' else 'healthy' end overall_status from public.businesses b left join posting p on p.business_id=b.id left join source_rec r on r.business_id=b.id left join close_health c on c.business_id=b.id left join tax t on t.business_id=b.id;
revoke all on public.v_financial_control_center from anon;
grant select on public.v_financial_control_center to authenticated;

create or replace view public.v_financial_vat_working_paper with (security_invoker=true) as
with sales_vat as (select business_id,date_trunc('month',sale_date)::date period,coalesce(sum(total) filter(where tax_treatment='taxable'),0)::numeric(18,2) taxable_sales_gross,coalesce(sum(case when tax_treatment='taxable' then total*vat_rate/(100+vat_rate) else 0 end),0)::numeric(18,2) output_vat from public.sales where status<>'cancelled' group by business_id,date_trunc('month',sale_date)::date),
purchase_vat as (select business_id,date_trunc('month',purchase_date)::date period,coalesce(sum(total) filter(where tax_treatment='taxable'),0)::numeric(18,2) taxable_purchases_gross,coalesce(sum(case when tax_treatment='taxable' then total*vat_rate/(100+vat_rate) else 0 end),0)::numeric(18,2) input_vat from public.purchases where status<>'cancelled' group by business_id,date_trunc('month',purchase_date)::date),periods as (select business_id,period from sales_vat union select business_id,period from purchase_vat)
select x.business_id,x.period,coalesce(s.taxable_sales_gross,0)::numeric(18,2) taxable_sales_gross,coalesce(s.output_vat,0)::numeric(18,2) output_vat,coalesce(p.taxable_purchases_gross,0)::numeric(18,2) taxable_purchases_gross,coalesce(p.input_vat,0)::numeric(18,2) input_vat,round(coalesce(s.output_vat,0)-coalesce(p.input_vat,0),2)::numeric(18,2) net_vat,case when coalesce(s.output_vat,0)-coalesce(p.input_vat,0)>0 then 'payable' when coalesce(s.output_vat,0)-coalesce(p.input_vat,0)<0 then 'credit' else 'zero' end vat_position from periods x left join sales_vat s on s.business_id=x.business_id and s.period=x.period left join purchase_vat p on p.business_id=x.business_id and p.period=x.period;
revoke all on public.v_financial_vat_working_paper from anon;
grant select on public.v_financial_vat_working_paper to authenticated;

commit;
