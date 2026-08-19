-- Membership helpers are internal policy helpers and are not callable by anonymous clients.
revoke execute on function private.is_business_member(uuid, uuid) from anon;
revoke execute on function private.has_business_role(uuid, uuid, member_role[]) from anon;
