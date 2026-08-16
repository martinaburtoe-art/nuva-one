-- Harden Nüva One for multi-tenant production growth.
-- No business data is changed.

revoke all on table public.profiles from anon;
revoke all on table public.businesses from anon;
revoke all on table public.business_members from anon;
revoke all on table public.business_invites from anon;
revoke all on table public.customers from anon;
revoke all on table public.suppliers from anon;
revoke all on table public.products from anon;
revoke all on table public.sales from anon;
revoke all on table public.purchases from anon;
revoke all on table public.transactions from anon;
revoke all on table public.quotes from anon;
revoke all on table public.automations from anon;
revoke all on table public.audit_log from anon;
revoke all on table public.customer_activities from anon;
revoke all on table public.collection_reminders from anon;
revoke all on table public.quote_followups from anon;
revoke all on table public.billing_integrations from anon;
revoke all on table public.billing_documents from anon;
revoke all on table public.billing_emit_queue from anon;
revoke all on table public.payment_intents from anon;
revoke all on table public.payment_webhook_events from anon;
revoke all on table public.payments from anon;
revoke all on table public.subscription_charges from anon;
revoke all on table public.rate_limit_counters from anon;
revoke all on table public.system_alerts from anon;
revoke all on table public.device_tokens from anon;
revoke all on table public.whatsapp_connections from anon;
revoke all on table public.whatsapp_messages from anon;
revoke all on table public.whatsapp_owner_links from anon;
revoke all on table public.ai_conversations from anon;
revoke all on table public.ai_messages from anon;
revoke all on table public.ai_usage_daily from anon;
revoke all on table public.shifts from anon;
revoke all on table public.forum_topics from anon;
revoke all on table public.forum_replies from anon;

revoke execute on function public.claim_pending_invitations() from anon;
revoke execute on function public.get_business_members(uuid) from anon;
revoke execute on function public.invite_team_member(uuid, text, public.member_role, text, jsonb) from anon;

create index if not exists idx_ai_conversations_user_id on public.ai_conversations(user_id);
create index if not exists idx_billing_documents_customer_id on public.billing_documents(customer_id);
create index if not exists idx_billing_documents_sale_id on public.billing_documents(sale_id);
create index if not exists idx_billing_emit_queue_document_id on public.billing_emit_queue(document_id);
create index if not exists idx_billing_emit_queue_sale_id on public.billing_emit_queue(sale_id);
create index if not exists idx_business_invites_invited_by on public.business_invites(invited_by);
create index if not exists idx_customer_activities_created_by on public.customer_activities(created_by);
create index if not exists idx_forum_replies_author_user_id on public.forum_replies(author_user_id);
create index if not exists idx_forum_replies_business_id on public.forum_replies(business_id);
create index if not exists idx_forum_topics_author_user_id on public.forum_topics(author_user_id);
create index if not exists idx_payment_intents_business_id on public.payment_intents(business_id);
create index if not exists idx_subscription_charges_business_id on public.subscription_charges(business_id);

create index if not exists idx_customers_business_created_at on public.customers(business_id, created_at desc);
create index if not exists idx_products_business_created_at on public.products(business_id, created_at desc);
create index if not exists idx_sales_business_sale_date_created_at on public.sales(business_id, sale_date desc, created_at desc);
create index if not exists idx_purchases_business_purchase_date_created_at on public.purchases(business_id, purchase_date desc, created_at desc);
create index if not exists idx_transactions_business_tx_date_created_at on public.transactions(business_id, tx_date desc, created_at desc);
create index if not exists idx_quotes_business_created_at on public.quotes(business_id, created_at desc);
create index if not exists idx_customer_activities_business_created_at on public.customer_activities(business_id, created_at desc);
create index if not exists idx_customer_activities_business_customer_created_at on public.customer_activities(business_id, customer_id, created_at desc);
create index if not exists idx_whatsapp_messages_business_created_at on public.whatsapp_messages(business_id, created_at desc);
create index if not exists idx_ai_messages_conversation_created_at on public.ai_messages(conversation_id, created_at asc);
create index if not exists idx_billing_documents_business_created_at on public.billing_documents(business_id, created_at desc);

drop index if exists public.idx_business_invites_pending_unique;

do $$
declare
  p record;
  new_qual text;
  new_check text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (
        (coalesce(qual, '') ilike '%auth.uid()%' and coalesce(qual, '') not ilike '%select auth.uid()%')
        or (coalesce(qual, '') ilike '%auth.jwt()%' and coalesce(qual, '') not ilike '%select auth.jwt()%')
        or (coalesce(with_check, '') ilike '%auth.uid()%' and coalesce(with_check, '') not ilike '%select auth.uid()%')
        or (coalesce(with_check, '') ilike '%auth.jwt()%' and coalesce(with_check, '') not ilike '%select auth.jwt()%')
      )
  loop
    new_qual := p.qual;
    new_check := p.with_check;
    if new_qual is not null then
      new_qual := replace(new_qual, 'auth.uid()', '(select auth.uid())');
      new_qual := replace(new_qual, 'auth.jwt()', '(select auth.jwt())');
      execute format('alter policy %I on %I using (%s)', p.policyname, p.tablename, new_qual);
    end if;
    if new_check is not null then
      new_check := replace(new_check, 'auth.uid()', '(select auth.uid())');
      new_check := replace(new_check, 'auth.jwt()', '(select auth.jwt())');
      execute format('alter policy %I on %I with check (%s)', p.policyname, p.tablename, new_check);
    end if;
  end loop;
end;
$$;

drop policy if exists "Admins read audit_log" on public.audit_log;
alter policy "Invitee can view own invite" on public.business_invites to authenticated;
alter policy "Owner/admin manage business invites" on public.business_invites to authenticated;
alter policy "Members access customer_activities" on public.customer_activities to authenticated;
alter policy "Owner/admin manage own whatsapp link" on public.whatsapp_owner_links to authenticated;

do $$
declare
  t text;
  p record;
  private_tables constant text[] := array[
    'profiles','businesses','business_members','business_invites','customers','suppliers',
    'products','sales','purchases','transactions','quotes','automations','audit_log',
    'customer_activities','collection_reminders','quote_followups','billing_integrations',
    'billing_documents','billing_emit_queue','payment_intents','payment_webhook_events',
    'payments','subscription_charges','rate_limit_counters','system_alerts','device_tokens',
    'whatsapp_connections','whatsapp_messages','whatsapp_owner_links','ai_conversations',
    'ai_messages','ai_usage_daily','shifts','forum_topics','forum_replies'
  ];
begin
  foreach t in array private_tables loop
    for p in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = t and roles @> array['public'::name]
    loop
      execute format('alter policy %I on %I to authenticated', p.policyname, t);
    end loop;
  end loop;
end;
$$;
