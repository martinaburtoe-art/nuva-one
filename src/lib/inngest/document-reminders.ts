import { createClient } from "@supabase/supabase-js";
import { cron } from "inngest";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";
import { getPaymentAdapter, decryptPaymentCreds } from "@/lib/fiscal/payment-service.server";
import { inngest } from "./client";

type InvoiceRow = {
  id: string;
  business_id: string;
  invoice_number: number;
  customer_name: string;
  customer_snapshot: Record<string, unknown>;
  issuer_snapshot: Record<string, unknown>;
  total: number;
  status: string;
  due_date: string;
};

function reminderKind(daysUntilDue: number): string | null {
  if (daysUntilDue === 3) return "due_soon_3d";
  if (daysUntilDue === 0) return "due_today";
  if (daysUntilDue === -3) return "overdue_3d";
  if (daysUntilDue === -7) return "overdue_7d";
  return null;
}

function validEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char] ?? char);
}

export const nuvaInvoicePaymentReminders = inngest.createFunction(
  {
    id: "nuva-invoice-payment-reminders",
    triggers: [cron("TZ=America/Santiago 0 9 * * *")],
    retries: 2,
    concurrency: { limit: 1 },
  },
  async ({ step }) => {
    const resendKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.NUVA_DOCUMENTS_FROM_EMAIL?.trim();
    if (!resendKey || !from) {
      return { status: "disabled", reason: "document_email_provider_not_configured" };
    }

    const { url, serviceRoleKey } = getServerSupabaseEnv();
    if (!url || !serviceRoleKey) throw new Error("NUVA_DOCUMENTS_SUPABASE_SERVICE_ROLE_REQUIRED");
    const db = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    }) as any;

    const today = new Date();
    const todayKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Santiago",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(today);
    const startDate = new Date(`${todayKey}T12:00:00Z`);
    const minDate = new Date(startDate);
    minDate.setDate(minDate.getDate() - 7);
    const maxDate = new Date(startDate);
    maxDate.setDate(maxDate.getDate() + 3);
    const minKey = minDate.toISOString().slice(0, 10);
    const maxKey = maxDate.toISOString().slice(0, 10);

    const invoices = await step.run("load-due-invoices", async () => {
      const { data, error } = await db
        .from("invoices")
        .select("id,business_id,invoice_number,customer_name,customer_snapshot,issuer_snapshot,total,status,due_date")
        .in("status", ["issued", "partially_paid", "overdue"])
        .gte("due_date", minKey)
        .lte("due_date", maxKey)
        .order("due_date", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as InvoiceRow[];
    });

    if (!invoices.length) return { status: "complete", candidates: 0, sent: 0, skipped: 0 };

    const invoiceIds = invoices.map((invoice) => invoice.id);
    const payments = await step.run("load-confirmed-payments", async () => {
      const { data, error } = await db
        .from("invoice_payments")
        .select("invoice_id,amount")
        .in("invoice_id", invoiceIds)
        .eq("status", "confirmed");
      if (error) throw error;
      return data ?? [];
    });
    const paidByInvoice = new Map<string, number>();
    for (const payment of payments) {
      paidByInvoice.set(payment.invoice_id, (paidByInvoice.get(payment.invoice_id) ?? 0) + Number(payment.amount ?? 0));
    }

    let sent = 0;
    let skipped = 0;
    for (const invoice of invoices) {
      const email = invoice.customer_snapshot?.email;
      if (!validEmail(email)) { skipped++; continue; }
      const dueDate = new Date(`${invoice.due_date}T12:00:00Z`);
      const todayDate = new Date(`${todayKey}T12:00:00Z`);
      const daysUntilDue = Math.round((dueDate.getTime() - todayDate.getTime()) / 86400000);
      const kind = reminderKind(daysUntilDue);
      if (!kind) continue;

      const paid = paidByInvoice.get(invoice.id) ?? 0;
      const balance = Math.max(0, Math.round(Number(invoice.total) - paid));
      if (balance <= 0) { skipped++; continue; }

      const idempotencyKey = `invoice-reminder:${invoice.id}:${kind}:${todayKey}`;
      const attempt = await step.run(`claim-${invoice.id}-${kind}`, async () => {
        const { data, error } = await db.from("document_delivery_attempts").insert({
          business_id: invoice.business_id,
          document_type: "internal_invoice",
          document_id: invoice.id,
          recipient: email,
          provider: "resend",
          channel: "email",
          status: "sending",
          idempotency_key: idempotencyKey,
          attempts: 1,
          metadata: { reminder_kind: kind, due_date: invoice.due_date, balance },
        }).select("id").single();
        if (error?.code === "23505") return null;
        if (error) throw error;
        return data;
      });
      if (!attempt) { skipped++; continue; }

      const providerResult = await step.run(`prepare-payment-${invoice.id}-${kind}`, async () => {
        const { data: existing } = await db.from("payment_intents")
          .select("checkout_url,provider,created_at")
          .eq("invoice_id", invoice.id)
          .eq("status", "pending")
          .maybeSingle();
        if (existing?.checkout_url && Date.now() - new Date(existing.created_at).getTime() < 48 * 60 * 60 * 1000) {
          return { url: existing.checkout_url as string, provider: existing.provider as string };
        }

        if (existing) {
          await db.from("payment_intents").update({ status: "expired" })
            .eq("invoice_id", invoice.id).eq("status", "pending");
        }

        const { data: integration } = await db.from("billing_integrations")
          .select("*")
          .eq("business_id", invoice.business_id)
          .eq("type", "payment")
          .eq("status", "connected")
          .maybeSingle();
        if (!integration) return null;
        const adapter = getPaymentAdapter(integration.provider);
        if (!adapter) return null;
        const { apiKey, secretKey } = decryptPaymentCreds(integration);
        const origin = process.env.SITE_URL || process.env.VITE_SITE_URL || "https://nuva-one.vercel.app";
        const commerceOrder = `invoice-${invoice.id}-${kind}-${todayKey}`;
        const result = await adapter.createPayment({
          apiKey, secretKey, apiUrl: integration.api_url || "", environment: integration.environment,
        }, {
          amount: balance,
          subject: `Documento interno FAC-${String(invoice.invoice_number).padStart(6, "0")}`,
          commerceOrder,
          email,
          returnUrl: `${origin}/invoices?payment=${encodeURIComponent(commerceOrder)}`,
          webhookUrl: `${origin}/api/billing/payments/webhook?provider=${encodeURIComponent(integration.provider)}`,
        });
        if (!result.ok || !result.token || !result.paymentUrl) return null;
        const { error } = await db.from("payment_intents").insert({
          business_id: invoice.business_id,
          sale_id: null,
          invoice_id: invoice.id,
          provider: integration.provider,
          token: result.token,
          commerce_order: commerceOrder,
          amount: balance,
          checkout_url: result.paymentUrl,
          status: "pending",
        });
        if (error?.code === "23505") {
          const { data: winner } = await db.from("payment_intents").select("checkout_url,provider")
            .eq("invoice_id", invoice.id).eq("status", "pending").maybeSingle();
          return winner?.checkout_url ? { url: winner.checkout_url, provider: winner.provider } : null;
        }
        if (error) throw error;
        return { url: result.paymentUrl, provider: integration.provider };
      });

      const issuerName = invoice.issuer_snapshot?.name ?? "El negocio emisor";
      const amountLabel = `CLP ${balance.toLocaleString("es-CL")}`;
      const heading = kind === "due_soon_3d" ? "Tu documento vence en 3 días"
        : kind === "due_today" ? "Tu documento vence hoy"
          : `Recordatorio de pago · ${Math.abs(daysUntilDue)} días de atraso`;
      const paymentCta = providerResult
        ? `<p style="margin:26px 0"><a href="${providerResult.url}" style="display:inline-block;background:#182741;color:#fff;text-decoration:none;padding:14px 22px;border-radius:9px;font-weight:700">Pagar con ${escapeHtml(providerResult.provider)}</a></p>`
        : `<p>Para coordinar el pago, contacta directamente a ${escapeHtml(issuerName)}.</p>`;
      const html = `<!doctype html><html><body style="margin:0;background:#f5f6fa;padding:32px 16px;font-family:Arial,sans-serif;color:#182235"><main style="max-width:600px;margin:auto;background:#fff;border:1px solid #e7e9ef;border-radius:16px;padding:32px"><p style="font-size:12px;letter-spacing:1px;color:#687386;text-transform:uppercase">Nüva One · Recordatorio de cobro</p><h1 style="font-size:24px;margin:12px 0">${heading}</h1><p>Hola ${escapeHtml(invoice.customer_name)},</p><p>Te recordamos el saldo pendiente del documento interno <strong>FAC-${String(invoice.invoice_number).padStart(6, "0")}</strong>, emitido por ${escapeHtml(issuerName)}.</p><div style="background:#f5f6fa;border-radius:12px;padding:18px"><p style="margin:0;color:#687386;font-size:12px">Saldo pendiente</p><p style="font-size:26px;font-weight:700;margin:6px 0">${amountLabel}</p><p style="margin:0;color:#687386;font-size:12px">Vencimiento: ${new Date(`${invoice.due_date}T12:00:00`).toLocaleDateString("es-CL")}</p></div>${paymentCta}<p style="font-size:12px;color:#687386">Si ya realizaste el pago, puedes ignorar este mensaje. El estado se actualizará cuando el proveedor confirme la operación.</p><p style="font-size:11px;color:#9aa2af">Documento comercial interno; no constituye DTE ni factura tributaria emitida ante el SII.</p></main></body></html>`;

      const send = await step.run(`send-${invoice.id}-${kind}`, async () => {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
          body: JSON.stringify({
            from,
            to: [email],
            subject: `${heading} · FAC-${String(invoice.invoice_number).padStart(6, "0")}`,
            html,
          }),
        });
        const result = await response.json().catch(() => ({})) as { id?: string; message?: string };
        if (!response.ok || !result.id) {
          await db.from("document_delivery_attempts").update({
            status: "failed",
            error_code: "RESEND_SEND_FAILED",
            error_message: String(result.message ?? "El proveedor rechazó el envío").slice(0, 500),
            updated_at: new Date().toISOString(),
          }).eq("id", attempt.id);
          return false;
        }
        await db.from("document_delivery_attempts").update({
          status: "sent",
          provider_message_id: result.id,
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", attempt.id);
        return true;
      });
      if (send) sent++; else skipped++;
    }

    return { status: "complete", candidates: invoices.length, sent, skipped };
  },
);
