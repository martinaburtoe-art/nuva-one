import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { emitN8nEvent } from "@/lib/n8n.server";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";
import type { Database } from "@/integrations/supabase/types";

const BATCH_SIZE = 25;
const MAX_ATTEMPTS = 8;

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export const Route = createFileRoute("/api/n8n-delivery")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const cronSecret = process.env.CRON_SECRET?.trim();
        const authorization = request.headers.get("authorization") ?? "";
        if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
          return json({ error: "No autorizado" }, 401);
        }

        const { url, anonKey, ok } = getServerSupabaseEnv();
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
        if (!ok || !serviceRoleKey) {
          return json({ error: "Configuración de entrega incompleta", code: "N8N_DELIVERY_NOT_CONFIGURED" }, 503);
        }

        const supabase = createClient<Database>(url, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const db = supabase as typeof supabase & { from: (table: string) => any };
        const now = new Date();

        const { data: rows, error } = await db
          .from("n8n_event_outbox")
          .select("*")
          .in("status", ["pending", "failed"])
          .lte("next_attempt_at", now.toISOString())
          .lt("attempts", MAX_ATTEMPTS)
          .order("created_at", { ascending: true })
          .limit(BATCH_SIZE);

        if (error) return json({ error: "No se pudo leer la cola", code: "N8N_OUTBOX_READ_FAILED" }, 500);

        let delivered = 0;
        let failed = 0;
        let skipped = 0;

        for (const row of rows ?? []) {
          const { data: claimed } = await db
            .from("n8n_event_outbox")
            .update({ status: "delivering", updated_at: new Date().toISOString() })
            .eq("id", row.id)
            .in("status", ["pending", "failed"])
            .select("id")
            .maybeSingle();

          if (!claimed) {
            skipped += 1;
            continue;
          }

          const payload = row.payload;
          const event = {
            id: row.id,
            business_id: row.business_id,
            actor_user_id: row.actor_user_id,
            provider: "nuva" as const,
            source: "nuva_one" as const,
            entity_type: row.entity_type,
            entity_id: row.entity_id,
            event_type: row.event_type,
            occurred_at: row.occurred_at,
            idempotency_key: row.idempotency_key,
            payload:
              payload && typeof payload === "object" && !Array.isArray(payload)
                ? (payload as Record<string, unknown>)
                : {},
          };

          const result = await emitN8nEvent(event);
          const attempts = Number(row.attempts ?? 0) + 1;

          if (result.ok) {
            delivered += 1;
            await db
              .from("n8n_event_outbox")
              .update({
                status: "delivered",
                attempts,
                delivered_at: new Date().toISOString(),
                last_error: null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", row.id);
            continue;
          }

          failed += 1;
          const delaySeconds = Math.min(3600, 30 * 2 ** Math.min(attempts - 1, 6));
          await db
            .from("n8n_event_outbox")
            .update({
              status: attempts >= MAX_ATTEMPTS ? "failed" : "failed",
              attempts,
              last_error: result.code,
              next_attempt_at: new Date(Date.now() + delaySeconds * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", row.id);
        }

        return json({ ok: true, scanned: rows?.length ?? 0, delivered, failed, skipped });
      },
    },
  },
});
