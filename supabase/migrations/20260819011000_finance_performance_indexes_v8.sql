begin;

-- Finance/Tax foreign-key indexes identified by the Supabase performance advisor.
create index if not exists idx_accounting_accounts_parent_id on public.accounting_accounts(parent_id);
create index if not exists idx_accounting_lines_account_id on public.accounting_lines(account_id);
create index if not exists idx_accounting_lines_business_journal on public.accounting_lines(business_id,journal_id);
create index if not exists idx_bank_reconciliation_sessions_statement_document_id on public.bank_reconciliation_sessions(statement_document_id);
create index if not exists idx_financial_adjustments_account_id on public.financial_adjustments(account_id);
create index if not exists idx_financial_adjustments_supporting_document_id on public.financial_adjustments(supporting_document_id);
create index if not exists idx_financial_close_controls_resolved_by on public.financial_close_controls(resolved_by);
create index if not exists idx_financial_posting_queue_accounting_journal_id on public.financial_posting_queue(accounting_journal_id);
create index if not exists idx_financial_posting_queue_reviewed_by on public.financial_posting_queue(reviewed_by);
create index if not exists idx_tax_f29_returns_business_period on public.tax_f29_returns(business_id,tax_period_id);
create index if not exists idx_tax_payments_receipt_document_id on public.tax_payments(receipt_document_id);
create index if not exists idx_tax_payments_tax_period_id on public.tax_payments(tax_period_id);
create index if not exists idx_tax_supporting_documents_tax_period_id on public.tax_supporting_documents(tax_period_id);
create index if not exists idx_tax_working_papers_supporting_document_id on public.tax_working_papers(supporting_document_id);
create index if not exists idx_tax_working_papers_tax_period_id on public.tax_working_papers(tax_period_id);

commit;
