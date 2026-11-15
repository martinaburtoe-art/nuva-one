import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { handlePaymentWebhook } from "@/lib/fiscal/payment-webhook-handler.server";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

/**
 * Supabase pg_cron/pg_net reconciliation endpoint for internal invoice payments.
 * The provider webhook remains the primary path; this route only rechecks
 * pending Flow intents and expires stale checkouts. It never trusts browser
 * redirects as payment evidence.
 */
async function reconcileDocuments(request: Request) {
  const secret = process.env.NUVA_DOCUMENTS_CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return json({ error: "No autorizado" }, 401);
  }

  const { url, serviceRoleKey } = getServerSupabaseEnv();
  if (!url || !serviceRoleKey) return json({ error: "Configuración de base de datos incompleta" }, 503);

  const db = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  }) as any;
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { error: expireError, count: expiredCount } = await db.from("payment_intents")
    .update({ status: "expired" }, { count: "exact" })
    .eq("provider", "flow")
    .eq("status", "pending")
    .not("invoice_id", "is", null)
    .lt("created_at", cutoff);
  if (expireError) return json({ error: "No se pudieron expirar los checkouts vencidos" }, 500);

  const { data: pending, error: pendingError } = await db.from("payment_intents")
    .select("id,provider,token")
    .eq("provider", "flow")
    .eq("status", "pending")
    .not("invoice_id", "is", null)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(25);
  if (pendingError) return json({ error: "No se pudieron cargar los pagos pendientes" }, 500);

  const outcomes: Record<string, number> = {};
  let failures = 0;
  const intents = pending ?? [];
  for (let offset = 0; offset < intents.length; offset += 5) {
    const batch = intents.slice(offset, offset + 5);
    const results = await Promise.all(batch.map(async (intent: any) => {
      try {
        const result = await handlePaymentWebhook(db, intent.provider, intent.token);
        return { outcome: result.outcome, failed: false };
      } catch {
        return { outcome: "error", failed: true };
      }
    }));
    for (const result of results) {
      if (result.failed) failures++;
      else outcomes[result.outcome] = (outcomes[result.outcome] ?? 0) + 1;
    }
  }

  return json({
    ok: failures === 0,
    checked: pending?.length ?? 0,
    expired: expiredCount ?? 0,
    failures,
    outcomes,
    mode: "supabase-pg-cron-reconciliation",
  });
}

export const Route = createFileRoute("/api/cron/nuva-documents-reconciliation")({
  server: { handlers: { GET: async ({ request }) => reconcileDocuments(request) } },
});
