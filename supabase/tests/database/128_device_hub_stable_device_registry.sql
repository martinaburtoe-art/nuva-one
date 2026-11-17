begin;

select plan(16);

select ok(
  to_regclass('public.mobile_scanner_devices') is not null,
  'stable mobile scanner device registry exists'
);

select ok(
  (select relrowsecurity from pg_class where oid='public.mobile_scanner_devices'::regclass),
  'stable device registry has RLS enabled'
);

select ok(
  exists(select 1 from pg_indexes where schemaname='public'
    and indexname='uq_mobile_scanner_devices_business_key'
    and indexdef ilike '%unique%business_id, device_key%'),
  'stable device key is unique within a business'
);

select ok(
  exists(select 1 from information_schema.columns where table_schema='public'
    and table_name='mobile_scanner_sessions' and column_name='device_id')
  and exists(select 1 from pg_constraint
    where conrelid='public.mobile_scanner_sessions'::regclass
      and conname='mobile_scanner_sessions_device_business_fk'),
  'pairing sessions reference a registered device in the same business'
);

select ok(
  has_table_privilege('authenticated','public.mobile_scanner_devices','SELECT')
  and not has_table_privilege('anon','public.mobile_scanner_devices','SELECT')
  and not has_table_privilege('authenticated','public.mobile_scanner_devices','INSERT')
  and not has_table_privilege('authenticated','public.mobile_scanner_devices','UPDATE'),
  'authenticated users can read member-visible devices but cannot mutate the registry directly'
);

select ok(
  exists(select 1 from pg_policies where schemaname='public'
    and tablename='mobile_scanner_devices'
    and policyname='mobile_scanner_devices_select_member'
    and cmd='SELECT'),
  'device registry reads are constrained by business membership'
);

select ok(
  exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='pair_mobile_scanner_device' and not p.prosecdef)
  and exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='private' and p.proname='pair_mobile_scanner_device' and p.prosecdef),
  'stable pairing uses a SECURITY INVOKER wrapper over a private SECURITY DEFINER implementation'
);

select ok(
  has_function_privilege('authenticated','public.pair_mobile_scanner_device(text,uuid,text)','EXECUTE')
  and not has_function_privilege('anon','public.pair_mobile_scanner_device(text,uuid,text)','EXECUTE')
  and has_function_privilege('authenticated','private.pair_mobile_scanner_device(text,uuid,text)','EXECUTE')
  and not has_function_privilege('anon','private.pair_mobile_scanner_device(text,uuid,text)','EXECUTE'),
  'stable pairing is available to authenticated users only'
);

select ok(
  exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='revoke_mobile_scanner_device' and not p.prosecdef)
  and exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='private' and p.proname='revoke_mobile_scanner_device' and p.prosecdef),
  'device-wide revocation uses an invoker wrapper and private definer'
);

select ok(
  has_function_privilege('authenticated','public.revoke_mobile_scanner_device(uuid)','EXECUTE')
  and not has_function_privilege('anon','public.revoke_mobile_scanner_device(uuid)','EXECUTE')
  and has_function_privilege('authenticated','private.revoke_mobile_scanner_device(uuid)','EXECUTE')
  and not has_function_privilege('anon','private.revoke_mobile_scanner_device(uuid)','EXECUTE'),
  'device-wide revocation is authenticated-only'
);

select ok(
  position('revoked_at' in pg_get_functiondef('private.pair_mobile_scanner_device(text,uuid,text)'::regprocedure)) > 0
  and position('DEVICE_REVOKED' in pg_get_functiondef('private.pair_mobile_scanner_device(text,uuid,text)'::regprocedure)) > 0,
  'revoked device keys cannot be silently re-paired'
);

select ok(
  position('mobile_scanner_devices' in pg_get_functiondef('private.heartbeat_mobile_scanner_session(uuid)'::regprocedure)) > 0
  and position('revoked_at' in pg_get_functiondef('private.heartbeat_mobile_scanner_session(uuid)'::regprocedure)) > 0,
  'heartbeat rejects revoked stable devices'
);

select ok(
  position('mobile_scanner_devices' in pg_get_functiondef('private.set_mobile_scanner_context(uuid,text,uuid,text)'::regprocedure)) > 0
  and position('revoked_at' in pg_get_functiondef('private.set_mobile_scanner_context(uuid,text,uuid,text)'::regprocedure)) > 0,
  'context changes reject revoked stable devices'
);

select ok(
  position('mobile_scanner_devices' in pg_get_functiondef('private.submit_mobile_scanner_event(uuid,text,uuid,text)'::regprocedure)) > 0
  and position('revoked_at' in pg_get_functiondef('private.submit_mobile_scanner_event(uuid,text,uuid,text)'::regprocedure)) > 0,
  'scanner writes reject revoked stable devices'
);

select ok(
  position('status = ''revoked''' in pg_get_functiondef('private.revoke_mobile_scanner_device(uuid)'::regprocedure)) > 0
  and position('device_id = p_device_id' in pg_get_functiondef('private.revoke_mobile_scanner_device(uuid)'::regprocedure)) > 0,
  'revoking a device revokes every paired session attached to it'
);

select ok(
  exists(select 1 from pg_indexes where schemaname='public'
    and indexname='idx_mobile_scanner_sessions_device'
    and indexdef ilike '%device_id%'),
  'device-session lookup has a supporting index'
);

select * from finish();
rollback;
