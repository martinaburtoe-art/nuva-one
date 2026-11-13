-- Owner-only payment recovery and reconciliation.
-- Additive only: no production data is changed by creating this migration.

BEGIN;

CREATE TABLE IF NOT EXISTS public.payment_recovery_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.payment_creation_requests(id) ON DELETE RESTRICT,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action text NOT NULL CHECK (action IN (
    'provider_check',
    'link_intent',
    'refund_required',
    'manual_adjustment_required',
    'note'
  )),
  note text NOT NULL CHECK (length(note) BETWEEN 5 AND 1000),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(evidence) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_recovery_audit_request_created
  ON public.payment_recovery_audit(request_id, created_at DESC);

ALTER TABLE public.payment_recovery_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.payment_recovery_audit FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.payment_recovery_audit TO service_role;

-- The owner API supplies the authenticated owner ID only after checking
-- app_metadata.platform_role server-side. The RPC is inaccessible to browsers.
CREATE OR REPLACE FUNCTION public.owner_record_payment_recovery_action(
  p_request_id uuid,
  p_actor_user_id uuid,
  p_action text,
  p_note text,
  p_evidence jsonb DEFAULT '{}'::jsonb,
  p_payment_intent_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $function$
DECLARE
  v_request public.payment_creation_requests%ROWTYPE;
  v_intent public.payment_intents%ROWTYPE;
  v_audit_id uuid;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  IF p_actor_user_id IS NULL OR p_request_id IS NULL THEN
    RAISE EXCEPTION 'request and owner are required' USING ERRCODE = '22023';
  END IF;
  IF p_action IS NULL OR p_action NOT IN ('link_intent', 'refund_required', 'manual_adjustment_required', 'note') THEN
    RAISE EXCEPTION 'unsupported recovery action' USING ERRCODE = '22023';
  END IF;
  IF p_note IS NULL OR length(trim(p_note)) NOT BETWEEN 5 AND 1000 THEN
    RAISE EXCEPTION 'a note between 5 and 1000 characters is required' USING ERRCODE = '22023';
  END IF;
  IF p_evidence IS NULL OR jsonb_typeof(p_evidence) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'evidence must be a JSON object' USING ERRCODE = '22023';
  END IF;
  IF p_evidence ?| ARRAY['token','secret','secret_key','api_key','credentials','raw_payload','authorization'] THEN
    RAISE EXCEPTION 'sensitive provider material cannot be stored as evidence' USING ERRCODE = '22023';
  END IF;

  -- Lock order is payment intent -> recovery request, matching the webhook
  -- settlement path and preventing request/intent lock inversion deadlocks.
  SELECT r.* INTO v_request
    FROM public.payment_creation_requests r
   WHERE r.id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'recovery request not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_request.status <> 'recovery_required' THEN
    RAISE EXCEPTION 'request is not awaiting recovery' USING ERRCODE = '55000';
  END IF;

  IF p_action = 'link_intent' THEN
    IF p_payment_intent_id IS NULL THEN
      RAISE EXCEPTION 'payment intent is required' USING ERRCODE = '22023';
    END IF;
    SELECT i.* INTO v_intent
      FROM public.payment_intents i
     WHERE i.id = p_payment_intent_id
     FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'payment intent does not exist' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  SELECT r.* INTO v_request
    FROM public.payment_creation_requests r
   WHERE r.id = p_request_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'recovery request not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_request.status <> 'recovery_required' THEN
    RAISE EXCEPTION 'request is not awaiting recovery' USING ERRCODE = '55000';
  END IF;

  IF p_action = 'link_intent' THEN
    IF v_intent.business_id <> v_request.business_id
       OR v_intent.provider <> v_request.provider
       OR v_intent.commerce_order <> v_request.commerce_order
       OR v_intent.amount <> v_request.amount THEN
      RAISE EXCEPTION 'payment intent does not match the recovery request' USING ERRCODE = '23514';
    END IF;
    IF v_request.payment_intent_id IS NOT NULL
       AND v_request.payment_intent_id <> v_intent.id THEN
      RAISE EXCEPTION 'recovery request is already linked to another intent' USING ERRCODE = '23505';
    END IF;
    UPDATE public.payment_creation_requests
       SET payment_intent_id = v_intent.id,
           updated_at = now()
     WHERE id = v_request.id;
  END IF;

  INSERT INTO public.payment_recovery_audit(
    request_id, business_id, actor_user_id, action, note, evidence
  ) VALUES (
    v_request.id, v_request.business_id, p_actor_user_id, p_action,
    trim(p_note), p_evidence || jsonb_build_object('request_status', v_request.status)
  ) RETURNING id INTO v_audit_id;

  RETURN jsonb_build_object(
    'ok', true,
    'action', p_action,
    'audit_id', v_audit_id,
    'request_id', v_request.id,
    'payment_intent_id', CASE WHEN p_action = 'link_intent' THEN p_payment_intent_id ELSE v_request.payment_intent_id END,
    'status', v_request.status
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.owner_record_payment_recovery_action(uuid, uuid, text, text, jsonb, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.owner_record_payment_recovery_action(uuid, uuid, text, text, jsonb, uuid)
  TO service_role;

-- Provider verification is performed server-to-server by the owner API.
-- This RPC applies only a verified provider result and repeats all business,
-- order, amount, sale-balance and idempotency checks under row locks.
CREATE OR REPLACE FUNCTION public.owner_reconcile_payment_recovery(
  p_request_id uuid,
  p_actor_user_id uuid,
  p_provider_status text,
  p_provider_amount numeric,
  p_provider_commerce_order text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $function$
DECLARE
  v_request_snapshot public.payment_creation_requests%ROWTYPE;
  v_request public.payment_creation_requests%ROWTYPE;
  v_intent public.payment_intents%ROWTYPE;
  v_sale public.sales%ROWTYPE;
  v_payment_id uuid;
  v_existing_payment public.payments%ROWTYPE;
  v_remaining numeric(12,2);
  v_outcome text;
  v_audit_id uuid;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  IF p_actor_user_id IS NULL OR p_request_id IS NULL THEN
    RAISE EXCEPTION 'request and owner are required' USING ERRCODE = '22023';
  END IF;
  IF p_provider_status IS NULL OR p_provider_status NOT IN ('pending','paid','rejected','expired') THEN
    RAISE EXCEPTION 'unsupported provider status' USING ERRCODE = '22023';
  END IF;

  -- Snapshot without a lock, then lock in the same order as settle_payment_intent:
  -- payment intent -> sale (for paid results) -> recovery request.
  SELECT r.* INTO v_request_snapshot
    FROM public.payment_creation_requests r
   WHERE r.id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'recovery request not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_request_snapshot.status <> 'recovery_required' THEN
    RETURN jsonb_build_object('outcome', 'request_not_recoverable', 'status', v_request_snapshot.status);
  END IF;

  SELECT i.* INTO v_intent
    FROM public.payment_intents i
   WHERE i.id = v_request_snapshot.payment_intent_id
      OR (
        v_request_snapshot.payment_intent_id IS NULL
        AND i.business_id = v_request_snapshot.business_id
        AND i.provider = v_request_snapshot.provider
        AND i.commerce_order = v_request_snapshot.commerce_order
      )
   ORDER BY (i.id = v_request_snapshot.payment_intent_id) DESC
   LIMIT 1
   FOR UPDATE;

  IF v_intent.id IS NOT NULL THEN
    SELECT p.* INTO v_existing_payment
      FROM public.payments p
     WHERE p.payment_intent_id = v_intent.id
     LIMIT 1;
  END IF;

  IF v_intent.id IS NOT NULL
     AND v_existing_payment.id IS NULL
     AND v_intent.business_id = v_request_snapshot.business_id
     AND v_intent.provider = v_request_snapshot.provider
     AND v_intent.commerce_order = v_request_snapshot.commerce_order
     AND v_intent.amount = v_request_snapshot.amount
     AND p_provider_status = 'paid'
     AND p_provider_amount = v_request_snapshot.amount
     AND p_provider_commerce_order = v_request_snapshot.commerce_order
     AND v_request_snapshot.sale_id IS NOT NULL THEN
    SELECT s.* INTO v_sale
      FROM public.sales s
     WHERE s.id = v_request_snapshot.sale_id
       AND s.business_id = v_request_snapshot.business_id
     FOR UPDATE;
  END IF;

  SELECT r.* INTO v_request
    FROM public.payment_creation_requests r
   WHERE r.id = p_request_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'recovery request not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_request.status <> 'recovery_required' THEN
    RETURN jsonb_build_object('outcome', 'request_not_recoverable', 'status', v_request.status);
  END IF;

  IF v_request.business_id IS DISTINCT FROM v_request_snapshot.business_id
     OR v_request.sale_id IS DISTINCT FROM v_request_snapshot.sale_id
     OR v_request.provider IS DISTINCT FROM v_request_snapshot.provider
     OR v_request.commerce_order IS DISTINCT FROM v_request_snapshot.commerce_order
     OR v_request.amount IS DISTINCT FROM v_request_snapshot.amount THEN
    v_outcome := 'request_changed_during_verification';
  ELSIF v_intent.id IS NULL
     OR v_intent.business_id <> v_request.business_id
     OR v_intent.provider <> v_request.provider
     OR v_intent.commerce_order <> v_request.commerce_order
     OR v_intent.amount <> v_request.amount THEN
    v_outcome := 'intent_missing_or_mismatched';
  ELSIF p_provider_amount IS NULL
     OR p_provider_amount IS DISTINCT FROM v_request.amount
     OR p_provider_commerce_order IS NULL
     OR p_provider_commerce_order IS DISTINCT FROM v_request.commerce_order THEN
    v_outcome := 'provider_mismatch';
  ELSIF v_existing_payment.id IS NOT NULL THEN
    v_payment_id := v_existing_payment.id;
    IF v_existing_payment.business_id IS DISTINCT FROM v_request.business_id
       OR v_existing_payment.sale_id IS DISTINCT FROM v_request.sale_id
       OR v_existing_payment.amount IS DISTINCT FROM v_request.amount THEN
      v_outcome := 'existing_payment_mismatch';
    ELSIF p_provider_status = 'paid' THEN
      UPDATE public.payment_intents
         SET status = 'paid', resolved_at = COALESCE(resolved_at,now())
       WHERE id = v_intent.id;
      UPDATE public.payment_creation_requests
         SET status = 'closed', payment_intent_id = v_intent.id, updated_at = now()
       WHERE id = v_request.id;
      v_outcome := 'already_settled';
    ELSE
      v_outcome := 'existing_payment_provider_conflict';
    END IF;
  ELSIF p_provider_status = 'pending' THEN
    IF v_request.payment_intent_id IS NULL THEN
      UPDATE public.payment_creation_requests SET payment_intent_id = v_intent.id, updated_at = now() WHERE id = v_request.id;
    END IF;
    v_outcome := 'provider_pending';
  ELSIF p_provider_status IN ('rejected','expired') THEN
    IF v_request.payment_intent_id IS NULL THEN
      UPDATE public.payment_creation_requests SET payment_intent_id = v_intent.id, updated_at = now() WHERE id = v_request.id;
    END IF;
    IF v_intent.status <> 'paid' THEN
      UPDATE public.payment_intents
         SET status = p_provider_status,
             resolved_at = COALESCE(resolved_at, now())
       WHERE id = v_intent.id;
      UPDATE public.payment_creation_requests
         SET status = 'closed',
             payment_intent_id = v_intent.id,
             updated_at = now()
       WHERE id = v_request.id;
      v_outcome := 'verified_' || p_provider_status;
    ELSE
      v_outcome := 'intent_already_paid';
    END IF;
  ELSE
    IF v_request.payment_intent_id IS NULL THEN
      UPDATE public.payment_creation_requests SET payment_intent_id = v_intent.id, updated_at = now() WHERE id = v_request.id;
    END IF;
    IF v_request.sale_id IS NOT NULL THEN
      IF v_sale.id IS NULL THEN
        v_outcome := 'sale_not_found';
      ELSIF v_sale.status IN ('draft','cancelled') THEN
        v_outcome := 'sale_not_collectible';
      ELSE
        v_remaining := COALESCE(v_sale.total,0) - COALESCE(v_sale.paid_amount,0);
        IF v_remaining <= 0 OR v_request.amount > v_remaining THEN
          v_outcome := 'sale_balance_exceeded';
        ELSE
          INSERT INTO public.payments(payment_intent_id,business_id,sale_id,amount,method)
          VALUES(v_intent.id,v_request.business_id,v_request.sale_id,v_request.amount,v_request.provider)
          RETURNING id INTO v_payment_id;
          UPDATE public.payment_intents
             SET status = 'paid', resolved_at = COALESCE(resolved_at,now())
           WHERE id = v_intent.id;
          UPDATE public.payment_creation_requests
             SET status = 'closed', payment_intent_id = v_intent.id, updated_at = now()
           WHERE id = v_request.id;
          v_outcome := 'resolved_paid';
        END IF;
      END IF;
    ELSE
      UPDATE public.payment_intents
         SET status = 'paid', resolved_at = COALESCE(resolved_at,now())
       WHERE id = v_intent.id;
      UPDATE public.payment_creation_requests
         SET status = 'closed', payment_intent_id = v_intent.id, updated_at = now()
       WHERE id = v_request.id;
      v_outcome := 'resolved_paid_without_sale';
    END IF;
  END IF;

  INSERT INTO public.payment_recovery_audit(
    request_id,business_id,actor_user_id,action,note,evidence
  ) VALUES (
    v_request.id,v_request.business_id,p_actor_user_id,'provider_check',
    'Verificación de estado ejecutada server-to-server.',
    jsonb_build_object(
      'source','provider_api',
      'provider',v_request.provider,
      'provider_status',p_provider_status,
      'provider_amount',p_provider_amount,
      'provider_commerce_order',p_provider_commerce_order,
      'outcome',v_outcome,
      'checked_at',now()
    )
  ) RETURNING id INTO v_audit_id;

  RETURN jsonb_build_object(
    'outcome',v_outcome,
    'audit_id',v_audit_id,
    'request_id',v_request.id,
    'payment_intent_id',v_intent.id,
    'status',CASE WHEN v_outcome IN ('verified_rejected','verified_expired','resolved_paid','resolved_paid_without_sale','already_settled') THEN 'closed' ELSE 'recovery_required' END,
    'payment_id',v_payment_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.owner_reconcile_payment_recovery(uuid, uuid, text, numeric, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.owner_reconcile_payment_recovery(uuid, uuid, text, numeric, text)
  TO service_role;

COMMIT;
