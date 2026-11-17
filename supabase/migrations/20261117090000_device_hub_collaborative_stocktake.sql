-- Device Hub foundation: durable mobile leases and idempotent collaborative stocktake events.
-- This migration is committed to a feature branch only; it is not applied to production.

alter table public.mobile_scanner_sessions
  add column if not exists pair_code_expires_at timestamptz,
  add column if not exists device_name text not null default 'Nüva Mobile',
  add column if not exists active_module text not null default 'pos',
  add column if not exists active_operation_id uuid;

alter table public.mobile_scanner_events
  add column if not exists module text not null default 'pos',
  add column if not exists operation_id uuid;

update public.mobile_scanner_sessions
set pair_code_expires_at = case
  when status = 'pending' then coalesce(pair_code_expires_at, expires_at)
  else coalesce(pair_code_expires_at, created_at + interval '10 minutes')
end
where pair_code_expires_at is null;

-- Existing paired scanners receive a 30-day renewable lease; pending pairing codes remain 10-minute.
update public.mobile_scanner_sessions
set expires_at = greatest(expires_at, now() + interval '30 days')
where status = 'paired' and expires_at <= now() + interval '30 days';

alter table public.mobile_scanner_sessions
  alter column expires_at set default (now() + interval '30 days');

alter table public.mobile_scanner_sessions
  drop constraint if exists mobile_scanner_sessions_active_module_check;
alter table public.mobile_scanner_sessions
  add constraint mobile_scanner_sessions_active_module_check
  check (active_module in ('pos','inventory','receiving','picking','dispatch','returns','transfers'));

create index if not exists idx_mobile_scanner_sessions_business_module
  on public.mobile_scanner_sessions(business_id, active_module, status, last_seen_at desc);

create table if not exists public.inventory_stocktake_scan_events (
  id uuid primary key default gen_random_uuid(),
  stocktake_id uuid not null references public.inventory_stocktakes(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  client_event_id uuid not null,
  mode text not null check (mode in ('unit','quantity')),
  quantity_delta numeric(14,3) not null check (quantity_delta > 0),
  code text,
  source_session_id uuid references public.mobile_scanner_sessions(id) on delete set null,
  actor_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint uq_stocktake_scan_event_client unique(stocktake_id, client_event_id)
);

create index if not exists idx_stocktake_scan_events_stocktake_created
  on public.inventory_stocktake_scan_events(stocktake_id, created_at desc);
create index if not exists idx_stocktake_scan_events_business_product
  on public.inventory_stocktake_scan_events(business_id, product_id, created_at desc);

create unique index if not exists uq_inventory_stocktakes_one_counting_per_business
  on public.inventory_stocktakes(business_id) where status = 'counting';

alter table public.inventory_stocktake_scan_events enable row level security;
drop policy if exists inventory_stocktake_scan_events_select_member on public.inventory_stocktake_scan_events;
create policy inventory_stocktake_scan_events_select_member
  on public.inventory_stocktake_scan_events
  for select to authenticated
  using (private.is_business_member(business_id, (select auth.uid())));
grant select on public.inventory_stocktake_scan_events to authenticated;

create or replace function private.record_inventory_stocktake_scan(
  p_stocktake_id uuid,
  p_product_id uuid,
  p_client_event_id uuid,
  p_mode text default 'unit',
  p_quantity numeric default 1,
  p_code text default null,
  p_source_session_id uuid default null
)
returns table(
  event_id uuid,
  stocktake_id uuid,
  product_id uuid,
  system_qty numeric,
  counted_qty numeric,
  difference numeric,
  inserted boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_uid uuid := (select auth.uid());
  v_actor_id uuid;
  v_stocktake public.inventory_stocktakes%rowtype;
  v_product public.products%rowtype;
  v_event_id uuid;
  v_line public.inventory_stocktake_lines%rowtype;
  v_quantity numeric(14,3);
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;
  if p_client_event_id is null then
    raise exception 'CLIENT_EVENT_ID_REQUIRED' using errcode = '22023';
  end if;
  if p_mode not in ('unit','quantity') then
    raise exception 'INVALID_COUNT_MODE' using errcode = '22023';
  end if;
  v_quantity := coalesce(p_quantity, 1);
  if v_quantity <= 0 or v_quantity <> trunc(v_quantity) or (p_mode = 'unit' and v_quantity <> 1) then
    raise exception 'INVALID_COUNT_QUANTITY' using errcode = '22023';
  end if;

  select * into v_stocktake
  from public.inventory_stocktakes
  where id = p_stocktake_id
  for update;

  if not found then
    raise exception 'STOCKTAKE_NOT_FOUND' using errcode = 'P0002';
  end if;
  if not private.has_business_role(
    v_stocktake.business_id, v_uid,
    array['owner'::member_role,'admin'::member_role,'staff'::member_role]
  ) then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;
  if v_stocktake.status <> 'counting' then
    raise exception 'STOCKTAKE_NOT_OPEN' using errcode = '55000';
  end if;

  select * into v_product
  from public.products
  where id = p_product_id and business_id = v_stocktake.business_id;
  if not found then
    raise exception 'PRODUCT_NOT_IN_BUSINESS' using errcode = '42501';
  end if;

  v_actor_id := v_uid;
  if p_source_session_id is not null then
    select s.paired_by into v_actor_id
    from public.mobile_scanner_sessions s
    where s.id = p_source_session_id
      and s.business_id = v_stocktake.business_id
      and s.status = 'paired'
      and s.expires_at > now()
      and s.active_module = 'inventory'
      and s.active_operation_id = p_stocktake_id
      and private.has_business_role(s.business_id, s.paired_by, array['owner'::member_role,'admin'::member_role,'staff'::member_role]);
    if not found then
      raise exception 'SCANNER_SESSION_INVALID' using errcode = '42501';
    end if;
  end if;

  insert into public.inventory_stocktake_scan_events(
    stocktake_id, business_id, product_id, client_event_id,
    mode, quantity_delta, code, source_session_id, actor_id
  ) values (
    v_stocktake.id, v_stocktake.business_id, v_product.id, p_client_event_id,
    p_mode, v_quantity, nullif(btrim(p_code), ''), p_source_session_id, v_actor_id
  )
  on conflict (stocktake_id, client_event_id) do nothing
  returning id into v_event_id;

  if v_event_id is not null then
    insert into public.inventory_stocktake_lines(
      stocktake_id, business_id, product_id, barcode, product_name,
      system_qty, counted_qty, difference
    ) values (
      v_stocktake.id, v_stocktake.business_id, v_product.id,
      coalesce(nullif(btrim(p_code), ''), v_product.barcode, v_product.sku),
      v_product.name, v_product.stock, v_quantity, v_quantity - v_product.stock
    )
    on conflict (stocktake_id, product_id) where product_id is not null
    do update set
      counted_qty = public.inventory_stocktake_lines.counted_qty + excluded.counted_qty,
      difference = (public.inventory_stocktake_lines.counted_qty + excluded.counted_qty)
        - public.inventory_stocktake_lines.system_qty,
      scanned_at = now();
  end if;

  select * into v_line
  from public.inventory_stocktake_lines l
  where l.stocktake_id = v_stocktake.id and l.product_id = v_product.id;

  return query select
    coalesce(v_event_id, (
      select e.id from public.inventory_stocktake_scan_events e
      where e.stocktake_id = v_stocktake.id and e.client_event_id = p_client_event_id
    )),
    v_stocktake.id, v_product.id, v_line.system_qty, v_line.counted_qty,
    v_line.difference, v_event_id is not null;
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
declare v_uid uuid := (select auth.uid());
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
  update public.mobile_scanner_sessions
  set active_module = p_module,
      active_operation_id = p_operation_id,
      device_name = coalesce(nullif(left(btrim(p_device_name), 80), ''), device_name),
      last_seen_at = now()
  where id = p_session_id
    and status = 'paired'
    and expires_at > now()
    and paired_by = v_uid
    and private.has_business_role(business_id, v_uid, array['owner'::member_role,'admin'::member_role,'staff'::member_role]);
  if not found then raise exception 'SCANNER_SESSION_INVALID' using errcode = '42501'; end if;
end;
$$;

create or replace function private.heartbeat_mobile_scanner_session(p_session_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare v_expires timestamptz;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED' using errcode = '42501'; end if;
  update public.mobile_scanner_sessions
  set last_seen_at = now(), expires_at = now() + interval '30 days'
  where id = p_session_id
    and status = 'paired'
    and expires_at > now()
    and paired_by = auth.uid()
    and private.has_business_role(business_id, auth.uid(), array['owner'::member_role,'admin'::member_role,'staff'::member_role])
  returning expires_at into v_expires;
  if v_expires is null then raise exception 'SCANNER_SESSION_INVALID' using errcode = '42501'; end if;
  return v_expires;
end;
$$;

create or replace function private.create_mobile_scanner_session(p_business_id uuid)
returns table(session_id uuid, pair_code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare v_code text; v_id uuid; v_pair_expires timestamptz := now() + interval '10 minutes';
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED' using errcode = '42501'; end if;
  if not private.has_business_role(p_business_id, auth.uid(), array['owner'::member_role,'admin'::member_role,'staff'::member_role]) then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;
  update public.mobile_scanner_sessions
  set status = 'expired'
  where business_id = p_business_id
    and status = 'pending'
    and pair_code_expires_at <= now();
  v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
  insert into public.mobile_scanner_sessions(
    id, business_id, created_by, pair_code_hash, status,
    expires_at, pair_code_expires_at, active_module
  ) values (
    gen_random_uuid(), p_business_id, auth.uid(), crypt(v_code, gen_salt('bf')),
    'pending', now() + interval '30 days', v_pair_expires, 'pos'
  ) returning id into v_id;
  return query select v_id, v_code, v_pair_expires;
end;
$$;

create or replace function private.pair_mobile_scanner(p_pair_code text)
returns table(session_id uuid, business_id uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare v_session public.mobile_scanner_sessions%rowtype; v_uid uuid := auth.uid(); v_expires timestamptz;
begin
  if v_uid is null then raise exception 'UNAUTHENTICATED' using errcode = '42501'; end if;
  select * into v_session
  from public.mobile_scanner_sessions s
  where s.status = 'pending'
    and s.pair_code_expires_at > now()
    and crypt(trim(p_pair_code), s.pair_code_hash) = s.pair_code_hash
    and private.has_business_role(s.business_id, v_uid, array['owner'::member_role,'admin'::member_role,'staff'::member_role])
  order by s.created_at desc
  limit 1
  for update;
  if not found then raise exception 'PAIR_CODE_INVALID_OR_EXPIRED' using errcode = '22023'; end if;
  v_expires := now() + interval '30 days';
  update public.mobile_scanner_sessions
  set status = 'paired', paired_at = now(), paired_by = v_uid,
      expires_at = v_expires, pair_code_hash = crypt(gen_random_uuid()::text, gen_salt('bf')),
      last_seen_at = now()
  where id = v_session.id;
  return query select v_session.id, v_session.business_id, v_expires;
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
  return v_event;
end;
$$;

create or replace function private.revoke_mobile_scanner_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED' using errcode = '42501'; end if;
  update public.mobile_scanner_sessions
  set status = 'revoked'
  where id = p_session_id
    and (
      created_by = auth.uid()
      or paired_by = auth.uid()
      or private.has_business_role(
        business_id, auth.uid(), array['owner'::member_role,'admin'::member_role]
      )
    );
  if not found then raise exception 'NOT_AUTHORIZED' using errcode = '42501'; end if;
end;
$$;


do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'inventory_stocktake_scan_events'
  ) then
    alter publication supabase_realtime add table public.inventory_stocktake_scan_events;
  end if;
end $$;


create or replace function private.associate_product_code_from_scanner(
  p_business_id uuid,
  p_product_id uuid,
  p_code text,
  p_code_type text default 'barcode'
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare v_uid uuid := (select auth.uid()); v_code text := regexp_replace(coalesce(p_code, ''), '[[:space:]]+', '', 'g'); v_id uuid;
begin
  if v_uid is null then raise exception 'UNAUTHENTICATED' using errcode = '42501'; end if;
  if not private.has_business_role(p_business_id, v_uid, array['owner'::member_role,'admin'::member_role,'staff'::member_role]) then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;
  if v_code = '' or length(v_code) > 128 then raise exception 'INVALID_CODE' using errcode = '22023'; end if;
  if lower(coalesce(p_code_type, 'barcode')) not in ('barcode','ean','upc','qr','sku','other') then
    raise exception 'INVALID_CODE_TYPE' using errcode = '22023';
  end if;
  if not exists (select 1 from public.products p where p.id = p_product_id and p.business_id = p_business_id) then
    raise exception 'PRODUCT_NOT_IN_BUSINESS' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.products p
    where p.business_id = p_business_id and p.id <> p_product_id
      and (
        lower(btrim(coalesce(p.barcode, ''))) = lower(v_code)
        or lower(btrim(coalesce(p.sku, ''))) = lower(v_code)
      )
  ) then
    raise exception 'CODE_ALREADY_ASSOCIATED' using errcode = '23505';
  end if;
  insert into public.product_codes(business_id, product_id, code, code_type, is_primary, is_active, created_by)
  values(p_business_id, p_product_id, v_code, lower(coalesce(p_code_type, 'barcode')), false, true, v_uid)
  returning id into v_id;
  return v_id;
exception
  when unique_violation then
    raise exception 'CODE_ALREADY_ASSOCIATED' using errcode = '23505';
end;
$$;



create or replace function private.create_mobile_scanner_session_for_operation(
  p_business_id uuid,
  p_module text,
  p_operation_id uuid
)
returns table(session_id uuid, pair_code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare v_code text; v_id uuid; v_pair_expires timestamptz := now() + interval '10 minutes';
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED' using errcode = '42501'; end if;
  if not private.has_business_role(p_business_id, auth.uid(), array['owner'::member_role,'admin'::member_role,'staff'::member_role]) then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;
  if p_module not in ('pos','inventory','receiving','picking','dispatch','returns','transfers') then
    raise exception 'INVALID_DEVICE_MODULE' using errcode = '22023';
  end if;
  if p_module = 'inventory' and not exists (
    select 1 from public.inventory_stocktakes st
    where st.id = p_operation_id and st.business_id = p_business_id and st.status = 'counting'
  ) then
    raise exception 'STOCKTAKE_NOT_OPEN' using errcode = '22023';
  end if;
  if p_operation_id is null then
    raise exception 'OPERATION_CONTEXT_REQUIRED' using errcode = '22023';
  end if;
  v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
  insert into public.mobile_scanner_sessions(
    id, business_id, created_by, pair_code_hash, status,
    expires_at, pair_code_expires_at, active_module, active_operation_id
  ) values (
    gen_random_uuid(), p_business_id, auth.uid(), crypt(v_code, gen_salt('bf')),
    'pending', now() + interval '30 days', v_pair_expires, p_module, p_operation_id
  ) returning id into v_id;
  return query select v_id, v_code, v_pair_expires;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'mobile_scanner_sessions'
  ) then
    alter publication supabase_realtime add table public.mobile_scanner_sessions;
  end if;
end $$;


-- Public API wrappers remain SECURITY INVOKER; authorization and privileged work live in private functions.
create or replace function public.record_inventory_stocktake_scan(
  p_stocktake_id uuid, p_product_id uuid, p_client_event_id uuid,
  p_mode text default 'unit', p_quantity numeric default 1,
  p_code text default null, p_source_session_id uuid default null
)
returns table(event_id uuid, stocktake_id uuid, product_id uuid, system_qty numeric, counted_qty numeric, difference numeric, inserted boolean)
language sql
set search_path = public, private
as $$ select * from private.record_inventory_stocktake_scan($1,$2,$3,$4,$5,$6,$7); $$;

create or replace function public.set_mobile_scanner_context(
  p_session_id uuid, p_module text, p_operation_id uuid default null, p_device_name text default null
)
returns void
language sql
set search_path = public, private
as $$ select private.set_mobile_scanner_context($1,$2,$3,$4); $$;

create or replace function public.heartbeat_mobile_scanner_session(p_session_id uuid)
returns timestamptz
language sql
set search_path = public, private
as $$ select private.heartbeat_mobile_scanner_session($1); $$;

create or replace function public.associate_product_code_from_scanner(
  p_business_id uuid, p_product_id uuid, p_code text, p_code_type text default 'barcode'
)
returns uuid
language sql
set search_path = public, private
as $$ select private.associate_product_code_from_scanner($1,$2,$3,$4); $$;

create or replace function public.create_mobile_scanner_session_for_operation(
  p_business_id uuid, p_module text, p_operation_id uuid
)
returns table(session_id uuid, pair_code text, expires_at timestamptz)
language sql
set search_path = public, private
as $$ select * from private.create_mobile_scanner_session_for_operation($1,$2,$3); $$;


revoke all on function public.record_inventory_stocktake_scan(uuid,uuid,uuid,text,numeric,text,uuid) from public, anon;
revoke all on function public.set_mobile_scanner_context(uuid,text,uuid,text) from public, anon;
revoke all on function public.heartbeat_mobile_scanner_session(uuid) from public, anon;
revoke all on function public.associate_product_code_from_scanner(uuid,uuid,text,text) from public, anon;
revoke all on function public.create_mobile_scanner_session_for_operation(uuid,text,uuid) from public, anon;
grant execute on function public.record_inventory_stocktake_scan(uuid,uuid,uuid,text,numeric,text,uuid) to authenticated;
grant execute on function public.set_mobile_scanner_context(uuid,text,uuid,text) to authenticated;
grant execute on function public.heartbeat_mobile_scanner_session(uuid) to authenticated;
grant execute on function public.associate_product_code_from_scanner(uuid,uuid,text,text) to authenticated;
grant execute on function public.create_mobile_scanner_session_for_operation(uuid,text,uuid) to authenticated;


create or replace function private.start_or_join_inventory_stocktake(p_business_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_uid uuid := (select auth.uid());
  v_stocktake_id uuid;
begin
  if v_uid is null then raise exception 'UNAUTHENTICATED' using errcode = '42501'; end if;
  if not private.has_business_role(p_business_id, v_uid, array['owner'::member_role,'admin'::member_role,'staff'::member_role]) then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_business_id::text, 0));

  select st.id into v_stocktake_id
  from public.inventory_stocktakes st
  where st.business_id = p_business_id and st.status = 'counting'
  order by st.created_at desc
  limit 1;

  if v_stocktake_id is null then
    insert into public.inventory_stocktakes(business_id, status, created_by)
    values(p_business_id, 'counting', v_uid)
    returning id into v_stocktake_id;
  end if;

  return v_stocktake_id;
end;
$$;

create or replace function public.start_or_join_inventory_stocktake(p_business_id uuid)
returns uuid
language sql
set search_path = public, private
as $$ select private.start_or_join_inventory_stocktake($1); $$;

revoke all on function public.start_or_join_inventory_stocktake(uuid) from public, anon;
grant execute on function public.start_or_join_inventory_stocktake(uuid) to authenticated;
