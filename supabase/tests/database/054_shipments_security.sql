BEGIN;
SELECT plan(8);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='shipments'
      AND policyname='shipments_insert_staff' AND cmd='INSERT'
      AND position('has_business_role' in with_check) > 0
  ),
  'shipment inserts require an operational business role'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='shipments'
      AND policyname='shipments_update_staff' AND cmd='UPDATE'
      AND position('has_business_role' in qual) > 0
      AND position('has_business_role' in with_check) > 0
  ),
  'shipment updates require an operational business role'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='shipments'
      AND policyname='shipments_delete_admin' AND cmd='DELETE'
      AND position('has_business_role' in qual) > 0
      AND position('owner' in qual) > 0
      AND position('admin' in qual) > 0
  ),
  'shipment deletion is restricted to owner/admin'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='shipment_events'
      AND policyname='shipment_events_insert_staff' AND cmd='INSERT'
      AND position('has_business_role' in with_check) > 0
  ),
  'shipment event inserts require an operational business role'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='shipment_events'
      AND cmd IN ('UPDATE','DELETE')
  ),
  'shipment events are append-only for authenticated users'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid=t.tgrelid
    WHERE c.relname='shipment_events'
      AND t.tgname='trg_validate_shipment_event_business'
      AND NOT t.tgisinternal
  ),
  'shipment event trigger enforces business ownership'
);

SELECT ok(
  has_function_privilege('anon', 'public.validate_shipment_event_business()', 'EXECUTE') = false,
  'shipment trigger function is not executable by anon'
);

SELECT ok(
  has_function_privilege('authenticated', 'public.validate_shipment_event_business()', 'EXECUTE') = false,
  'shipment trigger function is not executable by authenticated'
);

SELECT * FROM finish();
ROLLBACK;
