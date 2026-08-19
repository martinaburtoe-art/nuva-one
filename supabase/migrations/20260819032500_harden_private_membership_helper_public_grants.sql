-- SECURITY DEFINER membership helpers must not inherit PUBLIC EXECUTE.
revoke execute on function private.is_business_member(uuid, uuid) from public;
revoke execute on function private.is_business_member(uuid, uuid) from anon;
grant execute on function private.is_business_member(uuid, uuid) to authenticated, service_role;

revoke execute on function private.has_business_role(uuid, uuid, member_role[]) from public;
revoke execute on function private.has_business_role(uuid, uuid, member_role[]) from anon;
grant execute on function private.has_business_role(uuid, uuid, member_role[]) to authenticated, service_role;
