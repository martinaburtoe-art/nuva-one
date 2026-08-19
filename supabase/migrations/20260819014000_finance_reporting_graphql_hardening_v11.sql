begin;

-- Financial reporting views are application-internal and must never be exposed
-- through the public anon role / GraphQL schema.
revoke select on public.v_financial_income_statement_monthly from anon;
revoke select on public.v_financial_trial_balance from anon;
revoke select on public.v_financial_cash_flow_daily from anon;
revoke select on public.v_financial_tax_control from anon;
revoke select on public.v_financial_management_summary from anon;

commit;
