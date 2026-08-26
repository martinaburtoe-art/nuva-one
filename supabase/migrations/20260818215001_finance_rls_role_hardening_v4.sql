begin;

do $$
declare r record;
begin
  for r in select tablename, policyname from pg_policies where schemaname='public' and tablename in (
    'accounting_accounts','accounting_journals','accounting_lines','accounting_period_closures',
    'bank_reconciliation_sessions','cash_flow_forecasts','financial_adjustments','financial_close_checklist',
    'financial_reconciliation_items','tax_annual_returns','tax_f29_returns','tax_payments','tax_periods',
    'tax_profiles','tax_supporting_documents','tax_working_papers'
  ) and 'public'=any(roles)
  loop
    execute format('alter policy %I on public.%I to authenticated', r.policyname, r.tablename);
  end loop;
end $$;

revoke all on public.v_financial_control_center from anon;
revoke all on public.v_financial_vat_working_paper from anon;
grant select on public.v_financial_control_center to authenticated;
grant select on public.v_financial_vat_working_paper to authenticated;

commit;
