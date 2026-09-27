-- Remove retired integration surfaces from the canonical migration history.
-- n8n is no longer part of Nüva One; WhatsApp is intentionally out of scope.

begin;

drop table if exists public.n8n_event_outbox cascade;

delete from public.ai_conversations where channel::text = 'whatsapp';

alter type public.ai_channel rename to ai_channel_legacy;
create type public.ai_channel as enum ('web');
alter table public.ai_conversations
  alter column channel type public.ai_channel
  using channel::text::public.ai_channel;
drop type public.ai_channel_legacy;

alter table public.businesses drop column if exists webhook_url;

commit;
