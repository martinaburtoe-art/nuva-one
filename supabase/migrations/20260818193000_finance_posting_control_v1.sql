-- Nüva One — Controlled accounting posting + treasury control v1
-- The queue deliberately separates operational capture from accounting recognition.
-- This prevents Nüva from inventing VAT/tax treatment when source data is incomplete.

CREATE TABLE IF NOT EXISTS public.financial_posting_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('sale','purchase')),
  source_id uuid NOT NULL,
  source_date date NOT NULL,
  gross_amount numeric(18,2) NOT NULL CHECK (gross_amount >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','posted','blocked','cancelled')),
  reason text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  accounting_journal_id uuid REFERENCES public.accounting_journals(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, source_type, source_id)
);

ALTER TABLE public.financial_posting_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS financial_posting_queue_select ON public.financial_posting_queue;
CREATE POLICY financial_posting_queue_select ON public.financial_posting_queue FOR SELECT TO authenticated USING (private.is_business_member(business_id, auth.uid()));
DROP POLICY IF EXISTS financial_posting_queue_write ON public.financial_posting_queue;
CREATE POLICY financial_posting_queue_write ON public.financial_posting_queue FOR ALL TO authenticated USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner','admin','staff']::public.member_role[])) WITH CHECK (private.has_business_role(business_id, auth.uid(), ARRAY['owner','admin','staff']::public.member_role[]));

CREATE OR REPLACE FUNCTION public.queue_financial_source(p_business_id uuid,p_source_type text,p_source_id uuid,p_source_date date,p_gross numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid;
BEGIN
  IF p_source_type NOT IN ('sale','purchase') THEN RAISE EXCEPTION 'unsupported source type'; END IF;
  INSERT INTO public.financial_posting_queue(business_id,source_type,source_id,source_date,gross_amount,reason)
  VALUES(p_business_id,p_source_type,p_source_id,p_source_date,COALESCE(p_gross,0),'Requiere clasificación contable/tributaria antes de publicar')
  ON CONFLICT (business_id,source_type,source_id) DO UPDATE SET source_date=excluded.source_date,gross_amount=excluded.gross_amount,updated_at=now() WHERE financial_posting_queue.status IN ('pending','blocked')
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_sale_financial_posting()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status <> 'cancelled' AND COALESCE(NEW.total,0)>0 AND NEW.accounting_journal_id IS NULL THEN
    PERFORM public.queue_financial_source(NEW.business_id,'sale',NEW.id,NEW.sale_date,NEW.total);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_purchase_financial_posting()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status <> 'cancelled' AND COALESCE(NEW.total,0)>0 AND NEW.accounting_journal_id IS NULL THEN
    PERFORM public.queue_financial_source(NEW.business_id,'purchase',NEW.id,NEW.purchase_date,NEW.total);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_queue_sale_financial_posting ON public.sales;
CREATE TRIGGER trg_queue_sale_financial_posting AFTER INSERT OR UPDATE OF status,total ON public.sales FOR EACH ROW EXECUTE FUNCTION public.enqueue_sale_financial_posting();
DROP TRIGGER IF EXISTS trg_queue_purchase_financial_posting ON public.purchases;
CREATE TRIGGER trg_queue_purchase_financial_posting AFTER INSERT OR UPDATE OF status,total ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.enqueue_purchase_financial_posting();

INSERT INTO public.financial_posting_queue(business_id,source_type,source_id,source_date,gross_amount,reason)
SELECT s.business_id,'sale',s.id,s.sale_date,s.total,'Registro histórico pendiente de clasificación contable/tributaria' FROM public.sales s WHERE s.status <> 'cancelled' AND COALESCE(s.total,0)>0 AND s.accounting_journal_id IS NULL ON CONFLICT (business_id,source_type,source_id) DO NOTHING;
INSERT INTO public.financial_posting_queue(business_id,source_type,source_id,source_date,gross_amount,reason)
SELECT p.business_id,'purchase',p.id,p.purchase_date,p.total,'Registro histórico pendiente de clasificación contable/tributaria' FROM public.purchases p WHERE p.status <> 'cancelled' AND COALESCE(p.total,0)>0 AND p.accounting_journal_id IS NULL ON CONFLICT (business_id,source_type,source_id) DO NOTHING;

CREATE OR REPLACE VIEW public.v_financial_treasury_daily WITH (security_invoker=true) AS
WITH tx AS (SELECT business_id,tx_date AS flow_date,SUM(CASE WHEN type='income' THEN amount ELSE 0 END)::numeric(18,2) inflow,SUM(CASE WHEN type='expense' THEN amount ELSE 0 END)::numeric(18,2) outflow FROM public.transactions GROUP BY business_id,tx_date),
tax AS (SELECT business_id,due_date AS flow_date,0::numeric(18,2) inflow,SUM(GREATEST(0,amount-COALESCE(paid_amount,0)))::numeric(18,2) outflow FROM public.tax_payments WHERE status IN ('planned','due','overdue','partial') GROUP BY business_id,due_date),
flows AS (SELECT * FROM tx UNION ALL SELECT * FROM tax)
SELECT business_id,flow_date,SUM(inflow)::numeric(18,2) inflow,SUM(outflow)::numeric(18,2) outflow,(SUM(inflow)-SUM(outflow))::numeric(18,2) net_flow FROM flows GROUP BY business_id,flow_date;

DROP VIEW IF EXISTS public.v_financial_posting_health;
CREATE VIEW public.v_financial_posting_health WITH (security_invoker=true) AS
SELECT q.business_id,COUNT(*) FILTER (WHERE q.status='pending')::integer pending_count,COUNT(*) FILTER (WHERE q.status='blocked')::integer blocked_count,COUNT(*) FILTER (WHERE q.status='posted')::integer posted_count,COALESCE(SUM(q.gross_amount) FILTER (WHERE q.status IN ('pending','blocked')),0)::numeric(18,2) pending_amount,MAX(q.created_at) last_queued_at FROM public.financial_posting_queue q GROUP BY q.business_id;

REVOKE ALL ON FUNCTION public.queue_financial_source(uuid,text,uuid,date,numeric) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.enqueue_sale_financial_posting() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.enqueue_purchase_financial_posting() FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.v_financial_treasury_daily TO authenticated;
GRANT SELECT ON public.v_financial_posting_health TO authenticated;