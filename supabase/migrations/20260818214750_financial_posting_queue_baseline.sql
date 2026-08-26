-- Compatibility baseline: the control-center view is created at 21:48, while
-- the full posting workflow migration is intentionally sequenced at 21:50.
-- Keep the table available before the earlier view references it.
create table if not exists public.financial_posting_queue (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  source_type text not null check (source_type in ('sale','purchase')),
  source_id uuid not null,
  source_date date not null,
  gross_amount numeric(18,2) not null check (gross_amount >= 0),
  status text not null default 'pending' check (status in ('pending','approved','posted','blocked','cancelled')),
  reason text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  accounting_journal_id uuid references public.accounting_journals(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, source_type, source_id)
);

create index if not exists financial_posting_queue_business_status_idx
  on public.financial_posting_queue (business_id, status, created_at desc);

alter table public.financial_posting_queue enable row level security;

revoke all on public.financial_posting_queue from anon;
revoke all on public.financial_posting_queue from authenticated;

grant select, insert, update, delete on public.financial_posting_queue to authenticated;
