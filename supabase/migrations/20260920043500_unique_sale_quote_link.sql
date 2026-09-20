-- A quote can be converted into at most one sale.
create unique index if not exists sales_quote_id_unique
  on public.sales (quote_id)
  where quote_id is not null;
