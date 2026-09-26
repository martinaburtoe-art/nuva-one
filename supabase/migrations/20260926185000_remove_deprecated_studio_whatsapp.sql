-- Remove deprecated product areas that are no longer part of Nüva One.
-- Nüva Studio is superseded by Nüva Intelligence + Nüva Agent Council.
-- WhatsApp integration is intentionally out of scope for the current product.
-- Legacy WhatsApp collection/quote reminder tables are removed as well.

begin;

drop view if exists public.whatsapp_connections_safe cascade;
drop table if exists public.whatsapp_messages cascade;
drop table if exists public.whatsapp_owner_links cascade;
drop table if exists public.whatsapp_connections cascade;
drop table if exists public.collection_reminders cascade;
drop table if exists public.quote_followups cascade;

drop table if exists public.nuva_studio_campaign_evaluations cascade;
drop table if exists public.nuva_studio_campaign_metrics cascade;
drop table if exists public.nuva_studio_campaign_cycles cascade;
drop table if exists public.nuva_studio_campaigns cascade;
drop table if exists public.nuva_studio_job_callbacks cascade;
drop table if exists public.nuva_studio_job_steps cascade;
drop table if exists public.nuva_studio_jobs cascade;

drop function if exists public.nuva_studio_job_steps_set_updated_at();
drop function if exists public.nuva_studio_jobs_set_updated_at();

commit;
