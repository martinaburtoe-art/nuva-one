// Shared conversational memory for the AI assistant, used by both the web
// chatbot and the WhatsApp webhook. A "conversation" is a session scoped to
// (business, channel, identity) that auto-expires after SESSION_DAYS of
// inactivity, at which point a fresh one starts. History sent to the model
// is capped to a rolling summary + the most recent messages, so cost and
// latency stay flat no matter how long a business has been chatting.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const SESSION_DAYS = 7;
const RECENT_MESSAGES_LIMIT = 10;
const SUMMARIZE_EVERY_N_MESSAGES = 20;

type AiConversation = Database["public"]["Tables"]["ai_conversations"]["Row"];
type AiChannel = Database["public"]["Enums"]["ai_channel"];

type AiProvider = "groq" | "lovable" | "openai";

export type ConversationIdentity = {
  businessId: string;
  channel: AiChannel;
  externalRef?: string | null;
  userId?: string | null;
};

export async function getOrCreateConversation(
  admin: SupabaseClient<Database>,
  identity: ConversationIdentity,
): Promise<AiConversation> {
  const { businessId, channel, externalRef = null, userId = null } = identity;

  let query = admin
    .from("ai_conversations")
    .select("*")
    .eq("business_id", businessId)
    .eq("channel", channel)
    .eq("status", "active");
  query =
    externalRef === null ? query.is("external_ref", null) : query.eq("external_ref", externalRef);
  query = userId === null ? query.is("user_id", null) : query.eq("user_id", userId);

  const { data: existing } = await query.maybeSingle();
  const expired =
    existing &&
    Date.now() - new Date(existing.last_message_at).getTime() > SESSION_DAYS * 86_400_000;

  if (existing && !expired) return existing;
  if (existing && expired) {
    await admin.from("ai_conversations").update({ status: "archived" }).eq("id", existing.id);
  }

  const { data: created, error } = await admin
    .from("ai_conversations")
    .insert({ business_id: businessId, channel, external_ref: externalRef, user_id: userId })
    .select("*")
    .single();

  if (error?.code === "23505") {
    const { data: winner } = await query.maybeSingle();
    if (winner) return winner;
  }
  if (error || !created) throw new Error(`No se pudo crear la conversación: ${error?.message}`);
  return created;
}

function providerFromModel(model?: string): AiProvider {
  const normalized = model?.toLowerCase() ?? "";
  if (normalized.includes("gemini") || normalized.includes("lovable")) return "lovable";
  if (normalized.startsWith("gpt-") || normalized.includes("openai")) return "openai";
  return "groq";
}

function estimateOutputTokens(content: string) {
  return Math.max(1, Math.ceil(content.length / 4));
}

export async function appendMessage(
  admin: SupabaseClient<Database>,
  conversationId: string,
  role: "user" | "assistant" | "system",
  content: string,
  model?: string,
) {
  await admin.from("ai_messages").insert({ conversation_id: conversationId, role, content, model });
  await admin
    .from("ai_conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  // Best-effort platform telemetry. It intentionally cannot break a successful
  // AI response. Exact provider usage can later enrich these records.
  if (role === "assistant") {
    try {
      const { data: conversation } = await admin
        .from("ai_conversations")
        .select("business_id, user_id")
        .eq("id", conversationId)
        .maybeSingle();
      const outputTokens = estimateOutputTokens(content);
      const provider = providerFromModel(model);
      const outputPrice = provider === "groq" ? 0.3 : 0;
      const estimatedCostUsd = (outputTokens / 1_000_000) * outputPrice;
      await (admin as any).from("ai_usage_events").insert({
        business_id: conversation?.business_id ?? null,
        user_id: conversation?.user_id ?? null,
        provider,
        model: model ?? "unknown",
        input_tokens: 0,
        output_tokens: outputTokens,
        total_tokens: outputTokens,
        estimated_cost_usd: estimatedCostUsd,
        fallback_used: false,
        attempts: 1,
      });
    } catch (telemetryError) {
      console.warn("AI telemetry write skipped", telemetryError);
    }
  }
}

export async function buildContextMessages(
  admin: SupabaseClient<Database>,
  conversation: AiConversation,
): Promise<{ role: "user" | "assistant" | "system"; content: string }[]> {
  const { data: recent } = await admin
    .from("ai_messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: false })
    .limit(RECENT_MESSAGES_LIMIT);

  const ordered = (recent ?? []).slice().reverse();
  const messages: { role: "user" | "assistant" | "system"; content: string }[] = [];
  if (conversation.summary) {
    messages.push({
      role: "system",
      content: `Resumen de la conversación anterior con este negocio: ${conversation.summary}`,
    });
  }
  for (const m of ordered) messages.push({ role: m.role, content: m.content });
  return messages;
}

export async function maybeSummarize(
  admin: SupabaseClient<Database>,
  conversation: AiConversation,
  summarize: (text: string) => Promise<string>,
) {
  const since = conversation.summary_up_to ?? conversation.created_at;
  const { data: toSummarize, count } = await admin
    .from("ai_messages")
    .select("role, content, created_at", { count: "exact" })
    .eq("conversation_id", conversation.id)
    .gt("created_at", since)
    .order("created_at", { ascending: true });

  if (!toSummarize || (count ?? 0) < SUMMARIZE_EVERY_N_MESSAGES) return;
  const older = toSummarize.slice(0, Math.max(0, toSummarize.length - RECENT_MESSAGES_LIMIT));
  if (older.length === 0) return;

  const transcript = older.map((m) => `${m.role}: ${m.content}`).join("\n");
  const prompt = conversation.summary
    ? `Resumen previo:\n${conversation.summary}\n\nNuevos mensajes a incorporar:\n${transcript}\n\nDevuelve un resumen breve (máx. 5 líneas) que combine ambos, conservando solo hechos relevantes del negocio.`
    : `Resume brevemente (máx. 5 líneas) los hechos relevantes del negocio en esta conversación:\n${transcript}`;

  const newSummary = await summarize(prompt);
  const lastSummarized = older[older.length - 1].created_at;
  await admin
    .from("ai_conversations")
    .update({ summary: newSummary, summary_up_to: lastSummarized })
    .eq("id", conversation.id);
}
