BEGIN;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS accounting_journal_id uuid REFERENCES public.accounting_journals(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS payments_accounting_journal_idx ON public.payments(accounting_journal_id);
CREATE TABLE IF NOT EXISTS public.purchase_payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
 purchase_id uuid NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE, amount numeric(18,2) NOT NULL CHECK(amount>0),
 method text NOT NULL DEFAULT 'efectivo', paid_at timestamptz NOT NULL DEFAULT now(),
 accounting_journal_id uuid REFERENCES public.accounting_journals(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS purchase_payments_business_purchase_idx ON public.purchase_payments(business_id,purchase_id);
ALTER TABLE public.purchase_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS purchase_payments_select ON public.purchase_payments;
CREATE POLICY purchase_payments_select ON public.purchase_payments FOR SELECT TO authenticated USING(private.is_business_member(business_id,auth.uid()));
DROP POLICY IF EXISTS purchase_payments_write ON public.purchase_payments;
CREATE POLICY purchase_payments_write ON public.purchase_payments FOR ALL TO authenticated USING(private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin','staff']::public.member_role[])) WITH CHECK(private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin','staff']::public.member_role[]));
REVOKE ALL ON public.purchase_payments FROM anon;
CREATE OR REPLACE FUNCTION public.post_sale_payment_accounting(p_payment_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p record; s record; v_journal uuid; v_cash uuid; v_ar uuid; v_key text;
BEGIN
 SELECT p.* INTO p FROM public.payments p WHERE p.id=p_payment_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'payment not found'; END IF;
 IF p.accounting_journal_id IS NOT NULL THEN RETURN p.accounting_journal_id; END IF;
 SELECT * INTO s FROM public.sales WHERE id=p.sale_id AND business_id=p.business_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'sale not found'; END IF;
 IF NOT COALESCE(s.is_credit,false) THEN RETURN NULL; END IF;
 IF p.amount<=0 OR p.amount>GREATEST(0,s.total-s.paid_amount+p.amount) THEN RAISE EXCEPTION 'invalid payment amount'; END IF;
 IF auth.uid() IS NOT NULL AND NOT private.has_business_role(p.business_id,auth.uid(),ARRAY['owner','admin','staff']::public.member_role[]) THEN RAISE EXCEPTION 'business write access denied'; END IF;
 SELECT id INTO v_ar FROM public.accounting_accounts WHERE business_id=p.business_id AND system_key='accounts_receivable' AND active LIMIT 1;
 v_key:=CASE WHEN lower(coalesce(p.method,'')) IN('transfer','transbank','tarjeta','tarjeta_debito','tarjeta_credito','mercadopago','transferencia') THEN 'bank' ELSE 'cash' END;
 SELECT id INTO v_cash FROM public.accounting_accounts WHERE business_id=p.business_id AND system_key=v_key AND active LIMIT 1;
 IF v_ar IS NULL OR v_cash IS NULL THEN RAISE EXCEPTION 'missing settlement accounts'; END IF;
 v_journal:=public.post_financial_journal(p.business_id,p.paid_at::date,'Cobro venta · '||coalesce(s.customer_name,'Cliente'),'sale_payment',p.id,jsonb_build_array(jsonb_build_object('account_id',v_cash,'debit',round(p.amount,2),'credit',0,'description','Ingreso de cobranza'),jsonb_build_object('account_id',v_ar,'debit',0,'credit',round(p.amount,2),'description','Abono CxC')));
 UPDATE public.payments SET accounting_journal_id=v_journal WHERE id=p.id; RETURN v_journal;
END; $$;
CREATE OR REPLACE FUNCTION public.post_purchase_payment_accounting(p_payment_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p record; pur record; v_journal uuid; v_cash uuid; v_ap uuid; v_key text; v_paid numeric(18,2);
BEGIN
 SELECT pp.* INTO p FROM public.purchase_payments pp WHERE pp.id=p_payment_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'purchase payment not found'; END IF;
 IF p.accounting_journal_id IS NOT NULL THEN RETURN p.accounting_journal_id; END IF;
 SELECT * INTO pur FROM public.purchases WHERE id=p.purchase_id AND business_id=p.business_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'purchase not found'; END IF;
 IF pur.status='cancelled' THEN RAISE EXCEPTION 'cannot pay cancelled purchase'; END IF;
 SELECT COALESCE(SUM(pp.amount),0) INTO v_paid FROM public.purchase_payments pp WHERE pp.business_id=p.business_id AND pp.purchase_id=p.purchase_id AND pp.id<>p.id;
 IF p.amount<=0 OR p.amount>GREATEST(0,pur.total-v_paid) THEN RAISE EXCEPTION 'payment exceeds purchase balance'; END IF;
 IF auth.uid() IS NOT NULL AND NOT private.has_business_role(p.business_id,auth.uid(),ARRAY['owner','admin','staff']::public.member_role[]) THEN RAISE EXCEPTION 'business write access denied'; END IF;
 SELECT id INTO v_ap FROM public.accounting_accounts WHERE business_id=p.business_id AND system_key='accounts_payable' AND active LIMIT 1;
 v_key:=CASE WHEN lower(coalesce(p.method,'')) IN('transfer','transbank','tarjeta','tarjeta_debito','tarjeta_credito','mercadopago','transferencia') THEN 'bank' ELSE 'cash' END;
 SELECT id INTO v_cash FROM public.accounting_accounts WHERE business_id=p.business_id AND system_key=v_key AND active LIMIT 1;
 IF v_ap IS NULL OR v_cash IS NULL THEN RAISE EXCEPTION 'missing settlement accounts'; END IF;
 v_journal:=public.post_financial_journal(p.business_id,p.paid_at::date,'Pago compra · '||coalesce(pur.supplier_name,'Proveedor'),'purchase_payment',p.id,jsonb_build_array(jsonb_build_object('account_id',v_ap,'debit',round(p.amount,2),'credit',0,'description','Abono CxP'),jsonb_build_object('account_id',v_cash,'debit',0,'credit',round(p.amount,2),'description','Salida de fondos')));
 UPDATE public.purchase_payments SET accounting_journal_id=v_journal WHERE id=p.id;
 UPDATE public.purchases SET status='paid' WHERE id=p.purchase_id AND status<>'cancelled' AND v_paid+p.amount>=total;
 RETURN v_journal;
END; $$;
CREATE OR REPLACE FUNCTION private.trg_post_sale_payment_accounting() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$ BEGIN IF NEW.accounting_journal_id IS NULL THEN PERFORM public.post_sale_payment_accounting(NEW.id); END IF; RETURN NEW; END; $$;
CREATE OR REPLACE FUNCTION private.trg_post_purchase_payment_accounting() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$ BEGIN IF NEW.accounting_journal_id IS NULL THEN PERFORM public.post_purchase_payment_accounting(NEW.id); END IF; RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS payments_accounting_auto_post ON public.payments; CREATE TRIGGER payments_accounting_auto_post AFTER INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION private.trg_post_sale_payment_accounting();
DROP TRIGGER IF EXISTS purchase_payments_accounting_auto_post ON public.purchase_payments; CREATE TRIGGER purchase_payments_accounting_auto_post AFTER INSERT ON public.purchase_payments FOR EACH ROW EXECUTE FUNCTION private.trg_post_purchase_payment_accounting();
REVOKE ALL ON FUNCTION private.trg_post_sale_payment_accounting() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.trg_post_purchase_payment_accounting() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.post_sale_payment_accounting(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.post_purchase_payment_accounting(uuid) TO authenticated;
COMMIT;
