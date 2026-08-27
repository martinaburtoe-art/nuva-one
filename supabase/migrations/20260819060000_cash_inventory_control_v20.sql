-- Cash + inventory control hardening v20
-- Re-establish the stocktake base tables before this migration adds indexes/policies.
CREATE TABLE IF NOT EXISTS public.inventory_stocktakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'counting',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_stocktakes_status_check CHECK (status IN ('draft','counting','completed','cancelled'))
);
CREATE INDEX IF NOT EXISTS idx_inventory_stocktakes_business_created ON public.inventory_stocktakes(business_id, created_at DESC);
CREATE TABLE IF NOT EXISTS public.inventory_stocktake_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stocktake_id uuid NOT NULL REFERENCES public.inventory_stocktakes(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  barcode text,
  product_name text,
  system_qty numeric NOT NULL DEFAULT 0,
  counted_qty numeric NOT NULL DEFAULT 0,
  difference numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_stocktake_lines_system_qty_check CHECK (system_qty >= 0),
  CONSTRAINT inventory_stocktake_lines_counted_qty_check CHECK (counted_qty >= 0),
  CONSTRAINT inventory_stocktake_lines_difference_check CHECK (difference = counted_qty - system_qty)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_stocktake_lines_product ON public.inventory_stocktake_lines(stocktake_id, product_id);
ALTER TABLE public.inventory_stocktakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stocktake_lines ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_financial_cash_ledger_business_date ON public.financial_cash_ledger (business_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_stocktake_lines_stocktake ON public.inventory_stocktake_lines (stocktake_id);
CREATE INDEX IF NOT EXISTS idx_inventory_stocktake_lines_product ON public.inventory_stocktake_lines (product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_stocktake_lines_business ON public.inventory_stocktake_lines (business_id);
CREATE INDEX IF NOT EXISTS idx_inventory_stocktakes_business_status ON public.inventory_stocktakes (business_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_stocktakes_created_by ON public.inventory_stocktakes (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_stocktakes_completed_by ON public.inventory_stocktakes (completed_by) WHERE completed_by IS NOT NULL;
DROP POLICY IF EXISTS financial_cash_ledger_update ON public.financial_cash_ledger;
DROP POLICY IF EXISTS financial_cash_ledger_delete ON public.financial_cash_ledger;
DROP POLICY IF EXISTS inventory_stocktake_lines_delete_member ON public.inventory_stocktake_lines;
DROP POLICY IF EXISTS inventory_stocktake_lines_insert_member ON public.inventory_stocktake_lines;
DROP POLICY IF EXISTS inventory_stocktake_lines_select_member ON public.inventory_stocktake_lines;
DROP POLICY IF EXISTS inventory_stocktake_lines_update_member ON public.inventory_stocktake_lines;
CREATE POLICY inventory_stocktake_lines_delete_member ON public.inventory_stocktake_lines FOR DELETE TO authenticated USING (private.is_business_member(business_id,(select auth.uid())));
CREATE POLICY inventory_stocktake_lines_insert_member ON public.inventory_stocktake_lines FOR INSERT TO authenticated WITH CHECK (private.is_business_member(business_id,(select auth.uid())));
CREATE POLICY inventory_stocktake_lines_select_member ON public.inventory_stocktake_lines FOR SELECT TO authenticated USING (private.is_business_member(business_id,(select auth.uid())));
CREATE POLICY inventory_stocktake_lines_update_member ON public.inventory_stocktake_lines FOR UPDATE TO authenticated USING (private.is_business_member(business_id,(select auth.uid()))) WITH CHECK (private.is_business_member(business_id,(select auth.uid())));
DROP POLICY IF EXISTS inventory_stocktakes_delete_member ON public.inventory_stocktakes;
DROP POLICY IF EXISTS inventory_stocktakes_insert_member ON public.inventory_stocktakes;
DROP POLICY IF EXISTS inventory_stocktakes_select_member ON public.inventory_stocktakes;
DROP POLICY IF EXISTS inventory_stocktakes_update_member ON public.inventory_stocktakes;
CREATE POLICY inventory_stocktakes_delete_member ON public.inventory_stocktakes FOR DELETE TO authenticated USING (private.is_business_member(business_id,(select auth.uid())));
CREATE POLICY inventory_stocktakes_insert_member ON public.inventory_stocktakes FOR INSERT TO authenticated WITH CHECK (private.is_business_member(business_id,(select auth.uid())));
CREATE POLICY inventory_stocktakes_select_member ON public.inventory_stocktakes FOR SELECT TO authenticated USING (private.is_business_member(business_id,(select auth.uid())));
CREATE POLICY inventory_stocktakes_update_member ON public.inventory_stocktakes FOR UPDATE TO authenticated USING (private.is_business_member(business_id,(select auth.uid()))) WITH CHECK (private.is_business_member(business_id,(select auth.uid())));
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS reserved_stock integer NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS in_transit_stock integer NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS blocked_stock integer NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS reorder_point integer NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS max_stock integer NOT NULL DEFAULT 0;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_reserved_stock_check, DROP CONSTRAINT IF EXISTS products_in_transit_stock_check, DROP CONSTRAINT IF EXISTS products_blocked_stock_check, DROP CONSTRAINT IF EXISTS products_reorder_point_check, DROP CONSTRAINT IF EXISTS products_max_stock_check;
ALTER TABLE public.products ADD CONSTRAINT products_reserved_stock_check CHECK (reserved_stock>=0), ADD CONSTRAINT products_in_transit_stock_check CHECK (in_transit_stock>=0), ADD CONSTRAINT products_blocked_stock_check CHECK (blocked_stock>=0), ADD CONSTRAINT products_reorder_point_check CHECK (reorder_point>=0), ADD CONSTRAINT products_max_stock_check CHECK (max_stock>=0);
CREATE TABLE IF NOT EXISTS public.inventory_movements (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE, product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT, quantity_delta numeric NOT NULL, stock_before integer NOT NULL, stock_after integer NOT NULL, movement_type text NOT NULL, reason text, source_type text, source_id uuid, created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT inventory_movements_stock_after_check CHECK(stock_after>=0));
CREATE INDEX IF NOT EXISTS idx_inventory_movements_business_date ON public.inventory_movements(business_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_date ON public.inventory_movements(product_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_source ON public.inventory_movements(business_id,source_type,source_id) WHERE source_type IS NOT NULL AND source_id IS NOT NULL;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inventory_movements_select_member ON public.inventory_movements;
CREATE POLICY inventory_movements_select_member ON public.inventory_movements FOR SELECT TO authenticated USING(private.is_business_member(business_id,(select auth.uid())));
CREATE OR REPLACE FUNCTION public.adjust_product_stock(p_product_id uuid,p_delta integer,p_reason text DEFAULT 'Ajuste manual',p_source_type text DEFAULT 'manual_adjustment',p_source_id uuid DEFAULT NULL) RETURNS TABLE(product_id uuid,stock_before integer,stock_after integer) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$ DECLARE v_business_id uuid; v_before integer; v_after integer; BEGIN IF p_delta=0 THEN RAISE EXCEPTION 'El ajuste de stock no puede ser cero' USING ERRCODE='22023'; END IF; SELECT p.business_id,p.stock INTO v_business_id,v_before FROM public.products p WHERE p.id=p_product_id FOR UPDATE; IF v_business_id IS NULL THEN RAISE EXCEPTION 'Producto no encontrado' USING ERRCODE='P0002'; END IF; IF NOT private.has_business_role(v_business_id,(select auth.uid()),ARRAY['owner'::member_role,'admin'::member_role,'staff'::member_role]) THEN RAISE EXCEPTION 'Sin permisos para ajustar inventario' USING ERRCODE='42501'; END IF; v_after:=v_before+p_delta; IF v_after<0 THEN RAISE EXCEPTION 'El ajuste dejaría el stock en negativo' USING ERRCODE='check_violation'; END IF; UPDATE public.products SET stock=v_after WHERE id=p_product_id; INSERT INTO public.inventory_movements(business_id,product_id,quantity_delta,stock_before,stock_after,movement_type,reason,source_type,source_id,created_by) VALUES(v_business_id,p_product_id,p_delta,v_before,v_after,'adjustment',NULLIF(trim(p_reason),''),p_source_type,p_source_id,(select auth.uid())); RETURN QUERY SELECT p_product_id,v_before,v_after; END; $$;
REVOKE ALL ON FUNCTION public.adjust_product_stock(uuid,integer,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.adjust_product_stock(uuid,integer,text,text,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION private.sync_transaction_cash_ledger() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$ BEGIN DELETE FROM public.financial_cash_ledger WHERE business_id=COALESCE(NEW.business_id,OLD.business_id) AND source_type='transaction' AND source_id=COALESCE(NEW.id,OLD.id); IF TG_OP='DELETE' THEN RETURN OLD; END IF; IF EXISTS(SELECT 1 FROM public.sales s WHERE s.business_id=NEW.business_id AND s.transaction_id=NEW.id) OR EXISTS(SELECT 1 FROM public.purchases p WHERE p.business_id=NEW.business_id AND p.transaction_id=NEW.id) THEN RETURN NEW; END IF; IF COALESCE(NEW.amount,0)>0 THEN INSERT INTO public.financial_cash_ledger(business_id,entry_date,direction,amount,category,description,payment_method,source_type,source_id) VALUES(NEW.business_id,NEW.tx_date,CASE WHEN NEW.type='income' THEN 'inflow' ELSE 'outflow' END,NEW.amount,COALESCE(NEW.category,'Otro'),NEW.description,NULL,'transaction',NEW.id) ON CONFLICT(business_id,source_type,source_id) DO UPDATE SET entry_date=excluded.entry_date,direction=excluded.direction,amount=excluded.amount,category=excluded.category,description=excluded.description,updated_at=now(); END IF; RETURN NEW; END; $$;
-- Sale/purchase stock triggers are extended in the next migration so their movement history remains compatible with existing deployments.
