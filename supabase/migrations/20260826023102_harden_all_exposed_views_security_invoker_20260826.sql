-- Exposed views are SECURITY DEFINER by default when owned by postgres.
-- Force security-invoker semantics so underlying table grants/RLS are enforced
-- for every client request. Optional views are guarded for clean-db replay.
DO $$
DECLARE
  view_name text;
BEGIN
  FOREACH view_name IN ARRAY ARRAY[
    'businesses_public',
    'payment_intents_safe',
    'v_cash_flow_daily',
    'v_financial_account_balances',
    'v_financial_cash_flow_daily',
    'v_financial_close_health',
    'v_financial_close_status',
    'v_financial_control_center',
    'v_financial_income_statement_monthly',
    'v_financial_management_pnl_monthly',
    'v_financial_management_summary',
    'v_financial_pnl_monthly',
    'v_financial_posting_health',
    'v_financial_source_reconciliation',
    'v_financial_tax_control',
    'v_financial_treasury_daily',
    'v_financial_trial_balance',
    'v_financial_vat_working_paper',
    'v_tax_control_monthly',
    'v_tax_document_summary',
    'whatsapp_connections_safe'
  ]
  LOOP
    IF to_regclass(format('public.%I', view_name)) IS NOT NULL THEN
      EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', view_name);
    END IF;
  END LOOP;
END;
$$;
