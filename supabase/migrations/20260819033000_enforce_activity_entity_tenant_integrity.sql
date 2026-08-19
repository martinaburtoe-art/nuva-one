-- Prevent activities from referencing an entity owned by another business.
alter table public.products
  add constraint products_business_id_id_key unique (business_id, id);

alter table public.customers
  add constraint customers_business_id_id_key unique (business_id, id);

alter table public.customer_activities
  add constraint customer_activities_business_product_fkey
  foreign key (business_id, product_id)
  references public.products (business_id, id)
  on delete cascade;

alter table public.customer_activities
  add constraint customer_activities_business_customer_fkey
  foreign key (business_id, customer_id)
  references public.customers (business_id, id)
  on delete cascade;
