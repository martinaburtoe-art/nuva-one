-- Stable browser/app device identity, independent from one-time pairing and renewable session leases.
-- A device key is a locator only: it never authenticates or grants business access.
create table if not exists public.mobile_scanner_devices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  device_key uuid not null,
  display_name text not null default 'Nüva Mobile'
    check (length(btrim(display_name)) between 1 and 80),
  created_by uuid not null references auth.users(id) on delete restrict,
  last_paired_by uuid references auth.users(id) on delete set null,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_mobile_scanner_devices_business_key unique (business_id, device_key),
  constraint uq_mobile_scanner_devices_id_business unique (id, business_id)
);

alter table public.mobile_scanner_sessions
  add column if not exists device_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.mobile_scanner_sessions'::regclass
      and conname = 'mobile_scanner_sessions_device_business_fk'
  ) then
    alter table public.mobile_scanner_sessions
      add constraint mobile_scanner_sessions_device_business_fk
      foreign key (device_id, business_id)
      references public.mobile_scanner_devices(id, business_id)
      on delete set null (device_id);
  end if;
end
$$;

create index if not exists idx_mobile_scanner_devices_business_seen
  on public.mobile_scanner_devices(business_id, last_seen_at desc)
  where revoked_at is null;
create index if not exists idx_mobile_scanner_sessions_device
  on public.mobile_scanner_sessions(device_id, status, last_seen_at desc)
  where device_id is not null;

alter table public.mobile_scanner_devices enable row level security;
drop policy if exists mobile_scanner_devices_select_member on public.mobile_scanner_devices;
create policy mobile_scanner_devices_select_member
  on public.mobile_scanner_devices
  for select to authenticated
  using (private.is_business_member(business_id, (select auth.uid())));
grant select on public.mobile_scanner_devices to authenticated;

create or replace function private.pair_mobile_scanner_device(
  p_pair_code text,
  p_device_key uuid,
  p_device_name text default 'Nüva Mobile'
)
returns table(session_id uuid, business_id uuid, expires_at timestamptz, device_id uuid)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_paired record;
  v_device_id uuid;
  v_name text := coalesce(nullif(left(btrim(p_device_name), 80), ''), 'Nüva Mobile');
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;
  if p_device_key is null then
    raise exception 'DEVICE_KEY_REQUIRED' using errcode = '22023';
  end if;

  select * into v_paired
  from private.pair_mobile_scanner(p_pair_code);
  if not found then
    return;
  end if;

  insert into public.mobile_scanner_devices(
    business_id, device_key, display_name, created_by, last_paired_by, last_seen_at, updated_at
  ) values (
    v_paired.business_id, p_device_key, v_name, auth.uid(), auth.uid(), now(), now()
  )
  on conflict (business_id, device_key) do update
  set display_name = excluded.display_name,
      last_paired_by = excluded.last_paired_by,
      last_seen_at = now(),
      updated_at = now()
  where public.mobile_scanner_devices.revoked_at is null
  returning id into v_device_id;

  if v_device_id is null then
    update public.mobile_scanner_sessions
    set status = 'revoked'
    where id = v_paired.session_id and paired_by = auth.uid();
    raise exception 'DEVICE_REVOKED' using errcode = '42501';
  end if;

  update public.mobile_scanner_sessions
  set device_id = v_device_id, device_name = v_name
  where id = v_paired.session_id
    and business_id = v_paired.business_id
    and paired_by = auth.uid()
    and status = 'paired';
  if not found then
    raise exception 'SCANNER_SESSION_INVALID' using errcode = '42501';
  end if;

  return query select v_paired.session_id, v_paired.business_id, v_paired.expires_at, v_device_id;
end;
$$;

create or replace function public.pair_mobile_scanner_device(
  p_pair_code text,
  p_device_key uuid,
  p_device_name text default 'Nüva Mobile'
)
returns table(session_id uuid, business_id uuid, expires_at timestamptz, device_id uuid)
language sql
set search_path = public, private
as $$ select * from private.pair_mobile_scanner_device($1, $2, $3); $$;

create or replace function private.revoke_mobile_scanner_device(p_device_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_business_id uuid;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  update public.mobile_scanner_devices d
  set revoked_at = coalesce(d.revoked_at, now()), updated_at = now()
  where d.id = p_device_id
    and (
      d.created_by = auth.uid()
      or d.last_paired_by = auth.uid()
      or exists (select 1 from public.mobile_scanner_sessions s where s.device_id = d.id and s.created_by = auth.uid())
      or private.has_business_role(d.business_id, auth.uid(), array['owner'::member_role,'admin'::member_role])
    )
  returning d.business_id into v_business_id;

  if v_business_id is null then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  update public.mobile_scanner_sessions
  set status = 'revoked'
  where device_id = p_device_id and business_id = v_business_id and status = 'paired';
end;
$$;

create or replace function public.revoke_mobile_scanner_device(p_device_id uuid)
returns void
language sql
set search_path = public, private
as $$ select private.revoke_mobile_scanner_device($1); $$;

-- A revoked stable device cannot keep renewing, changing context, or submitting scans
-- even if a stale browser still holds an unexpired session lease.
create or replace function private.heartbeat_mobile_scanner_session(p_session_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_expires timestamptz;
  v_device_id uuid;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED' using errcode = '42501'; end if;
  update public.mobile_scanner_sessions s
  set last_seen_at = now(), expires_at = now() + interval '30 days'
  where s.id = p_session_id
    and s.status = 'paired'
    and s.expires_at > now()
    and s.paired_by = auth.uid()
    and private.has_business_role(s.business_id, auth.uid(), array['owner'::member_role,'admin'::member_role,'staff'::member_role])
    and (
      s.device_id is null
      or exists (
        select 1 from public.mobile_scanner_devices d
        where d.id = s.device_id and d.business_id = s.business_id and d.revoked_at is null
      )
    )
  returning s.expires_at, s.device_id into v_expires, v_device_id;
  if v_expires is null then raise exception 'SCANNER_SESSION_INVALID' using errcode = '42501'; end if;
  if v_device_id is not null then
    update public.mobile_scanner_devices
    set last_seen_at = now(), updated_at = now()
    where id = v_device_id and revoked_at is null;
  end if;
  return v_expires;
end;
$$;

create or replace function private.set_mobile_scanner_context(
  p_session_id uuid,
  p_module text,
  p_operation_id uuid default null,
  p_device_name text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_uid uuid := (select auth.uid());
  v_device_id uuid;
  v_business_id uuid;
  v_name text := nullif(left(btrim(p_device_name), 80), '');
begin
  if v_uid is null then raise exception 'UNAUTHENTICATED' using errcode = '42501'; end if;
  if p_module not in ('pos','inventory','receiving','picking','dispatch','returns','transfers') then
    raise exception 'INVALID_DEVICE_MODULE' using errcode = '22023';
  end if;
  if p_operation_id is null then
    raise exception 'OPERATION_CONTEXT_REQUIRED' using errcode = '22023';
  end if;
  if p_module = 'inventory' and not exists (
    select 1 from public.inventory_stocktakes st
    join public.mobile_scanner_sessions current_session on current_session.business_id = st.business_id
    where current_session.id = p_session_id
      and st.id = p_operation_id and st.status = 'counting'
  ) then
    raise exception 'STOCKTAKE_NOT_OPEN' using errcode = '22023';
  end if;
  update public.mobile_scanner_sessions s
  set active_module = p_module,
      active_operation_id = p_operation_id,
      device_name = coalesce(v_name, s.device_name),
      last_seen_at = now()
  where s.id = p_session_id
    and s.status = 'paired'
    and s.expires_at > now()
    and s.paired_by = v_uid
    and private.has_business_role(s.business_id, v_uid, array['owner'::member_role,'admin'::member_role,'staff'::member_role])
    and (
      s.device_id is null
      or exists (
        select 1 from public.mobile_scanner_devices d
        where d.id = s.device_id and d.business_id = s.business_id and d.revoked_at is null
      )
    )
  returning s.device_id, s.business_id into v_device_id, v_business_id;
  if not found then raise exception 'SCANNER_SESSION_INVALID' using errcode = '42501'; end if;
  if v_device_id is not null then
    update public.mobile_scanner_devices
    set display_name = coalesce(v_name, display_name),
        last_seen_at = now(),
        updated_at = now()
    where id = v_device_id and business_id = v_business_id and revoked_at is null;
  end if;
end;
$$;

create or replace function private.submit_mobile_scanner_event(
  p_session_id uuid, p_code text, p_client_event_id uuid, p_input_type text default 'camera'
)
returns public.mobile_scanner_events
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  v_session public.mobile_scanner_sessions%rowtype;
  v_event public.mobile_scanner_events%rowtype;
  v_code text := trim(regexp_replace(coalesce(p_code, ''), '[[:space:]]+', '', 'g'));
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED' using errcode = '42501'; end if;
  if length(v_code) = 0 or length(v_code) > 128 then raise exception 'INVALID_CODE' using errcode = '22023'; end if;
  if p_client_event_id is null then raise exception 'CLIENT_EVENT_ID_REQUIRED' using errcode = '22023'; end if;
  select * into v_session
  from public.mobile_scanner_sessions s
  where s.id = p_session_id and s.status = 'paired'
    and s.expires_at > now() and s.paired_by = auth.uid()
    and private.has_business_role(s.business_id, auth.uid(), array['owner'::member_role,'admin'::member_role,'staff'::member_role])
    and (
      s.device_id is null
      or exists (
        select 1 from public.mobile_scanner_devices d
        where d.id = s.device_id and d.business_id = s.business_id and d.revoked_at is null
      )
    )
  for update;
  if not found then raise exception 'SCANNER_SESSION_INVALID' using errcode = '42501'; end if;
  insert into public.mobile_scanner_events(
    session_id, business_id, code, normalized_code, input_type,
    client_event_id, module, operation_id
  ) values (
    v_session.id, v_session.business_id, v_code, upper(v_code),
    case when p_input_type in ('camera','native','hid') then p_input_type else 'camera' end,
    p_client_event_id, v_session.active_module, v_session.active_operation_id
  )
  on conflict (session_id, client_event_id) do nothing;
  select * into v_event from public.mobile_scanner_events
  where session_id = v_session.id and client_event_id = p_client_event_id;
  update public.mobile_scanner_sessions set last_seen_at = now() where id = v_session.id;
  if v_session.device_id is not null then
    update public.mobile_scanner_devices
    set last_seen_at = now(), updated_at = now()
    where id = v_session.device_id and revoked_at is null;
  end if;
  return v_event;
end;
$$;

revoke all on function private.pair_mobile_scanner_device(text,uuid,text) from public, anon, authenticated;
revoke all on function private.revoke_mobile_scanner_device(uuid) from public, anon, authenticated;
revoke all on function public.pair_mobile_scanner_device(text,uuid,text) from public, anon;
revoke all on function public.revoke_mobile_scanner_device(uuid) from public, anon;
grant execute on function private.pair_mobile_scanner_device(text,uuid,text) to authenticated;
grant execute on function private.revoke_mobile_scanner_device(uuid) to authenticated;
grant execute on function public.pair_mobile_scanner_device(text,uuid,text) to authenticated;
grant execute on function public.revoke_mobile_scanner_device(uuid) to authenticated;
