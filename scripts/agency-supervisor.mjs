/**
 * agency-supervisor.mjs — Supervisor duradero de Nüva Agency.
 *
 * Mantiene el scheduler de Agency ejecutándose persistentemente:
 * - Lanza `node scripts/agency-scheduler.mjs` (modo recurrente) en intervalo configurable.
 * - Supervisa el heartbeat del scheduler; si se cae o el heartbeat expira, lo reinicia.
 * - Registra cada ciclo, fallo y reinicio en logs/supervisor/.
 * - Expone estado para el Owner Console.
 *
 * Uso:
 *   node scripts/agency-supervisor.mjs          # bucle duradero (Ctrl+C para detener)
 *   node scripts/agency-supervisor.mjs --once   # un solo ciclo del supervisor
 */

import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const ROOT = process.cwd();
const SCHEDULER = join(ROOT, "scripts", "agency-scheduler.mjs");
const SUPERVISOR_LOG_DIR = join(ROOT, "logs", "supervisor");
const SUPERVISOR_STATE = join(SUPERVISOR_LOG_DIR, "state.json");
const SUPERVISOR_LOG = join(SUPERVISOR_LOG_DIR, `supervisor-${new Date().toISOString().slice(0, 10)}.log`);
const HEARTBEAT_FILE = join(ROOT, "logs", "scheduler", "heartbeat.json");
const HEARTBEAT_STALE_MS = 900000; // 15 min sin heartbeat = supervisor considera al scheduler caído
const SUPERVISOR_INTERVAL_MS = 300000; // 5 min entre chequeos del scheduler

const readFileP = promisify(readFile);
const writeFileP = promisify(writeFile);

function nowIso() {
  return new Date().toISOString();
}

async function ensureDir() {
  try {
    await mkdir(SUPERVISOR_LOG_DIR, { recursive: true });
  } catch { /* ya existe */ }
}

async function readJson(path, def) {
  try {
    const raw = await readFileP(path, "utf8");
    return JSON.parse(raw);
  } catch {
    return def;
  }
}

async function writeJson(path, data) {
  await writeFileP(path, JSON.stringify(data, null, 2) + "\n");
}

async function appendLog(entry) {
  const line = JSON.stringify({ ts: nowIso(), ...entry }) + "\n";
  await writeFileP(SUPERVISOR_LOG, line, { flag: "a" });
}

async function readState() {
  return await readJson(SUPERVISOR_STATE, {
    supervisorPid: null,
    startedAt: null,
    totalCycles: 0,
    totalRestarts: 0,
    lastCycle: null,
    lastAlert: null,
    schedulerStatus: "inactivo",
  });
}

async function saveState(state) {
  await writeJson(SUPERVISOR_STATE, state);
}

async function schedulerHeartbeatStale() {
  try {
    const hb = await readJson(HEARTBEAT_FILE, null);
    if (!hb) return true;
    const age = Date.now() - new Date(hb.lastBeat).getTime();
    return age > HEARTBEAT_STALE_MS;
  } catch {
    return true;
  }
}

async function runSchedulerOnce() {
  return new Promise((resolve) => {
    execFile("node", [SCHEDULER], {
      cwd: ROOT,
      timeout: 300000, // 5 min max por ciclo del scheduler
    }, (error, stdout, stderr) => {
      resolve({
        exitCode: error ? (typeof error.code === "number" ? error.code : -1) : 0,
        stdout: stdout || "",
        stderr: stderr || "",
        timedOut: error ? error.killed !== false : false,
      });
    });
  });
}

async function sendOwnerAlert(message, level = "warning") {
  const timestamp = nowIso();
  await appendLog({
    evento: "supervisor.alerta",
    nivel: level,
    mensaje: message,
    timestamp,
  });
  // Registrar alerta en el estado para que el Owner Console pueda leerla
  const state = await readState();
  state.lastAlert = { timestamp, nivel: level, mensaje: message };
  await saveState(state);
  // Imprimir a consola para visibilidad inmediata
  console.log(`[${timestamp}] [${level.toUpperCase()}] ALERTA OWNER: ${message}`);
}

async function runCycle() {
  await ensureDir();
  const state = await readState();
  state.supervisorPid = process.pid;
  if (!state.startedAt) state.startedAt = nowIso();
  state.totalCycles += 1;
  state.lastCycle = nowIso();

  const stale = await schedulerHeartbeatStale();
  if (stale) {
    state.totalRestarts += 1;
    await sendOwnerAlert(
      `Scheduler de Agency detectado como caído (heartbeat expirado). Reinicio #${state.totalRestarts}.`,
      "error"
    );
  }

  const run = await runSchedulerOnce();

  if (run.exitCode === 0 && !stale) {
    state.schedulerStatus = "activo";
    await appendLog({
      evento: "supervisor.cicloOk",
      ciclo: state.totalCycles,
      salida: run.stdout.slice(0, 500),
    });
  } else {
    state.schedulerStatus = "degradado";
    await sendOwnerAlert(
      `Ciclo del scheduler falló (exitCode=${run.exitCode}, stale=${stale}). stderr: ${run.stderr.slice(0, 200)}`,
      "error"
    );
  }

  await saveState(state);
  return run;
}

async function showStatus() {
  const state = await readState();
  const stale = await schedulerHeartbeatStale();
  console.log(JSON.stringify({
    supervisor: {
      pid: state.supervisorPid,
      startedAt: state.startedAt,
      status: stale ? "caído" : "activo",
      totalCycles: state.totalCycles,
      totalRestarts: state.totalRestarts,
      lastCycle: state.lastCycle,
      lastAlert: state.lastAlert,
      schedulerStatus: state.schedulerStatus,
    },
    heartbeatStale: stale,
  }, null, 2));
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--once")) {
    await runCycle();
    return;
  }

  if (args.includes("--status")) {
    await showStatus();
    return;
  }

  // Bucle duradero
  console.log(`[${nowIso()}] Supervisor de Nüva Agency iniciado. PID ${process.pid}`);
  await ensureDir();
  const state = await readState();
  state.supervisorPid = process.pid;
  if (!state.startedAt) state.startedAt = nowIso();
  await saveState(state);

  while (true) {
    try {
      await runCycle();
    } catch (error) {
      await sendOwnerAlert(`Excepción no controlada en supervisor: ${error.message}`, "critical");
    }
    await new Promise((r) => setTimeout(r, SUPERVISOR_INTERVAL_MS));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
