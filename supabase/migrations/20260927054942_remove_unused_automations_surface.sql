-- Retired automation UI had no active application references.
-- Keep the hosted schema and repository migration history aligned.
drop table if exists public.automations cascade;
