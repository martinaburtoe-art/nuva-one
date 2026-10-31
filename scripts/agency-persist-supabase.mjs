/**
 * agency-persist-supabase.mjs — Persistencia durable de ejecuciones de Nüva Agency.
 *
 * Usa las tablas existentes agency_missions, agency_tasks y agency_events.
 * Requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno server-side.
 * No aplica migraciones remotas ni modifica RLS. Nunca registra credenciales.
 */

import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  const missing = [];
  if (!URL) missing.push("SUPABASE_URL");
  if (!SERVICE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  missingCredentials = `Credenciales no configuradas: ${missing.join(", ")}`;
}

function stableUuid(namespace, value) {
  const bytes = createHash("sha256").update(`${namespace}:${String(value)}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function missionUuid(value) {
  const key = String(value ?? "").trim();
  return UUID_RE.test(key) ? key : stableUuid("agency-mission", key || "default");
}

function taskUuid(missionId, value) {
  const key = String(value ?? "").trim();
  return UUID_RE.test(key) ? key : stableUuid(`agency-task:${missionId}`, key || "default");
}

function unavailable() {
  return { persisted: false, reason: missingCredentials || "Supabase no disponible" };
}

async function persistCycle({ missionId, title, objective, agentId, result, evidence = [], verdicts = [] }) {
  if (!available || !client) return unavailable();
  try {
    const now = new Date().toISOString();
    const id = missionUuid(missionId ?? `${title}:${objective}`);
    const missionPayload = {
      id,
      title: title || "Nüva Agency cycle",
      objective: objective || "Autonomous agency decision cycle",
      priority: 80,
      status: result === "PASS" ? "completed" : result === "FAIL" ? "failed" : "running",
      current_agent_id: agentId,
      last_heartbeat_at: now,
      completed_at: result === "PASS" || result === "FAIL" ? now : null,
      metadata: {
        mode: "durable-autonomous-agency",
        scope: "cycle",
        logical_mission_key: missionId ?? null,
        evidence,
        verdicts,
      },
    };
    const { error: missionError } = await client.from("agency_missions").upsert(missionPayload, { onConflict: "id" });
    if (missionError) throw missionError;

    const { error: eventError } = await client.from("agency_events").insert({
      mission_id: id,
      agent_id: agentId,
      event_type: "cycle.decision",
      level: result === "PASS" ? "success" : result === "FAIL" ? "error" : "warn",
      message: `Ciclo de decisión completado con veredicto ${result}`,
      payload: { evidence, verdicts, result, logical_mission_key: missionId ?? null },
    });
    if (eventError) throw eventError;
    return { persisted: true, missionId: id };
  } catch (error) {
    return { persisted: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

async function persistExecution({
  missionId, taskId, title, objective, agentId, status, result, summary, output = {},
  attemptCount = 1, maxAttempts = 3, inputContext = {},
}) {
  if (!available || !client) return unavailable();
  if (!missionId || !taskId) return { persisted: false, reason: "missionId y taskId son obligatorios" };

  try {
    const now = new Date().toISOString();
    const durableMissionId = missionUuid(missionId);
    const durableTaskId = taskUuid(durableMissionId, taskId);
    const missionPayload = {
      id: durableMissionId,
      title: title || `Agency execution ${String(missionId).slice(0, 80)}`,
      objective: objective || "Backlog task execution",
      priority: 70,
      status: "running",
      current_agent_id: agentId,
      last_heartbeat_at: now,
      metadata: {
        mode: "durable-autonomous-agency",
        scope: "backlog-execution",
        logical_mission_key: String(missionId),
      },
    };
    const { error: missionError } = await client.from("agency_missions").upsert(missionPayload, { onConflict: "id" });
    if (missionError) throw missionError;

    const taskPayload = {
      id: durableTaskId,
      mission_id: durableMissionId,
      title,
      objective,
      agent_id: agentId,
      priority: 70,
      status,
      attempt_count: Math.max(1, Number(attemptCount) || 1),
      max_attempts: Math.max(1, Number(maxAttempts) || 3),
      next_retry_at: null,
      input_context: { ...inputContext, backlog_task_id: String(taskId) },
      output_summary: summary ?? null,
      result: { ...(output && typeof output === "object" ? output : {}), result, logical_task_id: String(taskId) },
      completed_at: status === "completed" || status === "failed" ? now : null,
    };
    const { error: taskError } = await client.from("agency_tasks").upsert(taskPayload, { onConflict: "id" });
    if (taskError) throw taskError;

    const { error: eventError } = await client.from("agency_events").insert({
      mission_id: durableMissionId,
      task_id: durableTaskId,
      agent_id: agentId,
      event_type: "task.execution",
      level: result === "PASS" ? "success" : result === "FAIL" ? "error" : "info",
      message: `Ejecución de tarea ${String(taskId)}: ${status}`,
      payload: {
        summary, output, result, attemptCount, maxAttempts,
        logical_mission_key: String(missionId),
        logical_task_id: String(taskId),
      },
    });
    if (eventError) throw eventError;
    return { persisted: true, missionId: durableMissionId, taskId: durableTaskId };
  } catch (error) {
    return { persisted: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

async function finalizeMission({ missionId, status, summary = "" }) {
  if (!available || !client) return unavailable();
  if (!["queued", "running", "completed", "failed", "paused"].includes(status)) {
    return { persisted: false, reason: "Estado de misión no permitido" };
  }
  try {
    const now = new Date().toISOString();
    const id = missionUuid(missionId);
    const { data, error } = await client
      .from("agency_missions")
      .update({
        status,
        last_heartbeat_at: now,
        completed_at: ["completed", "failed"].includes(status) ? now : null,
      })
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return { persisted: false, reason: "Misión durable no encontrada" };
    const { error: eventError } = await client.from("agency_events").insert({
      mission_id: id,
      agent_id: "orchestrator",
      event_type: "mission.finalized",
      level: status === "completed" ? "success" : status === "failed" ? "error" : "info",
      message: `Misión finalizada: ${status}`,
      payload: { summary },
    });
    if (eventError) throw eventError;
    return { persisted: true, missionId: id, status };
  } catch (error) {
    return { persisted: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

async function checkAvailability() {
  if (!available || !client) return { available: false, reason: missingCredentials };
  try {
    const { error } = await client.from("agency_missions").select("id").limit(1).maybeSingle();
    if (error) throw error;
    return { available: true, reason: null };
  } catch (error) {
    return { available: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

export { client, available, stableUuid, persistCycle, persistExecution, finalizeMission, checkAvailability };

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  (async () => {
    const status = await checkAvailability();
    console.log(JSON.stringify(status, null, 2));
    process.exitCode = status.available ? 0 : 1;
  })();
}