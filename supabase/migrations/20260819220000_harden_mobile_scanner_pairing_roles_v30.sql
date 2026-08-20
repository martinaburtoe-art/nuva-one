create or replace function public.pair_mobile_scanner(p_pair_code text)
returns table(session_id uuid, business_id uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  v_session public.mobile_scanner_sessions%rowtype;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select * into v_session
  from public.mobile_scanner_sessions s
  where s.status = 'pending'
    and s.expires_at > now()
    and crypt(trim(p_pair_code), s.pair_code_hash) = s.pair_code_hash
    and private.has_business_role(s.business_id, v_uid, array['owner'::member_role,'admin'::member_role,'staff'::member_role])
  order by s.created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'PAIR_CODE_INVALID_OR_EXPIRED';
  end if;

  update public.mobile_scanner_sessions
  set status = 'paired', paired_at = now(), paired_by = v_uid, last_seen_at = now()
  where id = v_session.id;

  return query select v_session.id, v_session.business_id, v_session.expires_at;
end;
$$;

revoke execute on function public.pair_mobile_scanner(text) from anon;
grant execute on function public.pair_mobile_scanner(text) to authenticated;
