create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  sale_id uuid references public.sales(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  status text not null default 'preparing' check (status in ('preparing','dispatched','in_transit','delivered','delayed','cancelled')),
  carrier text,
  tracking_number text,
  shipping_address text,
  eta date,
  dispatched_at timestamptz,
  delivered_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  status text not null check (status in ('preparing','dispatched','in_transit','delivered','delayed','cancelled')),
  note text,
  occurred_at timestamptz not null default now()
);

create index if not exists shipments_business_id_idx on public.shipments(business_id);
create index if not exists shipments_sale_id_idx on public.shipments(sale_id);
create index if not exists shipments_customer_id_idx on public.shipments(customer_id);
create index if not exists shipments_status_idx on public.shipments(business_id, status);
create index if not exists shipment_events_shipment_id_idx on public.shipment_events(shipment_id, occurred_at desc);

alter table public.shipments enable row level security;
alter table public.shipment_events enable row level security;

drop policy if exists shipments_select_member on public.shipments;
drop policy if exists shipments_insert_member on public.shipments;
drop policy if exists shipments_update_member on public.shipments;
drop policy if exists shipments_delete_member on public.shipments;
create policy shipments_select_member on public.shipments for select using (exists (select 1 from public.business_members bm where bm.business_id = shipments.business_id and bm.user_id = auth.uid()));
create policy shipments_insert_member on public.shipments for insert with check (exists (select 1 from public.business_members bm where bm.business_id = shipments.business_id and bm.user_id = auth.uid()));
create policy shipments_update_member on public.shipments for update using (exists (select 1 from public.business_members bm where bm.business_id = shipments.business_id and bm.user_id = auth.uid())) with check (exists (select 1 from public.business_members bm where bm.business_id = shipments.business_id and bm.user_id = auth.uid()));
create policy shipments_delete_member on public.shipments for delete using (exists (select 1 from public.business_members bm where bm.business_id = shipments.business_id and bm.user_id = auth.uid()));

drop policy if exists shipment_events_select_member on public.shipment_events;
drop policy if exists shipment_events_insert_member on public.shipment_events;
drop policy if exists shipment_events_update_member on public.shipment_events;
drop policy if exists shipment_events_delete_member on public.shipment_events;
create policy shipment_events_select_member on public.shipment_events for select using (exists (select 1 from public.business_members bm where bm.business_id = shipment_events.business_id and bm.user_id = auth.uid()));
create policy shipment_events_insert_member on public.shipment_events for insert with check (exists (select 1 from public.business_members bm where bm.business_id = shipment_events.business_id and bm.user_id = auth.uid()));
create policy shipment_events_update_member on public.shipment_events for update using (exists (select 1 from public.business_members bm where bm.business_id = shipment_events.business_id and bm.user_id = auth.uid())) with check (exists (select 1 from public.business_members bm where bm.business_id = shipment_events.business_id and bm.user_id = auth.uid()));
create policy shipment_events_delete_member on public.shipment_events for delete using (exists (select 1 from public.business_members bm where bm.business_id = shipment_events.business_id and bm.user_id = auth.uid()));