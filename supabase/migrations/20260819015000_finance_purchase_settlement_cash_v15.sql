BEGIN;
CREATE OR REPLACE FUNCTION private.sync_purchase_cash_ledger() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
BEGIN
 DELETE FROM public.financial_cash_ledger WHERE business_id=COALESCE(NEW.business_id,OLD.business_id) AND source_type='purchase' AND source_id=COALESCE(NEW.id,OLD.id);
 IF TG_OP<>'DELETE' AND NEW.status='paid' AND COALESCE(NEW.total,0)>0 AND NOT EXISTS(SELECT 1 FROM public.purchase_payments pp WHERE pp.business_id=NEW.business_id AND pp.purchase_id=NEW.id) THEN
  INSERT INTO public.financial_cash_ledger(business_id,entry_date,direction,amount,category,description,payment_method,source_type,source_id)
  VALUES(NEW.business_id,NEW.purchase_date,'outflow',NEW.total,COALESCE(NEW.category,'Compra'),'Pago de compra · '||COALESCE(NEW.supplier_name,'Proveedor'),NULL,'purchase',NEW.id)
  ON CONFLICT(business_id,source_type,source_id) DO UPDATE SET entry_date=excluded.entry_date,amount=excluded.amount,category=excluded.category,description=excluded.description,updated_at=now();
 END IF; RETURN COALESCE(NEW,OLD);
END; $$;
CREATE OR REPLACE FUNCTION private.sync_purchase_payment_cash_ledger() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
BEGIN
 IF TG_OP='DELETE' THEN DELETE FROM public.financial_cash_ledger WHERE business_id=OLD.business_id AND source_type='purchase_payment' AND source_id=OLD.id; RETURN OLD; END IF;
 DELETE FROM public.financial_cash_ledger WHERE business_id=NEW.business_id AND source_type='purchase_payment' AND source_id=NEW.id;
 IF COALESCE(NEW.amount,0)>0 THEN
  INSERT INTO public.financial_cash_ledger(business_id,entry_date,direction,amount,category,description,payment_method,source_type,source_id)
  VALUES(NEW.business_id,NEW.paid_at::date,'outflow',NEW.amount,'Pago de compra','Abono a proveedor',NEW.method,'purchase_payment',NEW.id)
  ON CONFLICT(business_id,source_type,source_id) DO UPDATE SET entry_date=excluded.entry_date,amount=excluded.amount,description=excluded.description,payment_method=excluded.payment_method,updated_at=now();
 END IF; RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_sync_purchase_payment_cash_ledger ON public.purchase_payments;
CREATE TRIGGER trg_sync_purchase_payment_cash_ledger AFTER INSERT OR UPDATE OR DELETE ON public.purchase_payments FOR EACH ROW EXECUTE FUNCTION private.sync_purchase_payment_cash_ledger();
REVOKE ALL ON FUNCTION private.sync_purchase_payment_cash_ledger() FROM PUBLIC,anon,authenticated;
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
COMMIT;
