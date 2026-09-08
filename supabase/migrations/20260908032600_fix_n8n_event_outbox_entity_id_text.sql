alter table public.n8n_event_outbox
  alter column entity_id type text using entity_id::text;
