-- AI conversational memory layer, shared across channels (web widget + WhatsApp)
-- Decoupled from any specific LLM provider (Groq now, swappable later).

CREATE TYPE ai_channel AS ENUM ('web', 'whatsapp');
CREATE TYPE ai_role AS ENUM ('user', 'assistant', 'system');

CREATE TABLE public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  channel ai_channel NOT NULL,
  external_ref text,              -- phone number for whatsapp; null for web
  user_id uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  summary text,                   -- rolling summary of messages older than summary_up_to
  summary_up_to timestamptz,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role ai_role NOT NULL,
  content text NOT NULL,
  model text,                     -- e.g. 'llama-3.3-70b-versatile'
  tokens_used int,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_messages_conversation_created
  ON public.ai_messages (conversation_id, created_at);

CREATE INDEX idx_ai_conversations_lookup
  ON public.ai_conversations (business_id, channel, external_ref, status);

-- RLS
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members see business conversations"
  ON public.ai_conversations
  FOR SELECT USING (private.is_business_member(business_id, auth.uid()));

CREATE POLICY "Members see business conversation messages"
  ON public.ai_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ai_conversations c
      WHERE c.id = ai_messages.conversation_id
        AND private.is_business_member(c.business_id, auth.uid())
    )
  );

-- Writes happen exclusively via Edge Functions using the service role key,
-- so no INSERT/UPDATE policies are defined here for regular authenticated users.
