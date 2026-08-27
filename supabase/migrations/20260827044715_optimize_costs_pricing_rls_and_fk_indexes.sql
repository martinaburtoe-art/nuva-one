-- Performance hardening for the new costs/pricing surfaces.
-- Cache auth.uid()/role checks once per statement instead of once per row.
ALTER POLICY costs_select_member ON public.costs
  USING ((select private.is_business_member(business_id, (select auth.uid()))));
ALTER POLICY costs_insert_operator ON public.costs
  WITH CHECK ((select private.has_business_role(business_id, (select auth.uid()), ARRAY['owner','admin','staff']::member_role[])));
ALTER POLICY costs_update_operator ON public.costs
  USING ((select private.has_business_role(business_id, (select auth.uid()), ARRAY['owner','admin','staff']::member_role[])))
  WITH CHECK ((select private.has_business_role(business_id, (select auth.uid()), ARRAY['owner','admin','staff']::member_role[])));
ALTER POLICY costs_delete_operator ON public.costs
  USING ((select private.has_business_role(business_id, (select auth.uid()), ARRAY['owner','admin']::member_role[])));

ALTER POLICY pricing_calculations_select_member ON public.pricing_calculations
  USING ((select private.is_business_member(business_id, (select auth.uid()))));
ALTER POLICY pricing_calculations_insert_operator ON public.pricing_calculations
  WITH CHECK ((select private.has_business_role(business_id, (select auth.uid()), ARRAY['owner','admin','staff']::member_role[])));
ALTER POLICY pricing_calculations_update_operator ON public.pricing_calculations
  USING ((select private.has_business_role(business_id, (select auth.uid()), ARRAY['owner','admin','staff']::member_role[])))
  WITH CHECK ((select private.has_business_role(business_id, (select auth.uid()), ARRAY['owner','admin','staff']::member_role[])));
ALTER POLICY pricing_calculations_delete_operator ON public.pricing_calculations
  USING ((select private.has_business_role(business_id, (select auth.uid()), ARRAY['owner','admin']::member_role[])));

CREATE INDEX IF NOT EXISTS costs_cash_ledger_id_idx ON public.costs (cash_ledger_id);
CREATE INDEX IF NOT EXISTS costs_created_by_idx ON public.costs (created_by);
CREATE INDEX IF NOT EXISTS costs_product_id_idx ON public.costs (product_id);
CREATE INDEX IF NOT EXISTS costs_supplier_id_idx ON public.costs (supplier_id);
CREATE INDEX IF NOT EXISTS costs_transaction_id_idx ON public.costs (transaction_id);
CREATE INDEX IF NOT EXISTS pricing_calculations_created_by_idx ON public.pricing_calculations (created_by);
CREATE INDEX IF NOT EXISTS pricing_calculations_product_id_idx ON public.pricing_calculations (product_id);
