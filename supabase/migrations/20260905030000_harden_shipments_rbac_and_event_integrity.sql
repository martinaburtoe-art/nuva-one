-- Harden shipment mutations by business role and keep shipment history append-only.
-- Members retain read access; operational writes require owner/admin/staff.

DROP POLICY IF EXISTS shipments_insert_member ON public.shipments;
DROP POLICY IF EXISTS shipments_update_member ON public.shipments;
DROP POLICY IF EXISTS shipments_delete_member ON public.shipments;

CREATE POLICY shipments_insert_staff
  ON public.shipments
  FOR INSERT
  WITH CHECK (
    private.has_business_role(
      business_id,
      auth.uid(),
      ARRAY['owner','admin','staff']::public.member_role[]
    )
  );

CREATE POLICY shipments_update_staff
  ON public.shipments
  FOR UPDATE
  USING (
    private.has_business_role(
      business_id,
      auth.uid(),
      ARRAY['owner','admin','staff']::public.member_role[]
    )
  )
  WITH CHECK (
    private.has_business_role(
      business_id,
      auth.uid(),
      ARRAY['owner','admin','staff']::public.member_role[]
    )
  );

CREATE POLICY shipments_delete_admin
  ON public.shipments
  FOR DELETE
  USING (
    private.has_business_role(
      business_id,
      auth.uid(),
      ARRAY['owner','admin']::public.member_role[]
    )
  );

DROP POLICY IF EXISTS shipment_events_insert_member ON public.shipment_events;
DROP POLICY IF EXISTS shipment_events_update_member ON public.shipment_events;
DROP POLICY IF EXISTS shipment_events_delete_member ON public.shipment_events;

CREATE POLICY shipment_events_insert_staff
  ON public.shipment_events
  FOR INSERT
  WITH CHECK (
    private.has_business_role(
      business_id,
      auth.uid(),
      ARRAY['owner','admin','staff']::public.member_role[]
    )
  );

-- Shipment events are an audit trail: authenticated users cannot rewrite or erase history.
-- service_role retains its existing administrative capability.

CREATE OR REPLACE FUNCTION public.validate_shipment_event_business()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.shipments s
    WHERE s.id = NEW.shipment_id
      AND s.business_id = NEW.business_id
  ) THEN
    RAISE EXCEPTION 'shipment_id does not belong to business_id';
  END IF;

  RETURN NEW;
END;
$$;

-- SECURITY DEFINER trigger functions must not be callable as a public RPC surface.
REVOKE EXECUTE ON FUNCTION public.validate_shipment_event_business() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_validate_shipment_event_business ON public.shipment_events;
CREATE TRIGGER trg_validate_shipment_event_business
  BEFORE INSERT OR UPDATE ON public.shipment_events
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_shipment_event_business();

COMMENT ON FUNCTION public.validate_shipment_event_business() IS
  'Prevents cross-tenant shipment event linkage and protects shipment event integrity.';
