create table if not exists public.mobile_scanner_sessions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade default auth.uid(),
  pair_code_hash text not null,
  status text not null default 'pending' check (status in ('pending','paired','revoked','expired')),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  paired_at timestamptz,
  paired_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create index if not exists idx_mobile_scanner_sessions_business_active
  on public.mobile_scanner_sessions(business_id, status, expires_at);

create table if not exists public.mobile_scanner_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.mobile_scanner_sessions(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  code text not null,
  normalized_code text not null,
  input_type text not null default 'camera' check (input_type in ('camera','native','hid')),
  client_event_id uuid not null,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_mobile_scanner_events_session_client
  on public.mobile_scanner_events(session_id, client_event_id);
create index if not exists idx_mobile_scanner_events_session_created
  on public.mobile_scanner_events(session_id, created_at desc);

alter table public.mobile_scanner_sessions enable row level security;
alter table public.mobile_scanner_events enable row level security;

drop policy if exists "mobile scanner sessions member select" on public.mobile_scanner_sessions;
create policy "mobile scanner sessions member select"
  on public.mobile_scanner_sessions for select to authenticated
  using (private.is_business_member(business_id, auth.uid()));

drop policy if exists "mobile scanner events member select" on public.mobile_scanner_events;
create policy "mobile scanner events member select"
  on public.mobile_scanner_events for select to authenticated
  using (private.is_business_member(business_id, auth.uid()));

grant select on public.mobile_scanner_sessions, public.mobile_scanner_events to authenticated;

create or replace function public.create_mobile_scanner_session(p_business_id uuid)
returns table(session_id uuid, pair_code text, expires_at timestamptz)
language plpgsql security definer set search_path=public,private,extensions as $$
declare v_code text; v_id uuid; v_expires timestamptz := now() + interval '10 minutes';
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  if not private.is_business_member(p_business_id, auth.uid()) then raise exception 'NOT_BUSINESS_MEMBER'; end if;
  if not exists (select 1 from public.business_members bm where bm.business_id=p_business_id and bm.user_id=auth.uid() and bm.role in ('owner','admin','staff')) then raise exception 'NOT_AUTHORIZED'; end if;
  update public.mobile_scanner_sessions set status='expired' where business_id=p_business_id and status in ('pending','paired') and expires_at<=now();
  v_code := lpad((floor(random()*1000000))::int::text,6,'0');
  insert into public.mobile_scanner_sessions(id,business_id,created_by,pair_code_hash,expires_at)
    values(gen_random_uuid(),p_business_id,auth.uid(),crypt(v_code,gen_salt('bf')),v_expires) returning id into v_id;
  return query select v_id,v_code,v_expires;
end $$;

create or replace function public.pair_mobile_scanner(p_pair_code text)
returns table(session_id uuid,business_id uuid,expires_at timestamptz)
language plpgsql security definer set search_path=public,private,extensions as $$
declare v_session public.mobile_scanner_sessions%rowtype;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  select * into v_session from public.mobile_scanner_sessions s
   where s.status='pending' and s.expires_at>now()
     and crypt(trim(p_pair_code),s.pair_code_hash)=s.pair_code_hash
     and private.is_business_member(s.business_id,auth.uid())
   order by s.created_at desc limit 1 for update;
  if not found then raise exception 'PAIR_CODE_INVALID_OR_EXPIRED'; end if;
  update public.mobile_scanner_sessions set status='paired',paired_at=now(),paired_by=auth.uid(),last_seen_at=now() where id=v_session.id;
  return query select v_session.id,v_session.business_id,v_session.expires_at;
end $$;

create or replace function public.submit_mobile_scanner_event(
  p_session_id uuid, p_code text, p_client_event_id uuid, p_input_type text default 'camera'
)
returns public.mobile_scanner_events
language plpgsql security definer set search_path=public,private,extensions as $$
declare v_session public.mobile_scanner_sessions%rowtype; v_event public.mobile_scanner_events%rowtype; v_code text:=trim(regexp_replace(coalesce(p_code,''),'\\s+','','g'));
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  if length(v_code)=0 then raise exception 'INVALID_CODE'; end if;
  select * into v_session from public.mobile_scanner_sessions s
   where s.id=p_session_id and s.status='paired' and s.expires_at>now() and s.paired_by=auth.uid() for update;
  if not found then raise exception 'SCANNER_SESSION_INVALID'; end if;
  insert into public.mobile_scanner_events(session_id,business_id,code,normalized_code,input_type,client_event_id)
    values(v_session.id,v_session.business_id,v_code,v_code,case when p_input_type in ('camera','native','hid') then p_input_type else 'camera' end,p_client_event_id)
    on conflict(session_id,client_event_id) do update set code=excluded.code returning * into v_event;
  update public.mobile_scanner_sessions set last_seen_at=now() where id=v_session.id;
  return v_event;
end $$;

create or replace function public.revoke_mobile_scanner_session(p_session_id uuid)
returns void language plpgsql security definer set search_path=public,private as $$
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  update public.mobile_scanner_sessions set status='revoked' where id=p_session_id and created_by=auth.uid();
  if not found then raise exception 'NOT_AUTHORIZED'; end if;
end $$;

revoke all on function public.create_mobile_scanner_session(uuid) from public;
revoke all on function public.pair_mobile_scanner(text) from public;
revoke all on function public.submit_mobile_scanner_event(uuid,text,uuid,text) from public;
revoke all on function public.revoke_mobile_scanner_session(uuid) from public;
grant execute on function public.create_mobile_scanner_session(uuid) to authenticated;
grant execute on function public.pair_mobile_scanner(text) to authenticated;
grant execute on function public.submit_mobile_scanner_event(uuid,text,uuid,text) to authenticated;
grant execute on function public.revoke_mobile_scanner_session(uuid) to authenticated;

alter publication supabase_realtime add table public.mobile_scanner_events;
