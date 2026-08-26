alter table public.businesses
  add column if not exists billing_provider text not null default 'none',
  add column if not exists mercadopago_preapproval_id text,
  add column if not exists mercadopago_customer_id text;

alter table public.subscription_charges
  add column if not exists provider text not null default 'flow',
  add column if not exists provider_payment_id text,
  add column if not exists provider_subscription_id text;

create index if not exists idx_businesses_mp_preapproval
  on public.businesses (mercadopago_preapproval_id)
  where mercadopago_preapproval_id is not null;

create index if not exists idx_subscription_charges_provider_payment
  on public.subscription_charges (provider, provider_payment_id)
  where provider_payment_id is not null;
