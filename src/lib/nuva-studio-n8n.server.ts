import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { buildBusinessContext, capContext } from "@/lib/business-context.server";

async function callWebhook(url: string, secret: string | undefined, payload: Record<string, unknown>) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret) headers["x-nuva-studio-secret"] = secret;
  const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`n8n respondió ${response.status}: ${detail.slice(0, 500)}`);
  }
  return response.json() as Promise<Record<string, unknown>>;
}

export async function runNuvaStudioN8nTask(args: {
  businessId: string;
  userId: string;
  capability: "video" | "automation";
  prompt: string;
  supabase: SupabaseClient<Database>;
}) {
  const url = args.capability === "video" ? process.env.N8N_STUDIO_VIDEO_WEBHOOK_URL : process.env.N8N_STUDIO_AUTOMATION_WEBHOOK_URL;
  if (!url) throw new Error(`Webhook de n8n no configurado para ${args.capability}.`);

  const context = await buildBusinessContext(args.supabase, args.businessId);
  const result = await callWebhook(url, process.env.N8N_STUDIO_WEBHOOK_SECRET, {
    source: "nuva-one",
    capability: args.capability,
    businessId: args.businessId,
    userId: args.userId,
    prompt: args.prompt.slice(0, 12000),
    businessContext: context ? capContext(context) : null,
  });

  return {
    text: typeof result.message === "string" ? result.message : "Flujo ejecutado correctamente.",
    url: typeof result.url === "string" ? result.url : undefined,
    status: typeof result.status === "string" ? result.status : "completed",
    metadata: result,
  };
}
