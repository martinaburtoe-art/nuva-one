create table if not exists public.owner_telegram_sessions (
  chat_id bigint primary key,
  agent_id text not null default 'orchestrator',
  last_update_id bigint,
  updated_at timestamptz not null default now(),
  constraint owner_telegram_sessions_agent_id_check check (
    agent_id in (
      'constructor','orchestrator','finance','sales','supply','people',
      'compliance','growth','security','qa','sentinel','ux','release'
    )
  )
);

alter table public.owner_telegram_sessions enable row level security;

drop policy if exists "owner_telegram_sessions_deny_all" on public.owner_telegram_sessions;
create policy "owner_telegram_sessions_deny_all"
  on public.owner_telegram_sessions
  as restrictive
  for all
  to public
  using (false)
  with check (false);

create index if not exists owner_telegram_sessions_updated_at_idx
  on public.owner_telegram_sessions (updated_at desc);

comment on table public.owner_telegram_sessions is
  'Private Nüva Agency Telegram control-plane session state. Accessed only by trusted server-side workers.';
