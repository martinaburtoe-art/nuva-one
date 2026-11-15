import crypto from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { authedUserClient } from "@/lib/fiscal/fiscal-service.server";
import { checkRateLimit } from "@/lib/rate-limit.server";

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char] ?? char);
}

export const Route = createFileRoute("/api/documents/send-quote")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => null) as Record<string, unknown> | null;
        const businessId = typeof body?.business_id === "string" ? body.business_id : "";
        const quoteId = typeof body?.quote_id === "string" ? body.quote_id : "";
        const token = typeof body?.token === "string" ? body.token.toLowerCase() : "";
        const recipient = typeof body?.recipient === "string" ? body.recipient.trim().toLowerCase() : "";
        if (!businessId || !quoteId || !/^[a-f0-9]{64}$/.test(token) ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) || recipient.length > 254) {
          return json({ error: "Datos de envío inválidos" }, 400);
        }

        const client = await authedUserClient(request);
        if (!client) return json({ error: "No autenticado" }, 401);
        const rateAllowed = await checkRateLimit(`document-email:${businessId}:${quoteId}`, 5, 3600);
        if (!rateAllowed) return json({ error: "Se alcanzó el límite de envíos para esta cotización. Intenta más tarde." }, 429);

        const { data: membership } = await client
          .from("business_members")
          .select("role")
          .eq("business_id", businessId)
          .maybeSingle();
        if (!membership || !["owner", "admin", "staff"].includes(String(membership.role))) {
          return json({ error: "No tienes permisos para enviar documentos de este negocio" }, 403);
        }

        const { data: quote, error: quoteError } = await client
          .from("quotes")
          .select("id,business_id,customer_id,customer_snapshot,quote_number,customer_name,subject,total,status,valid_until")
          .eq("id", quoteId)
          .eq("business_id", businessId)
          .maybeSingle();
        if (quoteError || !quote) return json({ error: "Cotización no encontrada" }, 404);
        let authorizedRecipient = String((quote.customer_snapshot as Record<string, unknown> | null)?.email ?? "").trim().toLowerCase();
        if (!authorizedRecipient && quote.customer_id) {
          const { data: customer } = await client.from("customers")
            .select("email")
            .eq("id", quote.customer_id)
            .eq("business_id", businessId)
            .maybeSingle();
          authorizedRecipient = String(customer?.email ?? "").trim().toLowerCase();
        }
        if (!authorizedRecipient || authorizedRecipient !== recipient) {
          return json({ error: "El destinatario debe coincidir con el correo registrado del cliente en esta cotización" }, 403);
        }
        if (!["draft", "sent", "viewed"].includes(quote.status) ||
          (quote.valid_until && quote.valid_until < new Date().toISOString().slice(0, 10))) {
          return json({ error: "La cotización ya no admite envío" }, 409);
        }

        const { supabaseAdmin: adminClient } = await import("@/integrations/supabase/client.server");
        const supabaseAdmin = adminClient as any;
        const tokenHash = crypto.createHash("sha256").update(token, "utf8").digest("hex");
        const { data: link } = await supabaseAdmin
          .from("document_share_links")
          .select("id,expires_at,revoked_at,responded_at")
          .eq("business_id", businessId)
          .eq("quote_id", quoteId)
          .eq("token_hash", tokenHash)
          .maybeSingle();
        if (!link || link.revoked_at || link.responded_at || new Date(link.expires_at).getTime() <= Date.now()) {
          return json({ error: "El enlace de revisión no existe, venció o fue revocado" }, 409);
        }

        const apiKey = process.env.RESEND_API_KEY?.trim();
        const from = process.env.NUVA_DOCUMENTS_FROM_EMAIL?.trim();
        if (!apiKey || !from) {
          return json({
            error: "El envío por correo no está habilitado: configura RESEND_API_KEY y NUVA_DOCUMENTS_FROM_EMAIL en Vercel.",
            code: "DOCUMENT_EMAIL_PROVIDER_NOT_CONFIGURED",
          }, 503);
        }

        const idempotencyKey = `quote:${quoteId}:${tokenHash}:${recipient}`;
        const { data: existing } = await supabaseAdmin
          .from("document_delivery_attempts")
          .select("id,status,provider_message_id,updated_at,attempts")
          .eq("business_id", businessId)
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle();
        if (existing?.status === "sent") {
          return json({ ok: true, duplicate: true, delivery_id: existing.id });
        }
        if (existing?.status === "sending" && Date.now() - new Date(existing.updated_at).getTime() < 15 * 60 * 1000) {
          return json({ error: "El envío ya está en curso", code: "DOCUMENT_EMAIL_IN_PROGRESS" }, 409);
        }

        const { data: attempt, error: attemptError } = await supabaseAdmin
          .from("document_delivery_attempts")
          .upsert({
            business_id: businessId,
            document_type: "quote",
            document_id: quoteId,
            recipient,
            provider: "resend",
            channel: "email",
            status: "sending",
            idempotency_key: idempotencyKey,
            attempts: Number(existing?.attempts ?? 0) + 1,
            error_code: null,
            error_message: null,
            metadata: { quote_number: quote.quote_number },
            updated_at: new Date().toISOString(),
          }, { onConflict: "business_id,idempotency_key" })
          .select("id")
          .single();
        if (attemptError || !attempt) return json({ error: "No se pudo registrar el intento de envío" }, 500);

        const origin = new URL(request.url).origin;
        const shareUrl = `${origin}/quote/${token}`;
        const quoteLabel = `COT-${String(quote.quote_number ?? "").padStart(4, "0")}`;
        const html = `<!doctype html><html><body style="margin:0;background:#f5f6fa;padding:32px 16px;font-family:Arial,sans-serif;color:#182235"><main style="max-width:600px;margin:auto;background:#fff;border:1px solid #e7e9ef;border-radius:16px;padding:32px"><p style="font-size:12px;letter-spacing:1px;color:#687386;text-transform:uppercase">Nüva One · Propuesta comercial</p><h1 style="font-size:24px;margin:12px 0">Tienes una cotización para revisar</h1><p>Hola,</p><p><strong>${escapeHtml(quote.customer_name)}</strong>, tienes disponible la cotización <strong>${escapeHtml(quoteLabel)}</strong>${quote.subject ? ` para ${escapeHtml(quote.subject)}` : ""}.</p><p style="font-size:22px;font-weight:700">CLP ${Math.round(Number(quote.total)).toLocaleString("es-CL")}</p><p style="margin:28px 0"><a href="${shareUrl}" style="display:inline-block;background:#182741;color:#fff;text-decoration:none;padding:14px 22px;border-radius:9px;font-weight:700">Revisar cotización</a></p><p style="font-size:12px;color:#687386">Este enlace es personal, vence el ${new Date(link.expires_at).toLocaleDateString("es-CL")} y permite aceptar o rechazar la propuesta. La aceptación es comercial simple y no constituye firma electrónica avanzada ni DTE.</p><p style="font-size:12px;color:#9aa2af">Enviado con Nüva One</p></main></body></html>`;
        let response: Response;
        let result: { id?: string; message?: string; name?: string };
        try {
          response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "Idempotency-Key": idempotencyKey,
            },
            body: JSON.stringify({
              from,
              to: [recipient],
              subject: `Cotización ${quoteLabel} · ${quote.customer_name}`,
              html,
            }),
          });
          result = await response.json().catch(() => ({})) as { id?: string; message?: string; name?: string };
        } catch (error) {
          await supabaseAdmin.from("document_delivery_attempts").update({
            status: "failed",
            error_code: "RESEND_NETWORK_ERROR",
            error_message: String(error instanceof Error ? error.message : "Error de red").slice(0, 500),
            updated_at: new Date().toISOString(),
          }).eq("id", attempt.id);
          return json({ error: "No se pudo contactar al proveedor de correo; puedes reintentar el envío.", code: "DOCUMENT_EMAIL_NETWORK_ERROR" }, 502);
        }
        if (!response.ok || !result.id) {
          await supabaseAdmin.from("document_delivery_attempts").update({
            status: "failed",
            error_code: String(result.name ?? "RESEND_SEND_FAILED").slice(0, 100),
            error_message: String(result.message ?? "El proveedor rechazó el envío").slice(0, 500),
            updated_at: new Date().toISOString(),
          }).eq("id", attempt.id);
          return json({ error: "El proveedor de correo no aceptó el envío", code: "DOCUMENT_EMAIL_SEND_FAILED" }, 502);
        }

        await supabaseAdmin.from("document_delivery_attempts").update({
          status: "sent",
          provider_message_id: result.id,
          sent_at: new Date().toISOString(),
          error_code: null,
          error_message: null,
          updated_at: new Date().toISOString(),
        }).eq("id", attempt.id);
        await client.from("quotes").update({
          status: "sent",
          sent_at: new Date().toISOString(),
        }).eq("id", quoteId).eq("business_id", businessId);

        return json({ ok: true, delivery_id: attempt.id, provider_message_id: result.id });
      },
    },
  },
});
