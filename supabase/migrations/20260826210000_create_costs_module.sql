create table if not exists public.costs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  category text not null default 'Otros',
  cost_type text not null default 'operacional' check (cost_type in ('operacional','inventario','laboral','financiero','tributario','produccion','comercial','logistico','administrativo','otro')),
  behavior text not null default 'variable' check (behavior in ('fijo','variable','semivariable','extraordinario')),
  allocation text not null default 'indirecto' check (allocation in ('directo','indirecto')),
  description text not null,
  amount_net numeric(14,2) not null default 0 check (amount_net >= 0),
  vat_rate numeric(5,2) not null default 19 check (vat_rate >= 0 and vat_rate <= 100),
  vat_amount numeric(14,2) not null default 0 check (vat_amount >= 0),
  total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
  currency text not null default 'CLP',
  incurred_at date not null default current_date,
  due_date date,
  paid_at date,
  payment_status text not null default 'pending' check (payment_status in ('pending','partial','paid','cancelled')),
  payment_method text,
  document_type text not null default 'sin_documento' check (document_type in ('factura','factura_exenta','boleta','nota_credito','nota_debito','honorario','recibo','sin_documento','otro')),
  document_number text,
  tax_treatment text not null default 'pending' check (tax_treatment in ('deductible','non_deductible','temporary_difference','permanent_difference','pending','not_applicable')),
  cost_center text,
  recurring boolean not null default false,
  recurring_frequency text check (recurring_frequency is null or recurring_frequency in ('weekly','monthly','quarterly','yearly')),
  recurring_end_date date,
  notes text,
  transaction_id uuid references public.transactions(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists costs_business_date_idx on public.costs(business_id, incurred_at desc);
create index if not exists costs_business_category_idx on public.costs(business_id, category);
create index if not exists costs_business_status_idx on public.costs(business_id, payment_status);

alter table public.costs enable row level security;
create policy costs_select_member on public.costs for select using (private.is_business_member(business_id, auth.uid()));
create policy costs_insert_operator on public.costs for insert with check (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role,'admin'::member_role,'staff'::member_role]));
create policy costs_update_operator on public.costs for update using (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role,'admin'::member_role,'staff'::member_role])) with check (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role,'admin'::member_role,'staff'::member_role]));
create policy costs_delete_operator on public.costs for delete using (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role,'admin'::member_role]));

create or replace function public.sync_cost_transaction() returns trigger language plpgsql security definer set search_path = public as $$
declare tx_id uuid;
begin
  if new.transaction_id is null and new.payment_status <> 'cancelled' then
    insert into public.transactions(business_id,type,category,amount,description,tx_date)
    values(new.business_id,'expense',new.category,new.total_amount,new.description,new.incurred_at)
    returning id into tx_id;
    new.transaction_id := tx_id;
  elsif new.transaction_id is not null and tg_op = 'UPDATE' then
    update public.transactions set category=new.category, amount=new.total_amount, description=new.description, tx_date=new.incurred_at where id=new.transaction_id and business_id=new.business_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_cost_transaction on public.costs;
create trigger trg_cost_transaction before insert or update of category,total_amount,description,incurred_at,payment_status on public.costs for each row execute function public.sync_cost_transaction();

create or replace function public.set_cost_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;
drop trigger if exists trg_cost_updated_at on public.costs;
create trigger trg_cost_updated_at before update on public.costs for each row execute function public.set_cost_updated_at();
