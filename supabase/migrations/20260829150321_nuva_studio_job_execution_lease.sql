alter table public.nuva_studio_jobs add column if not exists execution_lock_token uuid;
create index if not exists nuva_studio_jobs_lease_idx on public.nuva_studio_jobs (locked_at) where status in ('queued','running');
