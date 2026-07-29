-- Prevents two concurrent requests from both finding "no active conversation"
-- and each inserting their own -- coalesce() is needed because NULL <> NULL
-- in a plain unique index, which would otherwise let unlimited duplicate
-- rows through for the web channel (where external_ref is always null).
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_conversations_active_unique
  ON public.ai_conversations (business_id, channel, COALESCE(external_ref, ''), COALESCE(user_id::text, ''))
  WHERE status = 'active';
