import { createFileRoute } from "@tanstack/react-router";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { assertPlatformOwner, platformOwnerErrorResponse } from "@/lib/platform-owner.server";

/**
 * Motor DETERMINÍSTICO de alertas de la Owner Console (migración 20261023190000).
 * - op=evaluate: compara métricas operacionales reales contra umbrales
 *   configurables (owner_alert_thresholds) y abre/incrementa/reabre incidentes
 *   por fingerprint estable. Sin IA, sin inventar causas: cada incidente lleva
 *   métrica, valor observado, umbral y ventana.
 * - op=list: incidentes + umbrales + últimos eventos.
 * - op=acknowledge/resolve: transición explícita del propietario con bitácora.
 * El motor NO cierra incidentes automáticamente: la resolución es humana y
 * verificable (evita oscilaciones por evaluaciones puntuales).
 */
export const Route = createFileRoute("/api/owner/alerts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await assertPlatformOwner(request);
        if (!auth.ok) return platformOwnerErrorResponse(auth);

        const payload = (await request.json().catch(() => null)) as {
          op?: string;
          incident_id?: string;
          note?: string;
        } | null;
        if (!payload?.op) return bad("Falta la operación");

        if (payload.op === "evaluate") {
          const evaluated = await evaluateAlerts(auth.admin, auth.userId);
          if (!evaluated.ok) return bad(evaluated.error);
          return ok(evaluated.result);
        }

        if (payload.op === "list") {
          const [incidentsRes, thresholdsRes, eventsRes] = await Promise.all([
            auth.admin.from("owner_incidents").select("*").order("last_seen_at", { ascending: false }).limit(100),
            auth.admin.from("owner_alert_thresholds").select("*").order("severity", { ascending: false }),
            auth.admin.from("owner_incident_events").select("*").order("created_at", { ascending: false }).limit(100),
          ]);
          if (incidentsRes.error || thresholdsRes.error || eventsRes.error) return bad("No se pudo leer el estado de alertas");
          return ok({
            incidents: incidentsRes.data ?? [],
            thresholds: thresholdsRes.data ?? [],
            events: eventsRes.data ?? [],
          });
        }

        if (payload.op === "acknowledge" || payload.op === "resolve") {
          if (!payload.incident_id) return bad("Falta incident_id");
          const now = new Date().toISOString();
          const patch =
            payload.op === "acknowledge"
              ? { status: "acknowledged", acknowledged_at: now, acknowledged_by: auth.userId }
              : {
                  status: "resolved",
                  resolved_at: now,
                  resolved_by: auth.userId,
                  resolution_note: payload.note?.slice(0, 500) ?? null,
                };
          const { data: incident, error } = await auth.admin
            .from("owner_incidents")
            .update(patch)
            .eq("id", payload.incident_id)
            .select("id,fingerprint,metric,status")
            .single();
          if (error || !incident) return bad("El incidente no existe o no se pudo actualizar");

          await Promise.all([
            auth.admin.from("owner_incident_events").insert({
              incident_id: incident.id,
              event: payload.op === "acknowledge" ? "acknowledged" : "resolved",
            }),
            auth.admin.from("owner_admin_actions").insert({
              actor_user_id: auth.userId,
              action: `alert_${payload.op}`,
              target_type: "owner_incident",
              target_id: incident.id,
              details: { metric: incident.metric, fingerprint: incident.fingerprint, note: payload.note ?? null },
            }),
          ]);
          return ok({ incident });
        }

        return bad("Operación no soportada");
      },
    },
  },
});

async function evaluateAlerts(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<{ ok: true; result: unknown } | { ok: false; error: string }> {
  const { data: thresholds, error: thresholdsError } = await admin
    .from("owner_alert_thresholds")
    .select("*")
    .eq("enabled", true);
  if (thresholdsError) return { ok: false, error: "No se pudieron leer los umbrales" };

  const { data: telemetry, error: telemetryError } = await admin.rpc("get_owner_operational_metrics", {
    p_window_hours: 24,
  });
  if (telemetryError) return { ok: false, error: "No se pudieron leer las métricas operacionales" };
  const metrics = (telemetry ?? {}) as unknown as Record<string, unknown>;

  const changed: string[] = [];
  for (const t of thresholds ?? []) {
    const raw = metrics[t.metric];
    if (raw == null) continue; // métrica no disponible: no afirmamos estado
    const value = Number(raw);
    if (!Number.isFinite(value)) continue;
    const breach = t.comparison === ">" ? value > Number(t.threshold_value) : value < Number(t.threshold_value);
    if (!breach) continue;

    const fingerprint = `${t.metric}:${t.window_label}:${t.severity}`;
    const { data: existing } = await admin
      .from("owner_incidents")
      .select("id,status,occurrences")
      .eq("fingerprint", fingerprint)
      .maybeSingle();

    if (!existing) {
      const { data: created, error: createError } = await admin
        .from("owner_incidents")
        .insert({
          fingerprint,
          metric: t.metric,
          severity: t.severity,
          observed_value: value,
          threshold_value: Number(t.threshold_value),
          comparison: t.comparison,
          window_label: t.window_label,
        })
        .select("id")
        .single();
      if (createError) continue;
      if (created) await admin.from("owner_incident_events").insert({ incident_id: created.id, event: "opened", observed_value: value });
      changed.push(fingerprint);
    } else if (existing.status === "resolved") {
      await admin
        .from("owner_incidents")
        .update({
          status: "open",
          occurrences: 1,
          observed_value: value,
          first_seen_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          resolved_at: null,
          resolved_by: null,
          resolution_note: null,
        })
        .eq("id", existing.id);
      await admin.from("owner_incident_events").insert({ incident_id: existing.id, event: "reopened", observed_value: value });
      changed.push(fingerprint);
    } else {
      await admin
        .from("owner_incidents")
        .update({
          occurrences: (existing.occurrences ?? 0) + 1,
          observed_value: value,
          last_seen_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      await admin.from("owner_incident_events").insert({ incident_id: existing.id, event: "occurrence", observed_value: value });
      changed.push(fingerprint);
    }
  }

  void userId;
  return { ok: true, result: { evaluated_at: new Date().toISOString(), changed, thresholds: thresholds?.length ?? 0 } };
}

function ok(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "private, no-store" },
  });
}
function bad(error: string) {
  return new Response(JSON.stringify({ error }), {
    status: 400,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
