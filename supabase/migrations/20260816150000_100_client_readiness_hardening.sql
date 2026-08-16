-- Nüva One: production hardening for 100-business readiness.
-- Idempotent: safe to apply to environments where the same indexes/grants already exist.

-- Sensitive tables must never be directly reachable by the anonymous role.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'profiles','businesses','business_members','business_invites','customers','suppliers',
    'products','sales','purchases','transactions','quotes','automations','audit_log',
    'customer_activities','collection_reminders','quote_followups','billing_integrations',
    'billing_documents','billing_emit_queue','payment_intents','payment_webhook_events',
    'payments','subscription_charges','rate_limit_counters','system_alerts','device_tokens',
    'whatsapp_connections','whatsapp_messages','whatsapp_owner_links','ai_conversations',
    'ai_messages','ai_usage_daily','shifts'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', table_name);
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_pending_invitations() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_business_members(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.invite_team_member(uuid, text, public.member_role, text, jsonb) FROM anon;

-- Foreign-key indexes used by joins and cascading operations.
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON public.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_documents_customer_id ON public.billing_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_billing_documents_sale_id ON public.billing_documents(sale_id);
CREATE INDEX IF NOT EXISTS idx_billing_emit_queue_document_id ON public.billing_emit_queue(document_id);
CREATE INDEX IF NOT EXISTS idx_billing_emit_queue_sale_id ON public.billing_emit_queue(sale_id);
CREATE INDEX IF NOT EXISTS idx_business_invites_invited_by ON public.business_invites(invited_by);
CREATE INDEX IF NOT EXISTS idx_customer_activities_created_by ON public.customer_activities(created_by);
CREATE INDEX IF NOT EXISTS idx_forum_replies_author_user_id ON public.forum_replies(author_user_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_business_id ON public.forum_replies(business_id);
CREATE INDEX IF NOT EXISTS idx_forum_topics_author_user_id ON public.forum_topics(author_user_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_business_id ON public.payment_intents(business_id);
CREATE INDEX IF NOT EXISTS idx_subscription_charges_business_id ON public.subscription_charges(business_id);

-- Compound indexes for the most common tenant-scoped list queries.
CREATE INDEX IF NOT EXISTS idx_customers_business_created_at
  ON public.customers(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_business_created_at
  ON public.products(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_business_sale_date_created_at
  ON public.sales(business_id, sale_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_business_purchase_date_created_at
  ON public.purchases(business_id, purchase_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_business_tx_date_created_at
  ON public.transactions(business_id, tx_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_business_created_at
  ON public.quotes(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_activities_business_created_at
  ON public.customer_activities(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_activities_business_customer_created_at
  ON public.customer_activities(business_id, customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_business_created_at
  ON public.whatsapp_messages(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_created_at
  ON public.ai_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_billing_documents_business_created_at
  ON public.billing_documents(business_id, created_at DESC);

-- Remove the duplicate unique index identified by the Supabase performance advisor.
DROP INDEX IF EXISTS public.idx_business_invites_pending_unique;

-- Supabase's RLS planner can cache stable auth values when wrapped in SELECT.
DO $$
DECLARE
  p record;
  new_qual text;
  new_check text;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (COALESCE(qual, '') ILIKE '%auth.uid()%' AND COALESCE(qual, '') NOT ILIKE '%select auth.uid()%')
        OR (COALESCE(qual, '') ILIKE '%auth.jwt()%' AND COALESCE(qual, '') NOT ILIKE '%select auth.jwt()%')
        OR (COALESCE(with_check, '') ILIKE '%auth.uid()%' AND COALESCE(with_check, '') NOT ILIKE '%select auth.uid()%')
        OR (COALESCE(with_check, '') ILIKE '%auth.jwt()%' AND COALESCE(with_check, '') NOT ILIKE '%select auth.jwt()%')
      )
  LOOP
    new_qual := p.qual;
    new_check := p.with_check;
    IF new_qual IS NOT NULL THEN
      new_qual := replace(new_qual, 'auth.uid()', '(select auth.uid())');
      new_qual := replace(new_qual, 'auth.jwt()', '(select auth.jwt())');
      EXECUTE format('ALTER POLICY %I ON %I USING (%s)', p.policyname, p.tablename, new_qual);
    END IF;
    IF new_check IS NOT NULL THEN
      new_check := replace(new_check, 'auth.uid()', '(select auth.uid())');
      new_check := replace(new_check, 'auth.jwt()', '(select auth.jwt())');
      EXECUTE format('ALTER POLICY %I ON %I WITH CHECK (%s)', p.policyname, p.tablename, new_check);
    END IF;
  END LOOP;
END;
$$;

-- Public showcase data is intentionally exposed, but must execute as the caller.
ALTER VIEW public.businesses_public SET (security_invoker = true);
COMMENT ON VIEW public.businesses_public IS
  'Public Nüva showcase view. Exposes only explicitly public business fields.';
