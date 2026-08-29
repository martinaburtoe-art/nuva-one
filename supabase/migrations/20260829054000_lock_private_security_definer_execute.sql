-- Private SECURITY DEFINER helpers are implementation details, not client RPC endpoints.
-- Revoke direct execution from API roles; internal SECURITY DEFINER callers remain unaffected.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM anon, authenticated;

-- Keep future private functions closed to API roles by default.
ALTER DEFAULT PRIVILEGES IN SCHEMA private REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
