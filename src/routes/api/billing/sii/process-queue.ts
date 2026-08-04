import { createFileRoute } from "@tanstack/react-router";
import { getFiscalAdapter } from "@/lib/fiscal/fiscal-service.server";
import { decryptSecret } from "@/lib/fiscal/crypto.server";

// Llamado periódicamente por cron (mismo patrón que collections/check-overdue).
// Procesa de a poco (BATCH_SIZE) para no saturar el rate limit del proveedor
// fiscal ni bloquear la UI: la venta masiva desde confección solo encola.
const BATCH_SIZE = 15;

export const Route = createFileRoute("/api/billing/sii/process-queue")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        if (secret) {
          const header = request.headers.get("x-cron-secret");
          if (header !== secret) return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: jobs, error } = await supabaseAdmin
          .from("billing_emit_queue")
          .select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: true })
          .limit(BATCH_SIZE);
        if (error) return new Response("Error", { status: 500 });
        if (!jobs || jobs.length === 0) {
          return new Response(JSON.stringify({ ok: true, processed: 0 }), {
            headers: { "Content-Type": "application/json" },
          });
        }

        let processed = 0;
        let failed = 0;

        for (const job of jobs as any[]) {
          await supabaseAdmin
            .from("billing_emit_queue")
            .update({ status: "processing", attempts: job.attempts + 1 })
            .eq("id", job.id);

          const { data: integration } = await supabaseAdmin
            .from("billing_integrations")
            .select("*")
            .eq("business_id", job.business_id)
            .eq("type", "fiscal")
            .eq("status", "connected")
            .maybeSingle();

          const adapter = integration ? getFiscalAdapter((integration as any).provider) : null;
          if (!integration || !adapter) {
            await supabaseAdmin
              .from("billing_emit_queue")
              .update({ status: "failed", last_error: "Sin proveedor fiscal conectado" })
              .eq("id", job.id);
            failed++;
            continue;
          }

          const sale = {
            tipoDte: Number(job.payload.tipo_dte),
            items: job.payload.items || [],
            receptor: job.payload.receptor,
            saleId: job.sale_id,
            customerId: job.payload.customer_id ?? null,
            idempotencyKey: job.idempotency_key,
          };

          const decrypted = { ...(integration as any), api_key: decryptSecret((integration as any).api_key) };
          const result = await adapter.emit(decrypted, sale as any);

          const { data: doc } = await supabaseAdmin
            .from("billing_documents")
            .upsert(
              {
                business_id: job.business_id,
                sale_id: job.sale_id,
                provider: decrypted.provider,
                tipo_dte: sale.tipoDte,
                environment: decrypted.environment,
                status: result.ok ? "emitted" : "error",
                idempotency_key: job.idempotency_key,
                folio: result.folio,
                pdf_base64: result.pdfBase64,
                error_message: result.errorMessage,
                raw_response: result.raw,
                receptor_rut: sale.receptor?.rut ?? null,
                receptor_name: sale.receptor?.name ?? null,
              },
              { onConflict: "business_id,idempotency_key" },
            )
            .select("id")
            .single();

          await supabaseAdmin
            .from("billing_emit_queue")
            .update({
              status: result.ok ? "done" : "failed",
              last_error: result.errorMessage,
              document_id: doc?.id ?? null,
            })
            .eq("id", job.id);

          result.ok ? processed++ : failed++;
          // Espaciado simple entre llamadas para no saturar el rate limit del proveedor.
          await new Promise((r) => setTimeout(r, 300));
        }

        return new Response(JSON.stringify({ ok: true, processed, failed }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
