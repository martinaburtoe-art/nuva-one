alter view public.v_financial_account_balances set (security_invoker = true);
alter view public.v_tax_document_summary set (security_invoker = true);
revoke all on public.v_financial_account_balances from anon;
revoke all on public.v_tax_document_summary from anon;
grant select on public.v_financial_account_balances to authenticated;
grant select on public.v_tax_document_summary to authenticated;
