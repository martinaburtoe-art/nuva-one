alter table public.n8n_event_outbox
  add column if not exists next_attempt_at timestamptz not null default now();

create index if not exists n8n_event_outbox_delivery_retry_idx
  on public.n8n_event_outbox(status, next_attempt_at, created_at);
