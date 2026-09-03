import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authedUserClient } from "@/lib/fiscal/fiscal-service.server";
import { checkRateLimit } from "@/lib/rate-limit.server";
import { getClientIpFingerprint, jsonRequestTooLarge } from "@/lib/request-security.server";

const cancelSchema = z.object({ business_id: z.string().uuid() }).strict();

export const Route = createFileRoute("/api/billing/subscribe/cancel")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (jsonRequestTooLarge(request, 8 * 1024)) return Response.json({ error: "Solicitud demasiado grande" }, { status: 413 });
        const client = await authedUserClient(request);
        if (!client) return new Response("Unauthorized", { status: 401 });

        const parsed = cancelSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: "Datos de cancelación inválidos" }, { status: 400 });
        const { business_id: businessId } = parsed.data;

        const { data: userData } = await client.auth.getUser();
        if (!userData.user?.id) return new Response("Unauthorized", { status: 401 });

        const { data: membership } = await client
          .from("business_members")
          .select("role")
          .eq("business_id", businessId)
          .eq("user_id", userData.user.id)
          .in("role", ["owner", "admin"])
          .maybeSingle();
        if (!membership) return new Response("Forbidden", { status: 403 });

        const allowedByBusiness = await checkRateLimit(`subscribe-cancel:${businessId}`, 10, 3600);
        const allowedByIp = await checkRateLimit(`subscribe-cancel-ip:${getClientIpFingerprint(request)}`, 30, 3600);
        if (!allowedByBusiness || !allowedByIp) {
          return Response.json({ error: "Demasiados intentos, intenta más tarde" }, { status: 429, headers: { "Retry-After": "3600" } });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin
          .from("businesses")
          .update({ plan: "starter", subscription_status: "canceled", next_charge_date: null })
          .eq("id", businessId);
        if (error) return Response.json({ error: "No pudimos cancelar la suscripción." }, { status: 500 });

        return Response.json({ ok: true });
      },
    },
  },
});
