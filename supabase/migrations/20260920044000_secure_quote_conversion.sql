-- Convert an accepted quote to a sale atomically and only for authorized business members.
create or replace function public.convert_quote_to_sale(p_quote_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_quote public.quotes%rowtype;
  v_business uuid;
  v_sale uuid;
  v_existing uuid;
begin
  select q.* into v_quote from public.quotes q where q.id = p_quote_id for update;
  if not found then raise exception 'Cotización no encontrada'; end if;

  v_business := v_quote.business_id;
  if not private.has_business_role(v_business, auth.uid(), array['owner','admin','staff']::public.member_role[]) then
    raise exception 'Sin permisos para convertir esta cotización';
  end if;

  select s.id into v_existing from public.sales s
  where s.business_id = v_business and s.quote_id = p_quote_id limit 1;
  if v_existing is not null then return v_existing; end if;

  if v_quote.status <> 'accepted' then
    raise exception 'La cotización debe estar aceptada antes de convertirla';
  end if;
  if jsonb_typeof(v_quote.items) <> 'array' or jsonb_array_length(v_quote.items) = 0 then
    raise exception 'La cotización no contiene productos';
  end if;

  insert into public.sales(
    business_id, customer_id, customer_name, channel, payment_method, status,
    total, notes, sale_date, items, quote_id, stock_applied, is_credit,
    due_date, paid_amount, pos_reference
  ) values (
    v_business, v_quote.customer_id, v_quote.customer_name, 'cotizacion', 'efectivo',
    'paid', v_quote.total, 'Generada desde cotización', current_date, v_quote.items,
    p_quote_id, false, false, null, v_quote.total,
    'QUOTE-' || substr(p_quote_id::text,1,12)
  ) returning id into v_sale;

  return v_sale;
end;
$$;

revoke execute on function public.convert_quote_to_sale(uuid) from public, anon;
grant execute on function public.convert_quote_to_sale(uuid) to authenticated;

create unique index if not exists sales_quote_id_unique
  on public.sales (quote_id) where quote_id is not null;
