/**
 * agency-persist-supabase.mjs — ETAPA 2: Persistencia duradera de Agency en Supabase.
 *
 * Escribe ejecuciones y ciclos de decisión en las tablas existentes:
 *   public.agency_missions, public.agency_tasks, public.agency_events
 *
 * Requiere: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (server-side, nunca expuestos).
 * Si faltan credenciales, el script sale con código 0 pero reporta B-002 como bloqueador,
 * dejando el código preparado para cuando se configuren. No aplica migraciones remotas
 * ni modifica RLS. No escribe secretos en logs.
 */

import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let client = null;
let available = false;
let missingCredentials = null;

if (URL && SERVICE_KEY) {
  try {
    client = createClient(URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    available = true;
  } catch (error) {
    available = false;
    missingCredentials = `Error inicializando Supabase: ${error instanceof Error ? error.message : String(error)}`;
  }
} else {
  const faltantes = [];
  if (!URL) faltantes.push("SUPABASE_URL");
  if (!SERVICE_KEY) faltantes.push("SUPABASE_SERVICE_ROLE_KEY");
  missingCredentials = `Credenciales no configuradas: ${faltantes.join(", ")} (bloqueador B-002)`;
}

/**
 * Registra un ciclo de decisión en agency_missions + agency_events.
 * Si Supabase no está disponible, devuelve { persisted: false, reason }.
 */
async function persistCycle({ missionId, title, objective, agentId, result, evidence = [], verdicts = [] }) {
  if (!available) {
    return { persisted: false, reason: missingCredentials || "Supabase no disponible" };
  }
  try {
    const now = new Date().toISOString();
    const missionPayload = {
      title,
      objective,
      priority: 80,
      status: result === "PASS" ? "completed" : result === "FAIL" ? "failed" : "running",
      current_agent_id: agentId,
      last_heartbeat_at: now,
      metadata: {
        mode: "durable-autonomous-agency",
        scope: "cycle",
        evidence,
        verdicts,
      },
    };

    const { data: mission, error: missionError } = await client
      .from("agency_missions")
      .insert(missionPayload)
      .select("id")
      .single();
    if (missionError) throw missionError;

    const events = [
      {
        mission_id: mission.id,
        agent_id: agentId,
        event_type: "cycle.decision",
        level: result === "PASS" ? "success" : result === "FAIL" ? "error" : "warn",
        message: `Ciclo de decisión completado con veredicto ${result}`,
        payload: { evidence, verdicts, result },
      },
    ];

    const { error: eventsError } = await client.from("agency_events").insert(events);
    if (eventsError) throw eventsError;

    return { persisted: true, missionId: mission.id };
  } catch (error) {
    return {
      persisted: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Registra una ejecución de tarea en agency_tasks + agency_events.
 */
async function persistExecution({ missionId, taskId, title, objective, agentId, status, result, summary, output = {} }) {
  if (!available) {
    return { persisted: false, reason: missingCredentials || "Supabase no disponible" };
  }
  try {
    const now = new Date().toISOString();
    const taskPayload = {
      id: taskId,
      mission_id: missionId,
      title,
      objective,
      agent_id: agentId,
      priority: 70,
      status,
      attempt_count: 1,
      max_attempts: 3,
      next_retry_at: null,
      output_summary: summary ?? null,
      result: output ?? {},
      completed_at: status === "completed" || status === "failed" ? now : null,
    };

    const { error: taskError } = await client.from("agency_tasks").upsert(taskPayload);
    if (taskError) throw taskError;

    const { error: eventError } = await client.from("agency_events").insert({
      mission_id: missionId,
      task_id: taskId,
      agent_id: agentId,
      event_type: "task.execution",
      level: result === "PASS" ? "success" : result === "FAIL" ? "error" : "info",
      message: `Ejecución de tarea ${taskId}: ${status}`,
      payload: { summary, output, result },
    });
    if (eventError) throw eventError;

    return { persisted: true, taskId };
  } catch (error) {
    return {
      persisted: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Verifica disponibilidad sin escribir nada.
 */
async function checkAvailability() {
  if (!available) {
    return { available: false, reason: missingCredentials };
  }
  try {
    const { error } = await client.from("agency_missions").select("id").limit(1).maybeSingle();
    if (error) throw error;
    return { available: true, reason: null };
  } catch (error) {
    return {
      available: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

export { client, available, persistCycle, persistExecution, checkAvailability };

// Ejecución directa por CLI: solo diagnóstico de disponibilidad
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const status = await checkAvailability();
    console.log(JSON.stringify(status, null, 2));
    process.exitCode = status.available ? 0 : 1;
  })();
}