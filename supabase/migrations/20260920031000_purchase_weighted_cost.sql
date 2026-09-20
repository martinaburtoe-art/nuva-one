-- Keep purchase receipt effects atomic while updating weighted-average product cost.
create or replace function public.apply_purchase_effects()
returns trigger language plpgsql security definer set search_path=public,pg_temp
as $function$
declare item jsonb; tx_id uuid; updated_id uuid; stock_after int; qty_needed int;
  unit_cost numeric; old_cost numeric; new_cost numeric;
begin
  if NEW.status in ('received','paid') and not NEW.stock_applied then
    for item in select * from jsonb_array_elements(coalesce(NEW.items,'[]'::jsonb)) loop
      if nullif(item->>'product_id','') is not null then
        qty_needed:=coalesce((item->>'qty')::int,0);
        unit_cost:=greatest(coalesce((item->>'unit_cost')::numeric,(item->>'cost')::numeric,0),0);
        if qty_needed<=0 then raise exception 'La cantidad comprada debe ser mayor que cero' using errcode='22023'; end if;
        update public.products set stock=stock+qty_needed where id=(item->>'product_id')::uuid and business_id=NEW.business_id
          returning id,stock,cost into updated_id,stock_after,old_cost;
        if updated_id is null then raise exception 'Producto de compra no encontrado en el negocio' using errcode='foreign_key_violation'; end if;
        if unit_cost>0 then
          new_cost:=case when old_cost>0 then ((old_cost*greatest(stock_after-qty_needed,0))+(unit_cost*qty_needed))/nullif(stock_after,0) else unit_cost end;
          update public.products set cost=round(new_cost,2), in_transit_stock=greatest(0,in_transit_stock-qty_needed) where id=updated_id;
        else
          update public.products set in_transit_stock=greatest(0,in_transit_stock-qty_needed) where id=updated_id;
        end if;
        insert into public.inventory_movements(business_id,product_id,quantity_delta,stock_before,stock_after,movement_type,reason,source_type,source_id)
        values(NEW.business_id,updated_id,qty_needed,stock_after-qty_needed,stock_after,'purchase','Entrada por compra','purchase',NEW.id);
      end if;
    end loop;
    if NEW.transaction_id is null and NEW.total>0 then
      insert into public.transactions(business_id,type,category,amount,description,tx_date)
      values(NEW.business_id,'expense',coalesce(NEW.category,'Otro'),NEW.total,'Compra: '||coalesce(NEW.supplier_name,'Proveedor'),NEW.purchase_date)
      returning id into tx_id;
      NEW.transaction_id:=tx_id;
    end if;
    NEW.stock_applied:=true;
  end if;
  return NEW;
end;$function$;
