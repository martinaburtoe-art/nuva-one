begin;

-- Keep finance RLS tenant-safe while avoiding broad ALL policies that also
-- participate in SELECT evaluation. Write permissions are now explicit per command.

drop policy if exists "Staff write accounting_accounts" on public.accounting_accounts;
create policy "Staff insert accounting_accounts" on public.accounting_accounts for insert to authenticated with check (private.has_business_role(business_id,(select auth.uid()),array['owner','admin','staff']::public.member_role[]));
create policy "Staff update accounting_accounts" on public.accounting_accounts for update to authenticated using (private.has_business_role(business_id,(select auth.uid()),array['owner','admin','staff']::public.member_role[])) with check (private.has_business_role(business_id,(select auth.uid()),array['owner','admin','staff']::public.member_role[]));
create policy "Staff delete accounting_accounts" on public.accounting_accounts for delete to authenticated using (private.has_business_role(business_id,(select auth.uid()),array['owner','admin','staff']::public.member_role[]));

drop policy if exists "Staff write accounting_journals" on public.accounting_journals;
create policy "Staff insert accounting_journals" on public.accounting_journals for insert to authenticated with check (private.has_business_role(business_id,(select auth.uid()),array['owner','admin','staff']::public.member_role[]));
create policy "Staff update accounting_journals" on public.accounting_journals for update to authenticated using (private.has_business_role(business_id,(select auth.uid()),array['owner','admin','staff']::public.member_role[])) with check (private.has_business_role(business_id,(select auth.uid()),array['owner','admin','staff']::public.member_role[]));
create policy "Staff delete accounting_journals" on public.accounting_journals for delete to authenticated using (private.has_business_role(business_id,(select auth.uid()),array['owner','admin','staff']::public.member_role[]));

drop policy if exists "Staff write accounting_lines" on public.accounting_lines;
create policy "Staff insert accounting_lines" on public.accounting_lines for insert to authenticated with check (private.has_business_role(business_id,(select auth.uid()),array['owner','admin','staff']::public.member_role[]));
create policy "Staff update accounting_lines" on public.accounting_lines for update to authenticated using (private.has_business_role(business_id,(select auth.uid()),array['owner','admin','staff']::public.member_role[])) with check (private.has_business_role(business_id,(select auth.uid()),array['owner','admin','staff']::public.member_role[]));
create policy "Staff delete accounting_lines" on public.accounting_lines for delete to authenticated using (private.has_business_role(business_id,(select auth.uid()),array['owner','admin','staff']::public.member_role[]));

drop policy if exists "Staff manage cash_flow_forecasts" on public.cash_flow_forecasts;
create policy "Staff insert cash_flow_forecasts" on public.cash_flow_forecasts for insert to authenticated with check (private.has_business_role(business_id,(select auth.uid()),array['owner','admin','staff']::public.member_role[]));
create policy "Staff update cash_flow_forecasts" on public.cash_flow_forecasts for update to authenticated using (private.has_business_role(business_id,(select auth.uid()),array['owner','admin','staff']::public.member_role[])) with check (private.has_business_role(business_id,(select auth.uid()),array['owner','admin','staff']::public.member_role[]));
create policy "Staff delete cash_flow_forecasts" on public.cash_flow_forecasts for delete to authenticated using (private.has_business_role(business_id,(select auth.uid()),array['owner','admin','staff']::public.member_role[]));

drop policy if exists bank_reconciliation_select on public.bank_reconciliation_sessions;
drop policy if exists bank_reconciliation_write on public.bank_reconciliation_sessions;
create policy bank_reconciliation_select on public.bank_reconciliation_sessions for select to authenticated using (private.is_business_member(business_id,(select auth.uid())));
create policy bank_reconciliation_insert on public.bank_reconciliation_sessions for insert to authenticated with check (private.has_business_role(business_id,(select auth.uid()),array['owner','admin']::public.member_role[]));
create policy bank_reconciliation_update on public.bank_reconciliation_sessions for update to authenticated using (private.has_business_role(business_id,(select auth.uid()),array['owner','admin']::public.member_role[])) with check (private.has_business_role(business_id,(select auth.uid()),array['owner','admin']::public.member_role[]));
create policy bank_reconciliation_delete on public.bank_reconciliation_sessions for delete to authenticated using (private.has_business_role(business_id,(select auth.uid()),array['owner','admin']::public.member_role[]));

drop policy if exists financial_adjustments_select on public.financial_adjustments;
drop policy if exists financial_adjustments_write on public.financial_adjustments;
create policy financial_adjustments_select on public.financial_adjustments for select to authenticated using (private.is_business_member(business_id,(select auth.uid())));
create policy financial_adjustments_insert on public.financial_adjustments for insert to authenticated with check (private.has_business_role(business_id,(select auth.uid()),array['owner','admin']::public.member_role[]));
create policy financial_adjustments_update on public.financial_adjustments for update to authenticated using (private.has_business_role(business_id,(select auth.uid()),array['owner','admin']::public.member_role[])) with check (private.has_business_role(business_id,(select auth.uid()),array['owner','admin']::public.member_role[]));
create policy financial_adjustments_delete on public.financial_adjustments for delete to authenticated using (private.has_business_role(business_id,(select auth.uid()),array['owner','admin']::public.member_role[]));

drop policy if exists financial_close_select on public.financial_close_checklist;
drop policy if exists financial_close_write on public.financial_close_checklist;
create policy financial_close_select on public.financial_close_checklist for select to authenticated using (private.is_business_member(business_id,(select auth.uid())));
create policy financial_close_insert on public.financial_close_checklist for insert to authenticated with check (private.has_business_role(business_id,(select auth.uid()),array['owner','admin']::public.member_role[]));
create policy financial_close_update on public.financial_close_checklist for update to authenticated using (private.has_business_role(business_id,(select auth.uid()),array['owner','admin']::public.member_role[])) with check (private.has_business_role(business_id,(select auth.uid()),array['owner','admin']::public.member_role[]));
create policy financial_close_delete on public.financial_close_checklist for delete to authenticated using (private.has_business_role(business_id,(select auth.uid()),array['owner','admin']::public.member_role[]));

drop policy if exists financial_reconciliation_select on public.financial_reconciliation_items;
drop policy if exists financial_reconciliation_write on public.financial_reconciliation_items;
create policy financial_reconciliation_select on public.financial_reconciliation_items for select to authenticated using (private.is_business_member(business_id,(select auth.uid())));
create policy financial_reconciliation_insert on public.financial_reconciliation_items for insert to authenticated with check (private.has_business_role(business_id,(select auth.uid()),array['owner','admin']::public.member_role[]));
create policy financial_reconciliation_update on public.financial_reconciliation_items for update to authenticated using (private.has_business_role(business_id,(select auth.uid()),array['owner','admin']::public.member_role[])) with check (private.has_business_role(business_id,(select auth.uid()),array['owner','admin']::public.member_role[]));
create policy financial_reconciliation_delete on public.financial_reconciliation_items for delete to authenticated using (private.has_business_role(business_id,(select auth.uid()),array['owner','admin']::public.member_role[]));

drop policy if exists tax_payments_select on public.tax_payments;
drop policy if exists tax_payments_write on public.tax_payments;
create policy tax_payments_select on public.tax_payments for select to authenticated using (private.is_business_member(business_id,(select auth.uid())));
create policy tax_payments_insert on public.tax_payments for insert to authenticated with check (private.has_business_role(business_id,(select auth.uid()),array['owner','admin']::public.member_role[]));
create policy tax_payments_update on public.tax_payments for update to authenticated using (private.has_business_role(business_id,(select auth.uid()),array['owner','admin']::public.member_role[])) with check (private.has_business_role(business_id,(select auth.uid()),array['owner','admin']::public.member_role[]));
create policy tax_payments_delete on public.tax_payments for delete to authenticated using (private.has_business_role(business_id,(select auth.uid()),array['owner','admin']::public.member_role[]));

drop policy if exists tax_working_papers_select on public.tax_working_papers;
drop policy if exists tax_working_papers_write on public.tax_working_papers;
create policy tax_working_papers_select on public.tax_working_papers for select to authenticated using (private.is_business_member(business_id,(select auth.uid())));
create policy tax_working_papers_insert on public.tax_working_papers for insert to authenticated with check (private.has_business_role(business_id,(select auth.uid()),array['owner','admin']::public.member_role[]));
create policy tax_working_papers_update on public.tax_working_papers for update to authenticated using (private.has_business_role(business_id,(select auth.uid()),array['owner','admin']::public.member_role[])) with check (private.has_business_role(business_id,(select auth.uid()),array['owner','admin']::public.member_role[]));
create policy tax_working_papers_delete on public.tax_working_papers for delete to authenticated using (private.has_business_role(business_id,(select auth.uid()),array['owner','admin']::public.member_role[]));

commit;
