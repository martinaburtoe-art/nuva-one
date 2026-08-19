BEGIN;
CREATE OR REPLACE FUNCTION public.post_sale_payment_accounting(p_payment_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE pay record; s record; v_journal uuid; v_cash uuid; v_ar uuid; v_key text;
BEGIN
 SELECT pay.* INTO pay FROM public.payments pay WHERE pay.id=p_payment_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'payment not found'; END IF;
 IF pay.accounting_journal_id IS NOT NULL THEN RETURN pay.accounting_journal_id; END IF;
 SELECT * INTO s FROM public.sales WHERE id=pay.sale_id AND business_id=pay.business_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'sale not found'; END IF;
 IF NOT COALESCE(s.is_credit,false) THEN RETURN NULL; END IF;
 IF pay.amount<=0 OR pay.amount>GREATEST(0,s.total-s.paid_amount+pay.amount) THEN RAISE EXCEPTION 'invalid payment amount'; END IF;
 IF auth.uid() IS NOT NULL AND NOT private.has_business_role(pay.business_id,auth.uid(),ARRAY['owner','admin','staff']::public.member_role[]) THEN RAISE EXCEPTION 'business write access denied'; END IF;
 SELECT id INTO v_ar FROM public.accounting_accounts WHERE business_id=pay.business_id AND system_key='accounts_receivable' AND active LIMIT 1;
 v_key:=CASE WHEN lower(coalesce(pay.method,'')) IN('transfer','transbank','tarjeta','tarjeta_debito','tarjeta_credito','mercadopago','transferencia') THEN 'bank' ELSE 'cash' END;
 SELECT id INTO v_cash FROM public.accounting_accounts WHERE business_id=pay.business_id AND system_key=v_key AND active LIMIT 1;
 IF v_ar IS NULL OR v_cash IS NULL THEN RAISE EXCEPTION 'missing settlement accounts'; END IF;
 v_journal:=public.post_financial_journal(pay.business_id,pay.paid_at::date,'Cobro venta · '||coalesce(s.customer_name,'Cliente'),'sale_payment',pay.id,jsonb_build_array(jsonb_build_object('account_id',v_cash,'debit',round(pay.amount,2),'credit',0,'description','Ingreso de cobranza'),jsonb_build_object('account_id',v_ar,'debit',0,'credit',round(pay.amount,2),'description','Abono CxC')));
 UPDATE public.payments SET accounting_journal_id=v_journal WHERE id=pay.id;
 RETURN v_journal;
END; $$;
COMMIT;
