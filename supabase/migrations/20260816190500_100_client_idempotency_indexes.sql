-- 100-client readiness: remove duplicate tenant/time indexes and enforce webhook/queue idempotency.
-- Safe on an empty or populated database; uniqueness is partial so NULL keys remain allowed.

drop index if exists public.idx_ai_messages_conversation_created_at;
drop index if exists public.idx_billing_documents_business_created_at;
drop index if exists public.idx_whatsapp_messages_business_created_at;

create unique index if not exists idx_billing_emit_queue_business_idempotency
  on public.billing_emit_queue(business_id, idempotency_key)
  where idempotency_key is not null;

create unique index if not exists idx_payment_webhook_events_provider_token
  on public.payment_webhook_events(provider, token)
  where token is not null;
