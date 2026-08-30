alter table public.nuva_studio_campaign_cycles
  add column if not exists execution_attempts integer not null default 0;

alter table public.nuva_studio_campaign_cycles
  drop constraint if exists nuva_studio_campaign_cycles_execution_attempts_check;

alter table public.nuva_studio_campaign_cycles
  add constraint nuva_studio_campaign_cycles_execution_attempts_check
  check (execution_attempts >= 0 and execution_attempts <= 1000);
