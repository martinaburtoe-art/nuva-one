BEGIN;
SELECT plan(11);

SELECT has_table('public','nuva_action_queue','Action queue table exists');
SELECT is((SELECT relrowsecurity FROM pg_class WHERE oid='public.nuva_action_queue'::regclass),true,'action queue RLS enabled');

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='nuva_action_queue'
      AND policyname='nuva actions update by business manager'
      AND cmd='UPDATE'
  ),
  'manager-only update policy exists'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='nuva_action_queue'
      AND policyname='nuva actions select by business membership'
      AND cmd='SELECT'
  ),
  'member select policy exists'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='nuva_action_queue'
      AND policyname='nuva actions insert by business membership'
      AND cmd='INSERT'
  ),
  'member insert policy exists'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.nuva_action_queue'::regclass
      AND tgname='trg_nuva_action_queue_transition'
  ),
  'status transition trigger exists'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.nuva_action_queue'::regclass
      AND tgname='trg_audit_nuva_action_queue'
  ),
  'audit trigger exists'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname='validate_nuva_action_queue_transition'
      AND pronamespace='public'::regnamespace
  ),
  'transition validator exists'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public'
      AND tablename='nuva_action_queue'
      AND indexname='nuva_action_queue_business_status_idx'
  ),
  'business status index exists'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public'
      AND tablename='nuva_action_queue'
      AND indexname='nuva_action_queue_created_by_idx'
  ),
  'creator index exists'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public'
      AND tablename='nuva_action_queue'
      AND indexname LIKE '%idempotency%'
  ),
  'idempotency index exists'
);

SELECT * FROM finish();
ROLLBACK;
