-- apply_payment_to_sale solo sumaba paid_amount pero nunca movía sales.status
-- a 'paid'. Esto pasaba desapercibido porque las ventas de "Por cobrar" ya
-- nacían con status='pending' y su "pagada" se mostraba solo comparando
-- paid_amount vs total en el frontend. Pero el modo asistido SII (/billing)
-- sí filtra por status='paid' para saber qué declarar -- una venta pagada
-- por Flow/VSB nunca habría aparecido ahí para declararse. Se corrige acá.

CREATE OR REPLACE FUNCTION public.apply_payment_to_sale()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total NUMERIC(12,2);
  v_new_paid NUMERIC(12,2);
BEGIN
  UPDATE public.sales
  SET paid_amount = LEAST(total, paid_amount + NEW.amount)
  WHERE id = NEW.sale_id AND business_id = NEW.business_id
  RETURNING total, paid_amount INTO v_total, v_new_paid;

  IF v_new_paid IS NOT NULL AND v_new_paid >= v_total THEN
    UPDATE public.sales
    SET status = 'paid'
    WHERE id = NEW.sale_id AND business_id = NEW.business_id AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$;
