CREATE OR REPLACE FUNCTION public.finalize_inventory_stocktake(p_stocktake_id uuid)
RETURNS TABLE(stocktake_id uuid, status text, adjusted_products integer, total_adjustment numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_stocktake public.inventory_stocktakes%ROWTYPE;
  v_line record;
  v_before integer;
  v_after integer;
  v_adjusted integer := 0;
  v_total numeric := 0;
  v_uid uuid := (select auth.uid());
BEGIN
  SELECT * INTO v_stocktake
  FROM public.inventory_stocktakes
  WHERE id = p_stocktake_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conteo de inventario no encontrado' USING ERRCODE = 'P0002';
  END IF;

  IF NOT private.has_business_role(v_stocktake.business_id, v_uid, ARRAY['owner'::member_role,'admin'::member_role,'staff'::member_role]) THEN
    RAISE EXCEPTION 'Sin permisos para finalizar este conteo' USING ERRCODE = '42501';
  END IF;

  IF v_stocktake.status = 'completed' THEN
    RETURN QUERY SELECT v_stocktake.id, v_stocktake.status, 0, 0::numeric;
    RETURN;
  END IF;

  IF v_stocktake.status <> 'counting' THEN
    RAISE EXCEPTION 'El conteo debe estar en estado counting para finalizarlo' USING ERRCODE = '55000';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.inventory_stocktake_lines l WHERE l.stocktake_id = v_stocktake.id) THEN
    RAISE EXCEPTION 'No se puede finalizar un conteo sin líneas guardadas' USING ERRCODE = '22023';
  END IF;

  FOR v_line IN
    SELECT l.*
    FROM public.inventory_stocktake_lines l
    WHERE l.stocktake_id = v_stocktake.id
      AND l.business_id = v_stocktake.business_id
    ORDER BY l.product_id
  LOOP
    IF v_line.product_id IS NULL THEN
      RAISE EXCEPTION 'Una línea del conteo no tiene producto' USING ERRCODE = '23502';
    END IF;

    IF v_line.counted_qty < 0 THEN
      RAISE EXCEPTION 'La cantidad contada no puede ser negativa' USING ERRCODE = '22023';
    END IF;

    IF v_line.difference IS DISTINCT FROM (v_line.counted_qty - v_line.system_qty) THEN
      RAISE EXCEPTION 'La diferencia de una línea no coincide con sistema vs contado' USING ERRCODE = '23514';
    END IF;

    SELECT p.stock INTO v_before
    FROM public.products p
    WHERE p.id = v_line.product_id
      AND p.business_id = v_stocktake.business_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto de la línea no pertenece al negocio' USING ERRCODE = '42501';
    END IF;

    v_after := v_before + round(v_line.difference)::integer;
    IF v_after < 0 THEN
      RAISE EXCEPTION 'El ajuste dejaría stock negativo para el producto %', v_line.product_id USING ERRCODE = '23514';
    END IF;

    IF v_line.difference <> 0 THEN
      UPDATE public.products SET stock = v_after WHERE id = v_line.product_id;
      INSERT INTO public.inventory_movements (
        business_id, product_id, quantity_delta, stock_before, stock_after,
        movement_type, reason, source_type, source_id, created_by
      ) VALUES (
        v_stocktake.business_id, v_line.product_id, round(v_line.difference), v_before, v_after,
        'count_adjustment', 'Ajuste por conteo de inventario', 'inventory_stocktake', v_stocktake.id, v_uid
      );
      v_adjusted := v_adjusted + 1;
      v_total := v_total + v_line.difference;
    END IF;
  END LOOP;

  UPDATE public.inventory_stocktakes
  SET status = 'completed', completed_at = now(), completed_by = v_uid
  WHERE id = v_stocktake.id;

  RETURN QUERY SELECT v_stocktake.id, 'completed'::text, v_adjusted, v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_inventory_stocktake(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_inventory_stocktake(uuid) TO authenticated;
