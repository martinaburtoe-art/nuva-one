import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { sendWhatsAppMessage, findActiveWhatsAppConnection } from "@/lib/whatsapp.server";

// Llamado 1 vez al día por un cron (pg_cron + pg_net, ver instrucciones de despliegue).
// Protegido por CRON_SECRET para que no sea invocable públicamente.

const REMINDER_COOLDOWN_DAYS = 3;
const MAX_REMINDERS_PER_SALE = 3;

async function buildReminderMessage(
  businessName: string,
  customerName: string,
  total: number,
  paidAmount: number,
  daysOverdue: number,
): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  const pendiente = total - paidAmount;
  if (!key) {
    return `Hola ${customerName}, te escribimos de ${businessName} para recordarte tu pago pendiente de $${pendiente.toLocaleString("es-CL")}, vencido hace ${daysOverdue} día(s). ¿Podemos coordinar el pago?`;
  }

  const tone =
    daysOverdue <= 5
      ? "amable y cercano, como un recordatorio suave"
      : daysOverdue <= 15
        ? "firme pero respetuoso, dejando claro que ya pasó la fecha"
        : "serio y directo, indicando que es urgente regularizar";

  const system = `Eres el asistente de cobranza de "${businessName}" en Chile. Escribe UN mensaje de WhatsApp corto (máximo 3 líneas), en español de Chile, tono ${tone}. Nunca amenaces ni uses lenguaje agresivo o legal. El objetivo es que el cliente pague o se contacte para acordar el pago.`;
  const prompt = `Cliente: ${customerName}. Monto pendiente: $${pendiente.toLocaleString("es-CL")}. Días de atraso: ${daysOverdue}.`;

  try {
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");
    const { text } = await generateText({ model, system, prompt });
    return (
      text.trim() ||
      `Hola ${customerName}, tienes un pago pendiente de $${pendiente.toLocaleString("es-CL")} con ${businessName}. ¿Nos ayudas a regularizarlo?`
    );
  } catch (err) {
    console.error("Error generando mensaje de cobranza con IA", err);
    return `Hola ${customerName}, tienes un pago pendiente de $${pendiente.toLocaleString("es-CL")} con ${businessName}. ¿Nos ayudas a regularizarlo?`;
  }
}

export const Route = createFileRoute("/api/collections/check-overdue")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        if (secret) {
          const header = request.headers.get("x-cron-secret");
          if (header !== secret) {
            return new Response("Unauthorized", { status: 401 });
          }
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Ventas a crédito, vencidas. paid_amount < total no se puede comparar
        // columna-contra-columna en supabase-js, así que se filtra en memoria abajo.
        const { data: candidateSales, error } = await supabaseAdmin
          .from("sales")
          .select("id, business_id, customer_id, customer_name, total, paid_amount, due_date, status, businesses(name), customers(phone)")
          .eq("is_credit", true)
          .lt("due_date", new Date().toISOString().slice(0, 10))
          .neq("status", "cancelled");

        if (error) {
          console.error("Error consultando ventas vencidas", error);
          return new Response("Error", { status: 500 });
        }

        const overdueSales = (candidateSales ?? []).filter(
          (s) => Number(s.paid_amount) < Number(s.total),
        );

        let sent = 0;
        let skipped = 0;

        for (const sale of overdueSales) {
          const customerPhone = (sale as any).customers?.phone;
          const businessName = (sale as any).businesses?.name ?? "tu proveedor";
          if (!customerPhone) {
            skipped++;
            continue; // No hay teléfono asociado al cliente, no se puede recordar por WhatsApp.
          }

          const { data: recentReminders } = await supabaseAdmin
            .from("collection_reminders")
            .select("id, sent_at")
            .eq("sale_id", sale.id)
            .order("sent_at", { ascending: false })
            .limit(MAX_REMINDERS_PER_SALE);

          if ((recentReminders?.length ?? 0) >= MAX_REMINDERS_PER_SALE) {
            skipped++;
            continue; // Ya se enviaron los recordatorios máximos para esta venta.
          }

          const lastSentAt = recentReminders?.[0]?.sent_at;
          if (lastSentAt) {
            const daysSinceLast = (Date.now() - new Date(lastSentAt).getTime()) / 86_400_000;
            if (daysSinceLast < REMINDER_COOLDOWN_DAYS) {
              skipped++;
              continue; // Todavía en cooldown, evita spamear al cliente.
            }
          }

          const daysOverdue = Math.floor(
            (Date.now() - new Date(sale.due_date as string).getTime()) / 86_400_000,
          );

          const message = await buildReminderMessage(
            businessName,
            sale.customer_name ?? "cliente",
            Number(sale.total),
            Number(sale.paid_amount),
            daysOverdue,
          );

          const connection = await findActiveWhatsAppConnection(sale.business_id);
          let status: "sent" | "failed" = "failed";
          if (connection) {
            const ok = await sendWhatsAppMessage(connection.phone_number_id, connection.access_token, customerPhone, message);
            status = ok ? "sent" : "failed";
            if (ok) sent++;
          }

          await supabaseAdmin.from("collection_reminders").insert({
            business_id: sale.business_id,
            sale_id: sale.id,
            channel: "whatsapp",
            status,
            message_content: message,
          });
        }

        return Response.json({ ok: true, sent, skipped, total: overdueSales.length });
      },
    },
  },
});
