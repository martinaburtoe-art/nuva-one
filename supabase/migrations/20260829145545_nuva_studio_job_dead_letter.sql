alter table public.nuva_studio_jobs drop constraint if exists nuva_studio_jobs_status_check;
alter table public.nuva_studio_jobs add constraint nuva_studio_jobs_status_check check (status in ('queued','running','waiting','completed','partial','blocked','failed','cancelled','dead_letter'));
