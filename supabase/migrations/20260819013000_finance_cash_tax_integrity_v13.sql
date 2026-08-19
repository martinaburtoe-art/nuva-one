BEGIN;

CREATE TABLE IF NOT EXISTS public.financial_cash_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inflow','outflow')),
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  category text NOT NULL,
  description text,
  payment_method text,
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT financial_cash_ledger_source_uq UNIQUE (business_id, source_type, source_id)
);
CREATE INDEX IF NOT EXISTS financial_cash_ledger_business_date_idx ON public.financial_cash_ledger(business_id, entry_date);
CREATE INDEX IF NOT EXISTS financial_cash_ledger_source_idx ON public.financial_cash_ledger(source_type, source_id);
ALTER TABLE public.financial_cash_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS financial_cash_ledger_select ON public.financial_cash_ledger;
CREATE POLICY financial_cash_ledger_select ON public.financial_cash_ledger FOR SELECT TO authenticated USING (private.is_business_member(business_id, auth.uid()));
DROP POLICY IF EXISTS financial_cash_ledger_write ON public.financial_cash_ledger;
CREATE POLICY financial_cash_ledger_write ON public.financial_cash_ledger FOR ALL TO authenticated USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner','admin','staff']::public.member_role[])) WITH CHECK (private.has_business_role(business_id, auth.uid(), ARRAY['owner','admin','staff']::public.member_role[]));
REVOKE ALL ON public.financial_cash_ledger FROM anon;

CREATE OR REPLACE FUNCTION private.sync_transaction_cash_ledger() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    DELETE FROM public.financial_cash_ledger WHERE business_id=OLD.business_id AND source_type='transaction' AND source_id=OLD.id;
    RETURN OLD;
  END IF;
  DELETE FROM public.financial_cash_ledger WHERE business_id=NEW.business_id AND source_type='transaction' AND source_id=NEW.id;
  IF COALESCE(NEW.amount,0)>0 THEN
    INSERT INTO public.financial_cash_ledger(business_id,entry_date,direction,amount,category,description,payment_method,source_type,source_id)
    VALUES(NEW.business_id,NEW.tx_date,CASE WHEN NEW.type='income' THEN 'inflow' ELSE 'outflow' END,NEW.amount,COALESCE(NEW.category,'Otro'),NEW.description,NULL,'transaction',NEW.id)
    ON CONFLICT(business_id,source_type,source_id) DO UPDATE SET entry_date=excluded.entry_date,direction=excluded.direction,amount=excluded.amount,category=excluded.category,description=excluded.description,updated_at=now();
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION private.sync_sale_cash_ledger() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  DELETE FROM public.financial_cash_ledger WHERE business_id=COALESCE(NEW.business_id,OLD.business_id) AND source_type='sale' AND source_id=COALESCE(NEW.id,OLD.id);
  IF TG_OP<>'DELETE' AND NEW.status='paid' AND COALESCE(NEW.total,0)>0 AND NOT COALESCE(NEW.is_credit,false)
     AND NOT EXISTS(SELECT 1 FROM public.payments p WHERE p.business_id=NEW.business_id AND p.sale_id=NEW.id) THEN
    INSERT INTO public.financial_cash_ledger(business_id,entry_date,direction,amount,category,description,payment_method,source_type,source_id)
    VALUES(NEW.business_id,NEW.sale_date,'inflow',NEW.total,'Venta','Venta pagada · '||COALESCE(NEW.customer_name,'Cliente'),NEW.payment_method,'sale',NEW.id)
    ON CONFLICT(business_id,source_type,source_id) DO UPDATE SET entry_date=excluded.entry_date,amount=excluded.amount,category=excluded.category,description=excluded.description,payment_method=excluded.payment_method,updated_at=now();
  END IF;
  RETURN COALESCE(NEW,OLD);
END; $$;

CREATE OR REPLACE FUNCTION private.sync_payment_cash_ledger() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    DELETE FROM public.financial_cash_ledger WHERE business_id=OLD.business_id AND source_type='payment' AND source_id=OLD.id;
    RETURN OLD;
  END IF;
  DELETE FROM public.financial_cash_ledger WHERE business_id=NEW.business_id AND source_type='payment' AND source_id=NEW.id;
  IF COALESCE(NEW.amount,0)>0 THEN
    INSERT INTO public.financial_cash_ledger(business_id,entry_date,direction,amount,category,description,payment_method,source_type,source_id)
    VALUES(NEW.business_id,NEW.paid_at::date,'inflow',NEW.amount,'Cobranza','Cobro de venta',NEW.method,'payment',NEW.id)
    ON CONFLICT(business_id,source_type,source_id) DO UPDATE SET entry_date=excluded.entry_date,amount=excluded.amount,description=excluded.description,payment_method=excluded.payment_method,updated_at=now();
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION private.sync_purchase_cash_ledger() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  DELETE FROM public.financial_cash_ledger WHERE business_id=COALESCE(NEW.business_id,OLD.business_id) AND source_type='purchase' AND source_id=COALESCE(NEW.id,OLD.id);
  IF TG_OP<>'DELETE' AND NEW.status='paid' AND COALESCE(NEW.total,0)>0 THEN
    INSERT INTO public.financial_cash_ledger(business_id,entry_date,direction,amount,category,description,payment_method,source_type,source_id)
    VALUES(NEW.business_id,NEW.purchase_date,'outflow',NEW.total,COALESCE(NEW.category,'Compra'),'Pago de compra · '||COALESCE(NEW.supplier_name,'Proveedor'),NULL,'purchase',NEW.id)
    ON CONFLICT(business_id,source_type,source_id) DO UPDATE SET entry_date=excluded.entry_date,amount=excluded.amount,category=excluded.category,description=excluded.description,updated_at=now();
  END IF;
  RETURN COALESCE(NEW,OLD);
END; $$;

DROP TRIGGER IF EXISTS trg_sync_transaction_cash_ledger ON public.transactions;
CREATE TRIGGER trg_sync_transaction_cash_ledger AFTER INSERT OR UPDATE OR DELETE ON public.transactions FOR EACH ROW EXECUTE FUNCTION private.sync_transaction_cash_ledger();
DROP TRIGGER IF EXISTS trg_sync_sale_cash_ledger ON public.sales;
CREATE TRIGGER trg_sync_sale_cash_ledger AFTER INSERT OR UPDATE OR DELETE ON public.sales FOR EACH ROW EXECUTE FUNCTION private.sync_sale_cash_ledger();
DROP TRIGGER IF EXISTS trg_sync_payment_cash_ledger ON public.payments;
CREATE TRIGGER trg_sync_payment_cash_ledger AFTER INSERT OR UPDATE OR DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION private.sync_payment_cash_ledger();
DROP TRIGGER IF EXISTS trg_sync_purchase_cash_ledger ON public.purchases;
CREATE TRIGGER trg_sync_purchase_cash_ledger AFTER INSERT OR UPDATE OR DELETE ON public.purchases FOR EACH ROW EXECUTE FUNCTION private.sync_purchase_cash_ledger();
REVOKE ALL ON FUNCTION private.sync_transaction_cash_ledger() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.sync_sale_cash_ledger() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.sync_payment_cash_ledger() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.sync_purchase_cash_ledger() FROM PUBLIC, anon, authenticated;

INSERT INTO public.financial_cash_ledger(business_id,entry_date,direction,amount,category,description,payment_method,source_type,source_id)
SELECT s.business_id,s.sale_date,'inflow',s.total,'Venta','Venta pagada · '||COALESCE(s.customer_name,'Cliente'),s.payment_method,'sale',s.id
FROM public.sales s
WHERE s.status='paid' AND COALESCE(s.total,0)>0 AND NOT COALESCE(s.is_credit,false)
  AND NOT EXISTS(SELECT 1 FROM public.payments p WHERE p.business_id=s.business_id AND p.sale_id=s.id)
ON CONFLICT DO NOTHING;
INSERT INTO public.financial_cash_ledger(business_id,entry_date,direction,amount,category,description,payment_method,source_type,source_id)
SELECT p.business_id,p.paid_at::date,'inflow',p.amount,'Cobranza','Cobro de venta',p.method,'payment',p.id
FROM public.payments p WHERE p.amount>0 ON CONFLICT DO NOTHING;
INSERT INTO public.financial_cash_ledger(business_id,entry_date,direction,amount,category,description,payment_method,source_type,source_id)
SELECT p.business_id,p.purchase_date,'outflow',p.total,COALESCE(p.category,'Compra'),'Pago de compra · '||COALESCE(p.supplier_name,'Proveedor'),NULL,'purchase',p.id
FROM public.purchases p WHERE p.status='paid' AND COALESCE(p.total,0)>0 ON CONFLICT DO NOTHING;
INSERT INTO public.financial_cash_ledger(business_id,entry_date,direction,amount,category,description,payment_method,source_type,source_id)
SELECT t.business_id,t.tx_date,CASE WHEN t.type='income' THEN 'inflow' ELSE 'outflow' END,t.amount,COALESCE(t.category,'Otro'),t.description,NULL,'transaction',t.id
FROM public.transactions t WHERE COALESCE(t.amount,0)>0 ON CONFLICT DO NOTHING;

CREATE OR REPLACE VIEW public.v_financial_cash_flow_daily WITH(security_invoker=true) AS
SELECT business_id,entry_date AS flow_date,
COALESCE(SUM(amount) FILTER(WHERE direction='inflow'),0) AS cash_in,
COALESCE(SUM(amount) FILTER(WHERE direction='outflow'),0) AS cash_out,
(COALESCE(SUM(amount) FILTER(WHERE direction='inflow'),0)-COALESCE(SUM(amount) FILTER(WHERE direction='outflow'),0)) AS net_cash,
COUNT(*)::bigint AS transaction_count
FROM public.financial_cash_ledger GROUP BY business_id,entry_date;

CREATE OR REPLACE VIEW public.v_financial_treasury_daily WITH(security_invoker=true) AS
WITH actual AS(
SELECT business_id,entry_date AS flow_date,
COALESCE(SUM(amount) FILTER(WHERE direction='inflow'),0)::numeric(18,2) AS inflow,
COALESCE(SUM(amount) FILTER(WHERE direction='outflow'),0)::numeric(18,2) AS outflow
FROM public.financial_cash_ledger GROUP BY business_id,entry_date),
tax AS(
SELECT business_id,due_date AS flow_date,0::numeric(18,2) AS inflow,
SUM(GREATEST(0::numeric,amount-COALESCE(paid_amount,0)))::numeric(18,2) AS outflow
FROM public.tax_payments WHERE status IN('planned','due','overdue','partial') AND due_date IS NOT NULL GROUP BY business_id,due_date),
flows AS(SELECT * FROM actual UNION ALL SELECT * FROM tax)
SELECT business_id,flow_date,SUM(inflow)::numeric(18,2) AS inflow,SUM(outflow)::numeric(18,2) AS outflow,(SUM(inflow)-SUM(outflow))::numeric(18,2) AS net_flow
FROM flows GROUP BY business_id,flow_date;

CREATE OR REPLACE FUNCTION public.post_sale_accounting(p_sale_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s record; v_journal uuid; v_net numeric(18,2); v_vat_amount numeric(18,2); v_counter_key text; v_counter uuid; v_sales uuid; v_vat_account uuid;
BEGIN
SELECT * INTO s FROM public.sales WHERE id=p_sale_id FOR UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'sale not found'; END IF;
IF s.accounting_journal_id IS NOT NULL THEN
UPDATE public.financial_posting_queue SET status='posted',accounting_journal_id=s.accounting_journal_id,updated_at=now()
WHERE business_id=s.business_id AND source_type='sale' AND source_id=s.id AND status IN('pending','blocked','approved');
RETURN s.accounting_journal_id; END IF;
IF s.status IN('draft','cancelled') OR COALESCE(s.total,0)<=0 THEN RETURN NULL; END IF;
IF auth.uid() IS NOT NULL AND NOT private.has_business_role(s.business_id,auth.uid(),ARRAY['owner','admin','staff']::public.member_role[]) THEN RAISE EXCEPTION 'business write access denied'; END IF;
SELECT id INTO v_sales FROM public.accounting_accounts WHERE business_id=s.business_id AND system_key='sales_revenue' AND active LIMIT 1;
SELECT id INTO v_vat_account FROM public.accounting_accounts WHERE business_id=s.business_id AND system_key='vat_debit' AND active LIMIT 1;
IF v_sales IS NULL THEN RAISE EXCEPTION 'missing sales revenue account'; END IF;
IF s.tax_treatment='taxable' AND s.vat_rate>0 THEN v_net:=round(s.total/(1+s.vat_rate/100),2); v_vat_amount:=round(s.total-v_net,2); IF v_vat_account IS NULL THEN RAISE EXCEPTION 'missing VAT debit account'; END IF; ELSE v_net:=round(s.total,2); v_vat_amount:=0; END IF;
IF COALESCE(s.is_credit,false) THEN v_counter_key:='accounts_receivable'; ELSIF lower(COALESCE(s.payment_method,'')) IN('transfer','transbank','tarjeta','tarjeta_debito','tarjeta_credito','mercadopago','transferencia') THEN v_counter_key:='bank'; ELSE v_counter_key:='cash'; END IF;
SELECT id INTO v_counter FROM public.accounting_accounts WHERE business_id=s.business_id AND system_key=v_counter_key AND active LIMIT 1;
IF v_counter IS NULL THEN RAISE EXCEPTION 'missing counter-account %',v_counter_key; END IF;
v_journal:=public.post_financial_journal(s.business_id,COALESCE(s.sale_date,current_date),'Venta automática · '||COALESCE(s.customer_name,'Cliente'),'sale',s.id,CASE WHEN v_vat_amount>0 THEN jsonb_build_array(jsonb_build_object('account_id',v_counter,'debit',round(s.total,2),'credit',0,'description','Cobro/cliente'),jsonb_build_object('account_id',v_sales,'debit',0,'credit',v_net,'description','Venta neta'),jsonb_build_object('account_id',v_vat_account,'debit',0,'credit',v_vat_amount,'description','IVA débito fiscal')) ELSE jsonb_build_array(jsonb_build_object('account_id',v_counter,'debit',round(s.total,2),'credit',0,'description','Cobro/cliente'),jsonb_build_object('account_id',v_sales,'debit',0,'credit',v_net,'description','Venta')) END);
UPDATE public.sales SET accounting_journal_id=v_journal,accounting_posting_status='posted',accounting_posting_error=NULL WHERE id=s.id;
UPDATE public.financial_posting_queue SET status='posted',accounting_journal_id=v_journal,reviewed_at=now(),updated_at=now()
WHERE business_id=s.business_id AND source_type='sale' AND source_id=s.id AND status IN('pending','blocked','approved');
RETURN v_journal; END; $$;

CREATE OR REPLACE FUNCTION public.post_purchase_accounting(p_purchase_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p record; v_journal uuid; v_net numeric(18,2); v_vat_amount numeric(18,2); v_debit uuid; v_vat_account uuid; v_payable uuid; v_system_key text;
BEGIN
SELECT * INTO p FROM public.purchases WHERE id=p_purchase_id FOR UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'purchase not found'; END IF;
IF p.accounting_journal_id IS NOT NULL THEN
UPDATE public.financial_posting_queue SET status='posted',accounting_journal_id=p.accounting_journal_id,updated_at=now()
WHERE business_id=p.business_id AND source_type='purchase' AND source_id=p.id AND status IN('pending','blocked','approved');
RETURN p.accounting_journal_id; END IF;
IF p.status NOT IN('received','paid') OR COALESCE(p.total,0)<=0 THEN RETURN NULL; END IF;
IF auth.uid() IS NOT NULL AND NOT private.has_business_role(p.business_id,auth.uid(),ARRAY['owner','admin','staff']::public.member_role[]) THEN RAISE EXCEPTION 'business write access denied'; END IF;
v_system_key:=CASE lower(COALESCE(p.category,'')) WHEN 'mercadería para reventa' THEN 'inventory' WHEN 'insumos' THEN 'inventory' WHEN 'equipamiento' THEN 'fixed_assets' ELSE 'operating_expense' END;
SELECT id INTO v_debit FROM public.accounting_accounts WHERE business_id=p.business_id AND system_key=v_system_key AND active LIMIT 1;
SELECT id INTO v_vat_account FROM public.accounting_accounts WHERE business_id=p.business_id AND system_key='vat_credit' AND active LIMIT 1;
SELECT id INTO v_payable FROM public.accounting_accounts WHERE business_id=p.business_id AND system_key='accounts_payable' AND active LIMIT 1;
IF v_debit IS NULL OR v_payable IS NULL THEN RAISE EXCEPTION 'missing purchase accounting accounts'; END IF;
IF p.tax_treatment='taxable' AND p.vat_rate>0 THEN v_net:=round(p.total/(1+p.vat_rate/100),2); v_vat_amount:=round(p.total-v_net,2); IF v_vat_account IS NULL THEN RAISE EXCEPTION 'missing VAT credit account'; END IF; ELSE v_net:=round(p.total,2); v_vat_amount:=0; END IF;
v_journal:=public.post_financial_journal(p.business_id,COALESCE(p.purchase_date,current_date),'Compra automática · '||COALESCE(p.supplier_name,'Proveedor'),'purchase',p.id,CASE WHEN v_vat_amount>0 THEN jsonb_build_array(jsonb_build_object('account_id',v_debit,'debit',v_net,'credit',0,'description',COALESCE(p.category,'Compra')),jsonb_build_object('account_id',v_vat_account,'debit',v_vat_amount,'credit',0,'description','IVA crédito fiscal'),jsonb_build_object('account_id',v_payable,'debit',0,'credit',round(p.total,2),'description','Proveedor')) ELSE jsonb_build_array(jsonb_build_object('account_id',v_debit,'debit',v_net,'credit',0,'description',COALESCE(p.category,'Compra')),jsonb_build_object('account_id',v_payable,'debit',0,'credit',round(p.total,2),'description','Proveedor')) END);
UPDATE public.purchases SET accounting_journal_id=v_journal,accounting_posting_status='posted',accounting_posting_error=NULL WHERE id=p.id;
UPDATE public.financial_posting_queue SET status='posted',accounting_journal_id=v_journal,reviewed_at=now(),updated_at=now()
WHERE business_id=p.business_id AND source_type='purchase' AND source_id=p.id AND status IN('pending','blocked','approved');
RETURN v_journal; END; $$;

CREATE OR REPLACE FUNCTION private.validate_f29_math() RETURNS trigger LANGUAGE plpgsql SET search_path=public,private AS $$
DECLARE expected_iva numeric(18,2); expected_ppm numeric(18,2); expected_total numeric(18,2);
BEGIN
expected_iva:=round(GREATEST(0,COALESCE(NEW.debit_iva,0)-COALESCE(NEW.credit_iva,0)-COALESCE(NEW.credit_iva_remanent,0)),2);
expected_ppm:=round(GREATEST(0,COALESCE(NEW.ppm_base,0)*COALESCE(NEW.ppm_rate,0)/100),2);
expected_total:=round(expected_iva+expected_ppm+COALESCE(NEW.withholdings,0)+COALESCE(NEW.other_taxes,0),2);
NEW.iva_to_pay:=expected_iva; NEW.ppm_amount:=expected_ppm; NEW.total_to_pay:=expected_total;
IF COALESCE(NEW.total_documents,0)<0 THEN RAISE EXCEPTION 'F29 total_documents cannot be negative'; END IF;
RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_validate_f29_math ON public.tax_f29_returns;
CREATE TRIGGER trg_validate_f29_math BEFORE INSERT OR UPDATE OF debit_iva,credit_iva,credit_iva_remanent,ppm_base,ppm_rate,withholdings,other_taxes,total_documents ON public.tax_f29_returns FOR EACH ROW EXECUTE FUNCTION private.validate_f29_math();
REVOKE ALL ON FUNCTION private.validate_f29_math() FROM PUBLIC,anon,authenticated;
DROP INDEX IF EXISTS public.idx_tax_f29_period_business;
REVOKE EXECUTE ON FUNCTION public.get_platform_owner_metrics() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_platform_owner_metrics(uuid) FROM authenticated;

COMMIT;
