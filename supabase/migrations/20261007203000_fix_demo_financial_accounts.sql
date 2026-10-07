-- Bootstrap del plan contable para negocios nuevos y reparación del demo existente.

create or replace function private.seed_financial_accounts_on_business_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.accounting_accounts
    (business_id, code, name, account_type, tax_category, system_key)
  values
    (new.id,'1.01.01','Caja','asset','cash','cash'),
    (new.id,'1.01.02','Bancos','asset','bank','bank'),
    (new.id,'1.01.03','Clientes por cobrar','asset','receivable','accounts_receivable'),
    (new.id,'1.01.04','IVA crédito fiscal','asset','vat_credit','vat_credit'),
    (new.id,'1.02.01','Inventarios','asset','inventory','inventory'),
    (new.id,'1.03.01','Activos fijos','asset','fixed_asset','fixed_assets'),
    (new.id,'2.01.01','Proveedores','liability','payable','accounts_payable'),
    (new.id,'2.01.02','IVA débito fiscal','liability','vat_debit','vat_debit'),
    (new.id,'2.01.03','IVA por pagar','liability','vat_payable','vat_payable'),
    (new.id,'2.01.04','PPM por pagar','liability','ppm','ppm_payable'),
    (new.id,'3.01.01','Capital','equity','equity','equity'),
    (new.id,'4.01.01','Ventas','revenue','sales','sales_revenue'),
    (new.id,'5.01.01','Costo de ventas','cost_of_sales','cogs','cost_of_sales'),
    (new.id,'6.01.01','Gastos operacionales','expense','operating_expense','operating_expense'),
    (new.id,'7.01.01','Otros ingresos','other_income','other_income','other_income'),
    (new.id,'8.01.01','Otros gastos','other_expense','other_expense','other_expense')
  on conflict (business_id,code) do update
    set name=excluded.name, system_key=excluded.system_key;
  return new;
end;
$$;

revoke all on function private.seed_financial_accounts_on_business_created() from public;
revoke all on function private.seed_financial_accounts_on_business_created() from anon;
revoke all on function private.seed_financial_accounts_on_business_created() from authenticated;

drop trigger if exists trg_seed_financial_accounts on public.businesses;
create trigger trg_seed_financial_accounts
after insert on public.businesses
for each row
execute function private.seed_financial_accounts_on_business_created();

insert into public.accounting_accounts
  (business_id, code, name, account_type, tax_category, system_key)
select
  '06372cb0-832f-4303-9ce9-95c49df05a24'::uuid, v.code, v.name, v.account_type, v.tax_category, v.system_key
from (values
  ('1.01.01','Caja','asset','cash','cash'),
  ('1.01.02','Bancos','asset','bank','bank'),
  ('1.01.03','Clientes por cobrar','asset','receivable','accounts_receivable'),
  ('1.01.04','IVA crédito fiscal','asset','vat_credit','vat_credit'),
  ('1.02.01','Inventarios','asset','inventory','inventory'),
  ('1.03.01','Activos fijos','asset','fixed_asset','fixed_assets'),
  ('2.01.01','Proveedores','liability','payable','accounts_payable'),
  ('2.01.02','IVA débito fiscal','liability','vat_debit','vat_debit'),
  ('2.01.03','IVA por pagar','liability','vat_payable','vat_payable'),
  ('2.01.04','PPM por pagar','liability','ppm','ppm_payable'),
  ('3.01.01','Capital','equity','equity','equity'),
  ('4.01.01','Ventas','revenue','sales','sales_revenue'),
  ('5.01.01','Costo de ventas','cost_of_sales','cogs','cost_of_sales'),
  ('6.01.01','Gastos operacionales','expense','operating_expense','operating_expense'),
  ('7.01.01','Otros ingresos','other_income','other_income','other_income'),
  ('8.01.01','Otros gastos','other_expense','other_expense','other_expense')
) as v(code,name,account_type,tax_category,system_key)
on conflict (business_id,code) do update
set name=excluded.name, system_key=excluded.system_key;

do $$
declare r record;
begin
  for r in
    select id from public.sales
    where business_id='06372cb0-832f-4303-9ce9-95c49df05a24'
      and status='paid'
      and accounting_posting_status <> 'posted'
  loop
    perform public.post_sale_accounting(r.id);
  end loop;
  for r in
    select id from public.purchases
    where business_id='06372cb0-832f-4303-9ce9-95c49df05a24'
      and status in ('received','paid')
      and accounting_posting_status <> 'posted'
  loop
    perform public.post_purchase_accounting(r.id);
  end loop;
end;
$$;
