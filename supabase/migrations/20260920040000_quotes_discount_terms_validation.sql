alter table public.quotes
  add column if not exists discount_pct numeric not null default 0,
  add column if not exists terms text;

alter table public.quotes
  drop constraint if exists quotes_discount_pct_check,
  add constraint quotes_discount_pct_check check (discount_pct >= 0 and discount_pct <= 100),
  drop constraint if exists quotes_subtotal_nonnegative_check,
  add constraint quotes_subtotal_nonnegative_check check (subtotal >= 0),
  drop constraint if exists quotes_tax_nonnegative_check,
  add constraint quotes_tax_nonnegative_check check (tax >= 0),
  drop constraint if exists quotes_total_nonnegative_check,
  add constraint quotes_total_nonnegative_check check (total >= 0);
