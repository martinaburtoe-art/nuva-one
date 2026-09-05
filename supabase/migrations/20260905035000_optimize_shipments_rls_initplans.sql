-- Keep shipment authorization semantics while avoiding per-row auth() evaluation.
DROP POLICY IF EXISTS shipments_delete_admin ON public.shipments;
CREATE POLICY shipments_delete_admin ON public.shipments FOR DELETE TO authenticated
  USING ((SELECT private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role])));

DROP POLICY IF EXISTS shipments_insert_staff ON public.shipments;
CREATE POLICY shipments_insert_staff ON public.shipments FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role, 'staff'::member_role])));

DROP POLICY IF EXISTS shipments_update_staff ON public.shipments;
CREATE POLICY shipments_update_staff ON public.shipments FOR UPDATE TO authenticated
  USING ((SELECT private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role, 'staff'::member_role])))
  WITH CHECK ((SELECT private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role, 'staff'::member_role])));

DROP POLICY IF EXISTS shipment_events_insert_staff ON public.shipment_events;
CREATE POLICY shipment_events_insert_staff ON public.shipment_events FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role, 'staff'::member_role])));