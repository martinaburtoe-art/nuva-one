-- Nüva One — Finance operational posting v3
-- Converts finalized operational sales/purchases into traceable double-entry journals.
-- Tax treatment is explicit and configurable; default is taxable at 19% for Chilean IVA.
-- Nüva prepares and controls the accounting/tributary data; it does not file with SII.

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS tax_treatment text NOT NULL DEFAULT 'taxable',
  ADD COLUMN IF NOT EXISTS vat_rate numeric(5,2) NOT NULL DEFAULT 19,
  ADD COLUMN IF NOT EXISTS accounting_posting_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS accounting_posting_error text;

ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS tax_treatment text NOT NULL DEFAULT 'taxable',
  ADD COLUMN IF NOT EXISTS vat_rate numeric(5,2) NOT NULL DEFAULT 19,
  ADD COLUMN IF NOT EXISTS accounting_posting_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS accounting_posting_error text;

ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_tax_treatment_check;
ALTER TABLE public.purchases DROP CONSTRAINT IF EXISTS purchases_tax_treatment_check;
ALTER TABLE public.sales ADD CONSTRAINT sales_tax_treatment_check CHECK (tax_treatment IN ('taxable','exempt','non_taxable'));
ALTER TABLE public.purchases ADD CONSTRAINT purchases_tax_treatment_check CHECK (tax_treatment IN ('taxable','exempt','non_taxable'));
ALTER TABLE public.sales ADD CONSTRAINT sales_vat_rate_check CHECK (vat_rate >= 0 AND vat_rate <= 100);
ALTER TABLE public.purchases ADD CONSTRAINT purchases_vat_rate_check CHECK (vat_rate >= 0 AND vat_rate <= 100);

CREATE OR REPLACE FUNCTION public.post_sale_accounting(p_sale_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s record;
  v_journal uuid;
  v_net numeric(18,2);
  v_vat numeric(18,2);
  v_counter_key text;
  v_counter uuid;
  v_sales uuid;
  v_vat uuid;
BEGIN
  SELECT * INTO s FROM public.sales WHERE id=p_sale_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'sale not found'; END IF;
  IF s.accounting_journal_id IS NOT NULL THEN RETURN s.accounting_journal_id; END IF;
  IF s.status IN ('draft','cancelled') OR COALESCE(s.total,0) <= 0 THEN
    RETURN NULL;
  END IF;

  IF NOT private.has_business_role(s.business_id, auth.uid(), ARRAY['owner','admin','staff']::public.member_role[]) THEN
    RAISE EXCEPTION 'business write access denied';
  END IF;

  SELECT id INTO v_sales FROM public.accounting_accounts WHERE business_id=s.business_id AND system_key='sales_revenue' AND active LIMIT 1;
  SELECT id INTO v_vat FROM public.accounting_accounts WHERE business_id=s.business_id AND system_key='vat_debit' AND active LIMIT 1;
  IF v_sales IS NULL THEN RAISE EXCEPTION 'missing sales revenue account'; END IF;

  IF s.tax_treatment='taxable' AND s.vat_rate > 0 THEN
    v_net := round(s.total/(1+s.vat_rate/100),2);
    v_vat := round(s.total-v_net,2);
  ELSE
    v_net := round(s.total,2);
    v_vat := 0;
  END IF;

  IF COALESCE(s.is_credit,false) THEN
    v_counter_key := 'accounts_receivable';
  ELSIF lower(COALESCE(s.payment_method,'')) IN ('transfer','transbank','tarjeta','tarjeta_debito','tarjeta_credito','mercadopago') THEN
    v_counter_key := 'bank';
  ELSE
    v_counter_key := 'cash';
  END IF;
  SELECT id INTO v_counter FROM public.accounting_accounts WHERE business_id=s.business_id AND system_key=v_counter_key AND active LIMIT 1;
  IF v_counter IS NULL THEN RAISE EXCEPTION 'missing counter-account %',v_counter_key; END IF;
  IF v_vat > 0 AND v_vat IS NULL THEN RAISE EXCEPTION 'missing VAT account'; END IF;
  IF v_vat > 0 THEN
    SELECT id INTO v_vat FROM public.accounting_accounts WHERE business_id=s.business_id AND system_key='vat_debit' AND active LIMIT 1;
    IF v_vat IS NULL THEN RAISE EXCEPTION 'missing VAT debit account'; END IF;
  END IF;

  v_journal := public.post_financial_journal(
    s.business_id,
    COALESCE(s.sale_date,current_date),
    'Venta automática · ' || COALESCE(s.customer_name,'Cliente'),
    'sale',
    s.id,
    CASE WHEN v_vat > 0 THEN
      jsonb_build_array(
        jsonb_build_object('account_id',v_counter,'debit',round(s.total,2),'credit',0,'description','Cobro/cliente'),
        jsonb_build_object('account_id',v_sales,'debit',0,'credit',v_net,'description','Venta neta'),
        jsonb_build_object('account_id',v_vat,'debit',0,'credit',v_vat,'description','IVA débito fiscal')
      )
    ELSE
      jsonb_build_array(
        jsonb_build_object('account_id',v_counter,'debit',round(s.total,2),'credit',0,'description','Cobro/cliente'),
        jsonb_build_object('account_id',v_sales,'debit',0,'credit',v_net,'description','Venta')
      )
    END
  );

  UPDATE public.sales SET accounting_journal_id=v_journal, accounting_posting_status='posted', accounting_posting_error=NULL WHERE id=s.id;
  RETURN v_journal;
END;
$$;

CREATE OR REPLACE FUNCTION public.post_purchase_accounting(p_purchase_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p record;
  v_journal uuid;
  v_net numeric(18,2);
  v_vat numeric(18,2);
  v_debit uuid;
  v_vat_account uuid;
  v_payable uuid;
  v_system_key text;
BEGIN
  SELECT * INTO p FROM public.purchases WHERE id=p_purchase_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'purchase not found'; END IF;
  IF p.accounting_journal_id IS NOT NULL THEN RETURN p.accounting_journal_id; END IF;
  IF p.status NOT IN ('received','paid') OR COALESCE(p.total,0) <= 0 THEN RETURN NULL; END IF;
  IF NOT private.has_business_role(p.business_id, auth.uid(), ARRAY['owner','admin','staff']::public.member_role[]) THEN
    RAISE EXCEPTION 'business write access denied';
  END IF;

  v_system_key := CASE lower(COALESCE(p.category,''))
    WHEN 'mercadería para reventa' THEN 'inventory'
    WHEN 'insumos' THEN 'inventory'
    WHEN 'equipamiento' THEN 'fixed_assets'
    ELSE 'operating_expense'
  END;
  SELECT id INTO v_debit FROM public.accounting_accounts WHERE business_id=p.business_id AND system_key=v_system_key AND active LIMIT 1;
  SELECT id INTO v_vat_account FROM public.accounting_accounts WHERE business_id=p.business_id AND system_key='vat_credit' AND active LIMIT 1;
  SELECT id INTO v_payable FROM public.accounting_accounts WHERE business_id=p.business_id AND system_key='accounts_payable' AND active LIMIT 1;
  IF v_debit IS NULL OR v_payable IS NULL THEN RAISE EXCEPTION 'missing purchase accounting accounts'; END IF;

  IF p.tax_treatment='taxable' AND p.vat_rate > 0 THEN
    v_net := round(p.total/(1+p.vat_rate/100),2);
    v_vat := round(p.total-v_net,2);
  ELSE
    v_net := round(p.total,2);
    v_vat := 0;
  END IF;
  IF v_vat > 0 AND v_vat_account IS NULL THEN RAISE EXCEPTION 'missing VAT credit account'; END IF;

  v_journal := public.post_financial_journal(
    p.business_id,
    COALESCE(p.purchase_date,current_date),
    'Compra automática · ' || COALESCE(p.supplier_name,'Proveedor'),
    'purchase',
    p.id,
    CASE WHEN v_vat > 0 THEN
      jsonb_build_array(
        jsonb_build_object('account_id',v_debit,'debit',v_net,'credit',0,'description',COALESCE(p.category,'Compra')),
        jsonb_build_object('account_id',v_vat_account,'debit',v_vat,'credit',0,'description','IVA crédito fiscal'),
        jsonb_build_object('account_id',v_payable,'debit',0,'credit',round(p.total,2),'description','Proveedor')
      )
    ELSE
      jsonb_build_array(
        jsonb_build_object('account_id',v_debit,'debit',v_net,'credit',0,'description',COALESCE(p.category,'Compra')),
        jsonb_build_object('account_id',v_payable,'debit',0,'credit',round(p.total,2),'description','Proveedor')
      )
    END
  );
  UPDATE public.purchases SET accounting_journal_id=v_journal, accounting_posting_status='posted', accounting_posting_error=NULL WHERE id=p.id;
  RETURN v_journal;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_post_sale_accounting()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status OR NEW.accounting_journal_id IS NULL THEN
    PERFORM public.post_sale_accounting(NEW.id);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  UPDATE public.sales SET accounting_posting_status='error', accounting_posting_error=left(SQLERRM,500) WHERE id=NEW.id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_post_purchase_accounting()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status OR NEW.accounting_journal_id IS NULL THEN
    PERFORM public.post_purchase_accounting(NEW.id);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  UPDATE public.purchases SET accounting_posting_status='error', accounting_posting_error=left(SQLERRM,500) WHERE id=NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sales_accounting_auto_post ON public.sales;
CREATE TRIGGER sales_accounting_auto_post
AFTER INSERT OR UPDATE OF status,total,payment_method,is_credit,tax_treatment,vat_rate ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.trg_post_sale_accounting();

DROP TRIGGER IF EXISTS purchases_accounting_auto_post ON public.purchases;
CREATE TRIGGER purchases_accounting_auto_post
AFTER INSERT OR UPDATE OF status,total,category,tax_treatment,vat_rate ON public.purchases
FOR EACH ROW EXECUTE FUNCTION public.trg_post_purchase_accounting();

REVOKE EXECUTE ON FUNCTION public.post_sale_accounting(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.post_purchase_accounting(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_sale_accounting(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.post_purchase_accounting(uuid) TO authenticated;

-- Backfill only finalized operational documents. Errors remain visible for review.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.sales WHERE status NOT IN ('draft','cancelled') AND accounting_journal_id IS NULL LOOP
    BEGIN PERFORM public.post_sale_accounting(r.id); EXCEPTION WHEN OTHERS THEN UPDATE public.sales SET accounting_posting_status='error',accounting_posting_error=left(SQLERRM,500) WHERE id=r.id; END;
  END LOOP;
  FOR r IN SELECT id FROM public.purchases WHERE status IN ('received','paid') AND accounting_journal_id IS NULL LOOP
    BEGIN PERFORM public.post_purchase_accounting(r.id); EXCEPTION WHEN OTHERS THEN UPDATE public.purchases SET accounting_posting_status='error',accounting_posting_error=left(SQLERRM,500) WHERE id=r.id; END;
  END LOOP;
END $$;

CREATE OR REPLACE VIEW public.v_financial_posting_health WITH (security_invoker=true) AS
SELECT business_id,
  count(*) FILTER (WHERE accounting_posting_status='posted') AS posted,
  count(*) FILTER (WHERE accounting_posting_status='pending') AS pending,
  count(*) FILTER (WHERE accounting_posting_status='error') AS errors
FROM (
  SELECT business_id, accounting_posting_status FROM public.sales
  UNION ALL
  SELECT business_id, accounting_posting_status FROM public.purchases
) x GROUP BY business_id;

GRANT SELECT ON public.v_financial_posting_health TO authenticated;
