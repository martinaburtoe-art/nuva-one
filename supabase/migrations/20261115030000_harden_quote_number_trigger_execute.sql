-- Trigger functions are invoked by PostgreSQL through their trigger bindings.
-- Application roles must not be able to invoke this SECURITY DEFINER function as an RPC.
REVOKE ALL ON FUNCTION public.assign_quote_number() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assign_quote_number() FROM anon;
REVOKE ALL ON FUNCTION public.assign_quote_number() FROM authenticated;
