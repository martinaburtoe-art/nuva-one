-- Keep PostgREST-facing wrappers SECURITY INVOKER. Privileged work stays in
-- tightly-scoped private SECURITY DEFINER helpers with pinned search paths.
CREATE OR REPLACE FUNCTION public.claim_pending_invitations()
RETURNS integer
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT private.claim_pending_invitations();
$$;

CREATE OR REPLACE FUNCTION private.get_business_members(p_business_id uuid)
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text,
  role member_role,
  "position" text,
  permissions jsonb,
  joined_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, private, auth
AS $$
  SELECT bm.user_id,
         u.email::text,
         p.full_name,
         bm.role,
         bm."position",
         bm.permissions,
         bm.created_at
  FROM public.business_members bm
  JOIN auth.users u ON u.id = bm.user_id
  LEFT JOIN public.profiles p ON p.id = bm.user_id
  WHERE bm.business_id = p_business_id
    AND (select auth.uid()) IS NOT NULL
    AND private.has_business_role(p_business_id, (select auth.uid()), ARRAY['owner','admin']::member_role[])
  ORDER BY bm.created_at ASC;
$$;

REVOKE EXECUTE ON FUNCTION private.get_business_members(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.get_business_members(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_business_members(p_business_id uuid)
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text,
  role member_role,
  "position" text,
  permissions jsonb,
  joined_at timestamptz
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT * FROM private.get_business_members(p_business_id);
$$;
