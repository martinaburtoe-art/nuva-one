begin;
select plan(13);

insert into auth.users (id)
values ('00000000-0000-0000-0000-00000000a901');

insert into public.businesses (id, name, owner_id, plan)
values ('00000000-0000-0000-0000-00000000b901', 'Quote Conversion Test', '00000000-0000-0000-0000-00000000a901', 'starter');

insert into public.products (id, business_id, name, price, stock)
values ('00000000-0000-0000-0000-00000000c901', '00000000-0000-0000-0000-00000000b901', 'Quote Widget', 1000, 5);

insert into public.quotes (
  id, business_id, customer_name, items, subtotal, discount_pct, tax, total,
  status, tax_treatment, vat_rate, price_basis
) values (
  '00000000-0000-0000-0000-00000000d901',
  '00000000-0000-0000-0000-00000000b901',
  'Test Customer',
  jsonb_build_array(jsonb_build_object(
    'product_id', '00000000-0000-0000-0000-00000000c901',
    'name', 'Quote Widget',
    'qty', 2,
    'price', 1000
  )),
  2000, 0, 380, 2380, 'accepted', 'taxable', 19, 'net'
);

insert into public.quotes (
  id, business_id, customer_name, items, subtotal, tax, total, status
) values (
  '00000000-0000-0000-0000-00000000d902',
  '00000000-0000-0000-0000-00000000b901',
  'Second Customer',
  '[]'::jsonb, 0, 0, 0, 'draft'
);

select ok(
  (select quote_number = 1 from public.quotes where id = '00000000-0000-0000-0000-00000000d901'),
  'first quote receives the first per-business number'
);
select ok(
  (select quote_number = 2 from public.quotes where id = '00000000-0000-0000-0000-00000000d902'),
  'next quote receives the next per-business number'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a901', true);
select public.convert_quote_to_sale('00000000-0000-0000-0000-00000000d901');

reset role;
select is(
  (select status::text from public.sales where quote_id = '00000000-0000-0000-0000-00000000d901'),
  'draft',
  'accepted quote converts to a non-posting draft sale'
);
select is(
  (select paid_amount from public.sales where quote_id = '00000000-0000-0000-0000-00000000d901'),
  0::numeric,
  'conversion does not invent a customer payment'
);
select is(
  (select payment_method from public.sales where quote_id = '00000000-0000-0000-0000-00000000d901'),
  null::text,
  'conversion does not invent a payment method'
);
select is(
  (select is_credit from public.sales where quote_id = '00000000-0000-0000-0000-00000000d901'),
  true,
  'unpaid draft is protected from default paid-amount behavior'
);
select is(
  (select stock from public.products where id = '00000000-0000-0000-0000-00000000c901'),
  5,
  'quote conversion does not decrement inventory'
);
select is(
  (select count(*)::int from public.transactions where business_id = '00000000-0000-0000-0000-00000000b901'),
  0,
  'quote conversion does not create cash transactions'
);
select is(
  (select count(*)::int from public.accounting_journals where business_id = '00000000-0000-0000-0000-00000000b901'),
  0,
  'draft conversion does not post accounting journals'
);
select is(
  (select count(*)::int from public.financial_posting_queue where business_id = '00000000-0000-0000-0000-00000000b901' and source_type = 'sale'),
  0,
  'draft conversion does not queue a financial posting'
);
select is(
  (select count(*)::int from public.financial_cash_ledger where business_id = '00000000-0000-0000-0000-00000000b901' and source_type = 'sale'),
  0,
  'draft conversion does not create a cash-ledger inflow'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a901', true);
select is(
  public.convert_quote_to_sale('00000000-0000-0000-0000-00000000d901'),
  (select id from public.sales where quote_id = '00000000-0000-0000-0000-00000000d901'),
  'repeated conversion returns the same sale id'
);
reset role;

select is(
  (select count(*)::int from public.sales where quote_id = '00000000-0000-0000-0000-00000000d901'),
  1,
  'conversion is idempotent and creates one sale'
);

select * from finish();
rollback;
