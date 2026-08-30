-- Reconcile schema changes already present in the connected production project but missing
-- from the migration set used by CI. Keep this migration additive/idempotent.

alter table if exists public.forum_topics
  add column if not exists views integer not null default 0;

create or replace function public.increment_forum_topic_views(topic_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.forum_topics
  set views = views + 1
  where id = topic_id;
$$;

revoke execute on function public.increment_forum_topic_views(uuid) from anon;
grant execute on function public.increment_forum_topic_views(uuid) to authenticated;

alter table if exists public.subscription_charges
  add column if not exists attempt_started_at timestamptz;

create index if not exists subscription_charges_attempt_started_idx
  on public.subscription_charges(business_id, attempt_started_at)
  where attempt_started_at is not null;
