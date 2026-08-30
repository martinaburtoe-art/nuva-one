-- business_members is a client-readable tenancy resolver.
-- RLS remains the authorization boundary: authenticated users can only see
-- rows allowed by the SELECT policies already defined on the table.
-- Without the table-level SELECT privilege, PostgREST returns 403 before
-- RLS can evaluate the user's own-membership policy.
GRANT SELECT ON TABLE public.business_members TO authenticated;
