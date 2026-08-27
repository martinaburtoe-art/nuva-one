-- CRM activity baseline was missing from the clean migration chain.
-- Keep this migration backward-compatible with existing deployments while making
-- a clean rebuild self-contained before inventory actions extend the activity model.
create table if not exists public.customer_activities (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  activity_type text not null default 'task',
  title text not null default 'Actividad',
  description text,
  notes text,
  due_date timestamptz,
  completed boolean not null default false,
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customer_activities_business_due
  on public.customer_activities (business_id, due_date);
create index if not exists idx_customer_activities_business_customer
  on public.customer_activities (business_id, customer_id);

alter table public.customer_activities enable row level security;

drop policy if exists customer_activities_select_member on public.customer_activities;
drop policy if exists customer_activities_insert_member on public.customer_activities;
drop policy if exists customer_activities_update_member on public.customer_activities;
drop policy if exists customer_activities_delete_member on public.customer_activities;

create policy customer_activities_select_member
  on public.customer_activities for select to authenticated
  using (private.is_business_member(business_id, (select auth.uid())));
create policy customer_activities_insert_member
  on public.customer_activities for insert to authenticated
  with check (private.is_business_member(business_id, (select auth.uid())));
create policy customer_activities_update_member
  on public.customer_activities for update to authenticated
  using (private.is_business_member(business_id, (select auth.uid())))
  with check (private.is_business_member(business_id, (select auth.uid())));
create policy customer_activities_delete_member
  on public.customer_activities for delete to authenticated
  using (private.is_business_member(business_id, (select auth.uid())));

-- Inventory actions are identified by product_id; CRM activities keep customer_id.
alter table public.customer_activities
  alter column customer_id drop not null;

alter table public.customer_activities
  add column if not exists product_id uuid references public.products(id) on delete cascade;

alter table public.customer_activities
  add constraint customer_activities_entity_check
  check (customer_id is not null or product_id is not null);

create index if not exists idx_customer_activities_business_product
  on public.customer_activities (business_id, product_id, completed, due_date);

comment on column public.customer_activities.product_id is
  'Optional inventory entity for operational actions; when set, activity is traceable to a product.';
