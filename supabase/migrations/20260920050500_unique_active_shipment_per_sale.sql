create unique index if not exists shipments_active_sale_unique on public.shipments (sale_id) where sale_id is not null and status <> 'cancelled';
