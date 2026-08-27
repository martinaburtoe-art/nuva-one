create table if not exists public.pricing_calculations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  name text not null default 'Cálculo de precio',
  product_type text not null default 'resale' check (product_type in ('manufactured','resale','service','digital')),
  input_data jsonb not null default '{}'::jsonb,
  result_data jsonb not null default '{}'::jsonb,
  calculation_version text not null default '1.0.0',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pricing_calculations_business_created_idx on public.pricing_calculations(business_id, created_at desc);
create index if not exists pricing_calculations_business_product_idx on public.pricing_calculations(business_id, product_id);

alter table public.pricing_calculations enable row level security;

drop policy if exists pricing_calculations_select_member on public.pricing_calculations;
create policy pricing_calculations_select_member on public.pricing_calculations for select using (private.is_business_member(business_id, auth.uid()));

drop policy if exists pricing_calculations_insert_operator on public.pricing_calculations;
create policy pricing_calculations_insert_operator on public.pricing_calculations for insert with check (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role,'admin'::member_role,'staff'::member_role]));

drop policy if exists pricing_calculations_update_operator on public.pricing_calculations;
create policy pricing_calculations_update_operator on public.pricing_calculations for update using (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role,'admin'::member_role,'staff'::member_role])) with check (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role,'admin'::member_role,'staff'::member_role]));

drop policy if exists pricing_calculations_delete_operator on public.pricing_calculations;
create policy pricing_calculations_delete_operator on public.pricing_calculations for delete using (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role,'admin'::member_role]));

create or replace function public.set_pricing_calculation_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_pricing_calculations_updated_at on public.pricing_calculations;
create trigger trg_pricing_calculations_updated_at before update on public.pricing_calculations for each row execute function public.set_pricing_calculation_updated_at();
