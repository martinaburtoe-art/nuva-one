-- Antes, toda orden de compra generaba un gasto con la categoría fija
-- 'Compras', sin relación con lo que realmente se compró. Esto hacía que
-- el gráfico de "Gastos por categoría" mezclara un bucket genérico
-- 'Compras' con categorías escritas a mano en movimientos manuales (ej.
-- 'Insumos'), dando la sensación de categorías duplicadas/inconsistentes.
--
-- Ahora cada orden de compra lleva su propia categoría (elegida por el
-- usuario desde una lista estándar), y el gasto automático que genera usa
-- esa misma categoría real.

ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Insumos'
    CHECK (category IN (
      'Insumos',
      'Mercadería para reventa',
      'Equipamiento',
      'Arriendo',
      'Servicios',
      'Marketing',
      'Otro'
    ));

COMMENT ON COLUMN public.purchases.category IS
  'Categoría de gasto real de la orden de compra; se usa como categoría del gasto automático en Finanzas.';

CREATE OR REPLACE FUNCTION public.apply_purchase_effects()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  item JSONB;
  tx_id UUID;
BEGIN
  IF NEW.status IN ('received','paid') AND NOT NEW.stock_applied THEN
    FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(NEW.items, '[]'::jsonb))
    LOOP
      IF (item->>'product_id') IS NOT NULL AND (item->>'product_id') != '' THEN
        UPDATE public.products
        SET stock = stock + COALESCE((item->>'qty')::int, 0)
        WHERE id = (item->>'product_id')::uuid AND business_id = NEW.business_id;
      END IF;
    END LOOP;
    IF NEW.transaction_id IS NULL AND NEW.total > 0 THEN
      INSERT INTO public.transactions (business_id, type, category, amount, description, tx_date)
      VALUES (NEW.business_id, 'expense', COALESCE(NEW.category, 'Otro'), NEW.total, 'Compra: ' || COALESCE(NEW.supplier_name, 'Proveedor'), NEW.purchase_date)
      RETURNING id INTO tx_id;
      NEW.transaction_id := tx_id;
    END IF;
    NEW.stock_applied := true;
  END IF;
  RETURN NEW;
END;
$$;
