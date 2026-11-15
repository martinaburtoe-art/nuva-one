import { createFileRoute } from "@tanstack/react-router";
import { authedUserClient } from "@/lib/fiscal/fiscal-service.server";
import { checkRateLimit } from "@/lib/rate-limit.server";

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export const Route = createFileRoute("/api/documents/test-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const client = await authedUserClient(request);
        if (!client) return json({ error: "No autenticado" }, 401);
        const body = await request.json().catch(() => ({}));
        const businessId = typeof body.business_id === "string" ? body.business_id : "";
        if (!businessId) return json({ error: "Falta el negocio" }, 400);
        const { data: membership } = await client.from("business_members")
          .select("role").eq("business_id", businessId).maybeSingle();
        if (!membership || !["owner", "admin"].includes(String(membership.role))) {
          return json({ error: "Solo propietarios y administradores pueden probar el correo" }, 403);
        }
        const { data: auth } = await client.auth.getUser();
        const recipient = auth.user?.email?.trim();
        if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
          return json({ error: "Tu cuenta no tiene un correo válido para recibir la prueba" }, 409);
        }
        if (!(await checkRateLimit("document-email-test:" + auth.user!.id, 3, 3600))) {
          return json({ error: "Límite de pruebas alcanzado. Intenta más tarde." }, 429);
        }
        const apiKey = process.env.RESEND_API_KEY?.trim();
        const from = process.env.NUVA_DOCUMENTS_FROM_EMAIL?.trim();
        if (!apiKey || !from) return json({ error: "Resend todavía no está configurado en producción" }, 503);
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + apiKey,
            "Content-Type": "application/json",
            "Idempotency-Key": "nuva-documents-provider-test:" + auth.user!.id + ":" + Math.floor(Date.now() / 60000),
          },
          body: JSON.stringify({
            from,
            to: [recipient],
            subject: "Prueba de correo transaccional · Nüva One",
            text: "El canal de correo transaccional de Nüva One está conectado. Este mensaje confirma que Resend aceptó la solicitud de envío.",
            html: "<div style=\"font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#172033\"><h2 style=\"margin:0 0 12px\">Correo conectado</h2><p>El canal de correo transaccional de <strong>Nüva One</strong> está conectado.</p><p>Resend aceptó esta solicitud de envío de prueba.</p></div>",
          }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          const message = typeof result?.message === "string" ? result.message.slice(0, 240) : "Resend rechazó el envío de prueba";
          return json({ error: message, code: "RESEND_TEST_SEND_FAILED" }, 502);
        }
        return json({ ok: true, message_id: result?.id ?? null });
      },
    },
  },
});
