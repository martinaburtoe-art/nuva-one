-- Prevent credit-sale payments from exceeding the remaining receivable.
-- The payment accounting trigger executes before apply_payment_to_sale, so paid_amount
-- still represents the balance before the current payment is applied.
CREATE OR REPLACE FUNCTION public.post_sale_payment_accounting(p_payment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_payment record;
  s record;
  v_journal uuid;
  v_cash uuid;
  v_ar uuid;
  v_key text;
  v_remaining numeric(18,2);
BEGIN
  SELECT t.* INTO v_payment
  FROM public.payments t
  WHERE t.id=p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'payment not found'; END IF;
  IF v_payment.accounting_journal_id IS NOT NULL THEN RETURN v_payment.accounting_journal_id; END IF;

  SELECT * INTO s
  FROM public.sales
  WHERE id=v_payment.sale_id
    AND business_id=v_payment.business_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'sale not found'; END IF;
  IF NOT COALESCE(s.is_credit,false) THEN RETURN NULL; END IF;

  v_remaining := round(GREATEST(0, s.total - COALESCE(s.paid_amount,0)),2);
  IF v_payment.amount <= 0 OR round(v_payment.amount,2) > v_remaining THEN
    RAISE EXCEPTION 'invalid payment amount: exceeds remaining receivable';
  END IF;

  IF auth.uid() IS NOT NULL
     AND NOT private.has_business_role(v_payment.business_id,auth.uid(),ARRAY['owner','admin','staff']::public.member_role[]) THEN
    RAISE EXCEPTION 'business write access denied';
  END IF;

  SELECT id INTO v_ar
  FROM public.accounting_accounts
  WHERE business_id=v_payment.business_id
    AND system_key='accounts_receivable'
    AND active
  LIMIT 1;

  v_key:=CASE
    WHEN lower(coalesce(v_payment.method,'')) IN('transfer','transbank','tarjeta','tarjeta_debito','tarjeta_credito','mercadopago','transferencia') THEN 'bank'
    ELSE 'cash'
  END;

  SELECT id INTO v_cash
  FROM public.accounting_accounts
  WHERE business_id=v_payment.business_id
    AND system_key=v_key
    AND active
  LIMIT 1;

  IF v_ar IS NULL OR v_cash IS NULL THEN RAISE EXCEPTION 'missing settlement accounts'; END IF;

  v_journal:=public.post_financial_journal(
    v_payment.business_id,
    v_payment.paid_at::date,
    'Cobro venta · '||coalesce(s.customer_name,'Cliente'),
    'sale_payment',
    v_payment.id,
    jsonb_build_array(
      jsonb_build_object('account_id',v_cash,'debit',round(v_payment.amount,2),'credit',0,'description','Ingreso de cobranza'),
      jsonb_build_object('account_id',v_ar,'debit',0,'credit',round(v_payment.amount,2),'description','Abono CxC')
    )
  );

  UPDATE public.payments
  SET accounting_journal_id=v_journal
  WHERE id=v_payment.id;

  RETURN v_journal;
END;
$function$;

REVOKE ALL ON FUNCTION public.post_sale_payment_accounting(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.post_sale_payment_accounting(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.post_sale_payment_accounting(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.post_sale_payment_accounting(uuid) TO service_role;
