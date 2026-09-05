-- This function is a trigger helper, not a client-callable RPC.
-- Keep it executable only by the server role; trigger execution is not
-- controlled by the caller's EXECUTE privilege.
REVOKE EXECUTE ON FUNCTION public.validate_shipment_event_business() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_shipment_event_business() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_shipment_event_business() TO service_role;