-- Módulo de cobranza (ventas a crédito / fiado) + recordatorios automáticos por WhatsApp.
-- No toca el flujo de venta al contado existente: is_credit=false (default) se comporta
-- exactamente igual que hoy.

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS is_credit BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Cuando una venta no es a crédito, se considera pagada por completo al crearse.
CREATE OR REPLACE FUNCTION public.default_paid_amount()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT NEW.is_credit AND NEW.paid_amount = 0 THEN
    NEW.paid_amount := NEW.total;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_default_paid_amount ON public.sales;
CREATE TRIGGER trg_default_paid_amount
  BEFORE INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.default_paid_amount();

-- Abonos parciales contra una venta a crédito.
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  method TEXT DEFAULT 'efectivo',
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.apply_payment_to_sale()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.sales
  SET paid_amount = LEAST(total, paid_amount + NEW.amount)
  WHERE id = NEW.sale_id AND business_id = NEW.business_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_payment_to_sale ON public.payments;
CREATE TRIGGER trg_apply_payment_to_sale
  AFTER INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.apply_payment_to_sale();

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view payments" ON public.payments
  FOR SELECT USING (private.is_business_member(business_id, auth.uid()));

CREATE POLICY "Members insert payments" ON public.payments
  FOR INSERT WITH CHECK (private.is_business_member(business_id, auth.uid()));

-- Log de recordatorios de cobranza enviados (auditoría + evita spamear al cliente).
CREATE TABLE IF NOT EXISTS public.collection_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','failed')),
  message_content TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.collection_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view collection reminders" ON public.collection_reminders
  FOR SELECT USING (private.is_business_member(business_id, auth.uid()));

CREATE INDEX IF NOT EXISTS idx_sales_credit_overdue
  ON public.sales(business_id, due_date)
  WHERE is_credit = true;

CREATE INDEX IF NOT EXISTS idx_collection_reminders_sale
  ON public.collection_reminders(sent_at DESC);
