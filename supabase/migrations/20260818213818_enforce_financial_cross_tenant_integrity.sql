alter table public.accounting_accounts add constraint accounting_accounts_business_id_id_key unique (business_id,id);
alter table public.accounting_journals add constraint accounting_journals_business_id_id_key unique (business_id,id);
alter table public.tax_periods add constraint tax_periods_business_id_id_key unique (business_id,id);
alter table public.accounting_lines add constraint accounting_lines_business_account_fk foreign key (business_id,account_id) references public.accounting_accounts(business_id,id);
alter table public.accounting_lines add constraint accounting_lines_business_journal_fk foreign key (business_id,journal_id) references public.accounting_journals(business_id,id);
alter table public.tax_f29_returns add constraint tax_f29_business_period_fk foreign key (business_id,tax_period_id) references public.tax_periods(business_id,id);
alter table public.tax_supporting_documents add constraint tax_supporting_business_period_fk foreign key (business_id,tax_period_id) references public.tax_periods(business_id,id);
