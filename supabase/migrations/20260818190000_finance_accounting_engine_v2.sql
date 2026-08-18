-- Nüva One — Professional finance engine v2
-- Purpose: make accounting data operationally usable without pretending that a tax
-- return has been filed at SII. All posting is business-scoped and period-aware.

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS accounting_journal_id uuid REFERENCES public.accounting_journals(id) ON DELETE SET NULL;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS accounting_journal_id uuid REFERENCES public.accounting_journals(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_accounting_journal ON public.sales(accounting_journal_id) WHERE accounting_journal_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_purchases_accounting_journal ON public.purchases(accounting_journal_id) WHERE accounting_journal_id IS NOT NULL;

-- Canonical starter chart of accounts. Businesses can extend it, but system keys
-- give the automation a stable reference instead of relying on account codes.
CREATE OR REPLACE FUNCTION public.seed_financial_accounts(p_business_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  IF NOT public.is_business_member(p_business_id, auth.uid())
     AND NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id=p_business_id AND b.owner_id=auth.uid()) THEN
    RAISE EXCEPTION 'business access denied';
  END IF;

  INSERT INTO public.accounting_accounts(business_id,code,name,account_type,tax_category,system_key)
  VALUES
   (p_business_id,'1.01.01','Caja','asset','cash','cash'),
   (p_business_id,'1.01.02','Bancos','asset','bank','bank'),
   (p_business_id,'1.01.03','Clientes por cobrar','asset','receivable','accounts_receivable'),
   (p_business_id,'1.01.04','IVA crédito fiscal','asset','vat_credit','vat_credit'),
   (p_business_id,'1.02.01','Inventarios','asset','inventory','inventory'),
   (p_business_id,'1.03.01','Activos fijos','asset','fixed_asset','fixed_assets'),
   (p_business_id,'2.01.01','Proveedores','liability','payable','accounts_payable'),
   (p_business_id,'2.01.02','IVA débito fiscal','liability','vat_debit','vat_debit'),
   (p_business_id,'2.01.03','IVA por pagar','liability','vat_payable','vat_payable'),
   (p_business_id,'2.01.04','PPM por pagar','liability','ppm','ppm_payable'),
   (p_business_id,'3.01.01','Capital','equity','equity','equity'),
   (p_business_id,'4.01.01','Ventas','revenue','sales','sales_revenue'),
   (p_business_id,'5.01.01','Costo de ventas','cost_of_sales','cogs','cost_of_sales'),
   (p_business_id,'6.01.01','Gastos operacionales','expense','operating_expense','operating_expense'),
   (p_business_id,'7.01.01','Otros ingresos','other_income','other_income','other_income'),
   (p_business_id,'8.01.01','Otros gastos','other_expense','other_expense','other_expense')
  ON CONFLICT (business_id,code) DO UPDATE SET name=excluded.name, system_key=excluded.system_key;

  SELECT count(*) INTO n FROM public.accounting_accounts WHERE business_id=p_business_id;
  RETURN n;
END;
$$;

-- Atomic journal posting. The JSON array must contain objects with account_id,
-- debit, credit and optional description. A journal can never be posted unbalanced.
CREATE OR REPLACE FUNCTION public.post_financial_journal(
  p_business_id uuid,
  p_entry_date date,
  p_description text,
  p_source_type text,
  p_source_id uuid,
  p_lines jsonb
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_journal uuid;
  v_total_debit numeric(18,2);
  v_total_credit numeric(18,2);
  v_period record;
  v_line jsonb;
BEGIN
  IF NOT public.has_business_role(p_business_id, auth.uid(), ARRAY['owner','admin','staff']::public.member_role[]) THEN
    RAISE EXCEPTION 'business write access denied';
  END IF;

  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) < 2 THEN
    RAISE EXCEPTION 'journal requires at least two lines';
  END IF;

  SELECT * INTO v_period FROM public.accounting_period_closures
  WHERE business_id=p_business_id AND p_entry_date BETWEEN period_start AND period_end
  ORDER BY period_start DESC LIMIT 1;
  IF FOUND AND v_period.status='closed' THEN
    RAISE EXCEPTION 'accounting period is closed';
  END IF;

  SELECT COALESCE(sum((x->>'debit')::numeric),0), COALESCE(sum((x->>'credit')::numeric),0)
  INTO v_total_debit, v_total_credit
  FROM jsonb_array_elements(p_lines) x;

  IF v_total_debit <= 0 OR round(v_total_debit,2) <> round(v_total_credit,2) THEN
    RAISE EXCEPTION 'unbalanced journal: debit %, credit %',v_total_debit,v_total_credit;
  END IF;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    IF NOT EXISTS (SELECT 1 FROM public.accounting_accounts a WHERE a.id=(v_line->>'account_id')::uuid AND a.business_id=p_business_id AND a.active) THEN
      RAISE EXCEPTION 'account does not belong to business';
    END IF;
    IF COALESCE((v_line->>'debit')::numeric,0) < 0 OR COALESCE((v_line->>'credit')::numeric,0) < 0
       OR (COALESCE((v_line->>'debit')::numeric,0)>0 AND COALESCE((v_line->>'credit')::numeric,0)>0) THEN
      RAISE EXCEPTION 'invalid debit/credit line';
    END IF;
  END LOOP;

  INSERT INTO public.accounting_journals(business_id,entry_date,description,source_type,source_id,status,created_by)
  VALUES(p_business_id,p_entry_date,p_description,coalesce(p_source_type,'manual'),p_source_id,'posted',auth.uid())
  RETURNING id INTO v_journal;

  INSERT INTO public.accounting_lines(business_id,journal_id,account_id,description,debit,credit,tax_code)
  SELECT p_business_id,v_journal,(x->>'account_id')::uuid,x->>'description',
         COALESCE((x->>'debit')::numeric,0),COALESCE((x->>'credit')::numeric,0),x->>'tax_code'
  FROM jsonb_array_elements(p_lines) x;

  RETURN v_journal;
END;
$$;

-- Rebuild the canonical chart for every existing business. Idempotent by design.
DO $$
DECLARE b record;
BEGIN
  FOR b IN SELECT id FROM public.businesses LOOP
    PERFORM public.seed_financial_accounts(b.id);
  END LOOP;
END $$;

-- Management view: one row per business/month with P&L categories.
CREATE OR REPLACE VIEW public.v_financial_pnl_monthly AS
SELECT j.business_id,
       date_trunc('month',j.entry_date)::date AS month,
       COALESCE(sum(CASE WHEN a.account_type='revenue' THEN l.credit-l.debit ELSE 0 END),0)::numeric(18,2) AS revenue,
       COALESCE(sum(CASE WHEN a.account_type='cost_of_sales' THEN l.debit-l.credit ELSE 0 END),0)::numeric(18,2) AS cost_of_sales,
       COALESCE(sum(CASE WHEN a.account_type='expense' THEN l.debit-l.credit ELSE 0 END),0)::numeric(18,2) AS operating_expenses,
       COALESCE(sum(CASE WHEN a.account_type='other_income' THEN l.credit-l.debit ELSE 0 END),0)::numeric(18,2) AS other_income,
       COALESCE(sum(CASE WHEN a.account_type='other_expense' THEN l.debit-l.credit ELSE 0 END),0)::numeric(18,2) AS other_expenses,
       (COALESCE(sum(CASE WHEN a.account_type='revenue' THEN l.credit-l.debit ELSE 0 END),0)
        -COALESCE(sum(CASE WHEN a.account_type='cost_of_sales' THEN l.debit-l.credit ELSE 0 END),0)
        -COALESCE(sum(CASE WHEN a.account_type='expense' THEN l.debit-l.credit ELSE 0 END),0)
        +COALESCE(sum(CASE WHEN a.account_type='other_income' THEN l.credit-l.debit ELSE 0 END),0)
        -COALESCE(sum(CASE WHEN a.account_type='other_expense' THEN l.debit-l.credit ELSE 0 END),0))::numeric(18,2) AS net_result
FROM public.accounting_journals j
JOIN public.accounting_lines l ON l.journal_id=j.id AND l.business_id=j.business_id
JOIN public.accounting_accounts a ON a.id=l.account_id AND a.business_id=j.business_id
WHERE j.status='posted'
GROUP BY j.business_id,date_trunc('month',j.entry_date)::date;

-- Reconciliation view between operational transactions and posted accounting journals.
CREATE OR REPLACE VIEW public.v_financial_source_reconciliation AS
SELECT s.business_id,'sale'::text source_type,s.id source_id,s.sale_date source_date,s.total amount,
       CASE WHEN s.status='cancelled' THEN 'cancelled'
            WHEN s.accounting_journal_id IS NULL THEN 'missing_accounting_entry'
            ELSE 'linked' END status
FROM public.sales s
UNION ALL
SELECT p.business_id,'purchase'::text,p.id,p.purchase_date,p.total,
       CASE WHEN p.status='cancelled' THEN 'cancelled'
            WHEN p.accounting_journal_id IS NULL THEN 'missing_accounting_entry'
            ELSE 'linked' END
FROM public.purchases p;

GRANT EXECUTE ON FUNCTION public.seed_financial_accounts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.post_financial_journal(uuid,date,text,text,uuid,jsonb) TO authenticated;
GRANT SELECT ON public.v_financial_pnl_monthly TO authenticated;
GRANT SELECT ON public.v_financial_source_reconciliation TO authenticated;
