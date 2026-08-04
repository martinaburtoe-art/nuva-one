import { createFileRoute } from "@tanstack/react-router";
import { sendPushToTokens } from "@/lib/push.server";

// Llamado periódicamente por un cron (pg_cron + pg_net, mismo patrón que
// check-overdue.ts y follow-up.ts). Protegido por CRON_SECRET.
//
// Revisa productos bajo su umbral de stock (`low_stock_threshold`) y envía
// una push notification a los dueños/administradores del negocio dueño de
// ese producto. Si Firebase no está configurado todavía (sin
// FIREBASE_SERVICE_ACCOUNT_JSON), sendPushToTokens simplemente no envía nada
// — este endpoint puede correr sin romperse antes de que exista el proyecto
// Firebase.

const COOLDOWN_HOURS = 24; // no reavisar el mismo producto más de 1 vez al día

export const Route = createFileRoute("/api/notifications/low-stock-check")({
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

        // 1) Productos bajo su umbral, con umbral definido (> 0 = feature activada por el negocio).
        const { data: lowStockProducts, error } = await supabaseAdmin
          .from("products")
          .select("id, business_id, name, stock, low_stock_threshold, businesses(name)")
          .not("low_stock_threshold", "is", null)
          .gt("low_stock_threshold", 0);

        if (error) {
          console.error("Error consultando productos con stock bajo", error);
          return new Response("Error", { status: 500 });
        }

        const candidates = (lowStockProducts ?? []).filter(
          (p) => (p.stock ?? 0) <= (p.low_stock_threshold ?? 0),
        );

        if (candidates.length === 0) {
          return new Response(JSON.stringify({ checked: 0, notified: 0 }), { status: 200 });
        }

        // 2) Evitar reavisar el mismo producto dentro de la ventana de cooldown.
        //    Reusamos audit_log como registro liviano de "ya avisamos esto" en vez
        //    de crear una tabla nueva solo para este flag.
        const cooldownCutoff = new Date(Date.now() - COOLDOWN_HOURS * 3_600_000).toISOString();
        const { data: recentAlerts } = await supabaseAdmin
          .from("audit_log")
          .select("entity_id")
          .eq("action", "low_stock_push_sent")
          .gt("created_at", cooldownCutoff);
        const recentlyAlerted = new Set((recentAlerts ?? []).map((a) => a.entity_id));

        const toNotify = candidates.filter((p) => !recentlyAlerted.has(p.id));
        if (toNotify.length === 0) {
          return new Response(JSON.stringify({ checked: candidates.length, notified: 0 }), {
            status: 200,
          });
        }

        // 3) Agrupar por negocio para no spamear: 1 push por negocio con el resumen.
        const byBusiness = new Map<string, { name: string; products: typeof toNotify }>();
        for (const p of toNotify) {
          const key = p.business_id as string;
          const bizName = (p.businesses as any)?.name ?? "tu negocio";
          if (!byBusiness.has(key)) byBusiness.set(key, { name: bizName, products: [] });
          byBusiness.get(key)!.products.push(p);
        }

        let notified = 0;

        for (const [businessId, { name, products }] of byBusiness) {
          // Dueños y administradores del negocio (a ellos les importa el stock, no a todo el equipo).
          const { data: members } = await supabaseAdmin
            .from("business_members")
            .select("user_id")
            .eq("business_id", businessId)
            .in("role", ["owner", "admin"]);

          const userIds = (members ?? []).map((m) => m.user_id);
          if (userIds.length === 0) continue;

          const { data: tokenRows } = await supabaseAdmin
            .from("device_tokens")
            .select("fcm_token")
            .in("user_id", userIds);

          const tokens = (tokenRows ?? []).map((t) => t.fcm_token);
          if (tokens.length === 0) continue;

          const title = `Stock bajo en ${name}`;
          const body =
            products.length === 1
              ? `${products[0].name}: quedan ${products[0].stock} unidades.`
              : `${products.length} productos están bajo el mínimo de stock.`;

          const { sent, invalidTokens } = await sendPushToTokens(tokens, {
            title,
            body,
            data: { type: "low_stock", business_id: businessId },
          });

          if (sent > 0) {
            notified += 1;
            // Registrar que ya avisamos, para no repetir dentro del cooldown.
            await supabaseAdmin.from("audit_log").insert(
              products.map((p) => ({
                business_id: businessId,
                action: "low_stock_push_sent",
                entity: "product",
                entity_id: p.id,
                metadata: { stock: p.stock, threshold: p.low_stock_threshold },
              })),
            );
          }

          // Limpiar tokens que Firebase reporta como inválidos (app desinstalada, etc.)
          if (invalidTokens.length > 0) {
            await supabaseAdmin.from("device_tokens").delete().in("fcm_token", invalidTokens);
          }
        }

        return new Response(JSON.stringify({ checked: candidates.length, notified }), {
          status: 200,
        });
      },
    },
  },
});
