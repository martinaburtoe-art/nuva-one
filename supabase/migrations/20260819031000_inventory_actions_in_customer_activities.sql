-- Reuse the existing customer_activities activity model for inventory actions.
-- Inventory activities are identified by product_id; CRM activities keep customer_id.
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
