begin;

select plan(15);

select ok(
  (select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname='inventory_stocktake_scan_events'),
  'collaborative stocktake event ledger has RLS enabled'
);

select ok(
  exists(select 1 from pg_indexes where schemaname='public'
    and indexname='uq_stocktake_scan_event_client'
    and indexdef ilike '%unique%stocktake_id, client_event_id%'),
  'stocktake scan events enforce idempotency per count and client event'
);

select ok(
  (select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname='mobile_scanner_sessions'),
  'mobile scanner sessions keep RLS enabled'
);

select ok(
  exists(select 1 from information_schema.columns where table_schema='public'
    and table_name='mobile_scanner_sessions' and column_name='pair_code_expires_at'),
  'pairing token expiry is separate from paired session expiry'
);

select ok(
  exists(select 1 from information_schema.columns where table_schema='public'
    and table_name='mobile_scanner_sessions' and column_name='active_operation_id')
  and exists(select 1 from information_schema.columns where table_schema='public'
    and table_name='mobile_scanner_sessions' and column_name='active_module'),
  'scanner session stores explicit module and operation context'
);

select ok(
  exists(select 1 from information_schema.columns where table_schema='public'
    and table_name='mobile_scanner_events' and column_name='operation_id')
  and exists(select 1 from information_schema.columns where table_schema='public'
    and table_name='mobile_scanner_events' and column_name='module'),
  'scanner events preserve their operation routing context'
);

select ok(
  has_function_privilege('authenticated',
    'public.record_inventory_stocktake_scan(uuid,uuid,uuid,text,numeric,text,uuid)', 'EXECUTE'),
  'authenticated users can submit authorized stocktake scan events'
);

select ok(
  not has_function_privilege('anon',
    'public.record_inventory_stocktake_scan(uuid,uuid,uuid,text,numeric,text,uuid)', 'EXECUTE'),
  'anonymous users cannot submit stocktake scan events'
);

select ok(
  has_function_privilege('authenticated',
    'public.create_mobile_scanner_session_for_operation(uuid,text,uuid)', 'EXECUTE'),
  'authenticated users can create operation-bound pairing sessions'
);

select ok(
  not has_function_privilege('anon',
    'public.create_mobile_scanner_session_for_operation(uuid,text,uuid)', 'EXECUTE'),
  'anonymous users cannot create operation-bound pairing sessions'
);

select ok(
  has_function_privilege('authenticated',
    'public.set_mobile_scanner_context(uuid,text,uuid,text)', 'EXECUTE')
  and has_function_privilege('authenticated',
    'public.heartbeat_mobile_scanner_session(uuid)', 'EXECUTE'),
  'paired devices expose context and heartbeat RPCs to authenticated users'
);

select ok(
  not has_function_privilege('anon',
    'public.set_mobile_scanner_context(uuid,text,uuid,text)', 'EXECUTE')
  and not has_function_privilege('anon',
    'public.heartbeat_mobile_scanner_session(uuid)', 'EXECUTE'),
  'anonymous users cannot mutate or renew device sessions'
);

select ok(
  has_function_privilege('authenticated',
    'public.associate_product_code_from_scanner(uuid,uuid,text,text)', 'EXECUTE')
  and not has_function_privilege('anon',
    'public.associate_product_code_from_scanner(uuid,uuid,text,text)', 'EXECUTE'),
  'product code association is authenticated-only'
);

select ok(
  exists(select 1 from pg_publication_tables where pubname='supabase_realtime'
    and schemaname='public' and tablename='inventory_stocktake_scan_events'),
  'stocktake scan ledger is available through Realtime publication'
);

select ok(
  exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='record_inventory_stocktake_scan'
      and pg_get_function_identity_arguments(p.oid) =
        'p_stocktake_id uuid, p_product_id uuid, p_client_event_id uuid, p_mode text, p_quantity numeric, p_code text, p_source_session_id uuid'
      and exists(select 1 from unnest(coalesce(p.proconfig,'{}'::text[])) cfg where cfg like 'search_path=%')),
  'stocktake scan RPC pins a safe search_path'
);

select * from finish();
rollback;
