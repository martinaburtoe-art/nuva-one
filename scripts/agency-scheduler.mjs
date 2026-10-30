/**
 * agency-scheduler.mjs — Scheduler recurrente de Nüva Agency.
 *
 * Implementa programación recurrente real sobre el executor/misiones de Agency:
 *
 *   - Frecuencias configurables por job (config/agency-scheduler.json)
 *   - Persistencia del próximo ciclo (logs/scheduler/state.json)
 *   - Prevención de ejecuciones duplicadas (lock file + state)
 *   - Heartbeat (logs/scheduler/heartbeat.json)
 *   - Reintentos acotados por job
 *   - Registro de ejecuciones omitidas o fallidas (logs/scheduler/)
 *   - Pausa y reanudación (.agency-pause / .agency-resume)
 *   - Recuperación tras reinicios (lee state, no duplica ejecuciones)
 *
 * Uso:
 *   node scripts/agency-scheduler.mjs          # ciclo recurrente (para Task Scheduler)
 *   node scripts/agency-scheduler.mjs --once   # una sola ejecución (batch)
 *   node scripts/agency-scheduler.mjs --status # mostrar estado
 *
 * Configuración en config/agency-scheduler.json (ejemplo):
 *   {
 *     "enabled": true,
 *     "timezone": "America/Santiago",
 *     "jobs": [
 *       {
 *         "id": "agency-cycle",
 *         "type": "executor",
 *         "intervalMinutes": 15,
 *         "args": ["--batch=true", "--maxtasks=3"],
 *         "enabled": true,
 *         "maxAttempts": 3
 *       }
 *     ]
 *   }
 */

import { execFile } from "node:child_process";
import { readFile, writeFile, mkdir, unlink, stat } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const CONFIG_FILE = join(ROOT, "config", "agency-scheduler.json");
const STATE_DIR = join(ROOT, "logs", "scheduler");
const STATE_FILE = join(STATE_DIR, "state.json");
const HEARTBEAT_FILE = join(STATE_DIR, "heartbeat.json");
const LOCK_FILE = join(STATE_DIR, ".scheduler.lock");
const PAUSE_FILE = join(ROOT, ".agency-pause");
const RESUME_FILE = join(ROOT, ".agency-resume");
const LOG_FILE = join(STATE_DIR, `scheduler-${new Date().toISOString().slice(0, 10)}.log`);
const EXECUTOR = join(ROOT, "scripts", "agency-task-executor.mjs");
const MISSION_RUNNER = join(ROOT, "scripts", "agency-mission.mjs");

const LOCK_STALE_MS = 300000; // 5 min
const HEARTBEAT_TTL_MS = 600000; // 10 min sin heartbeat = scheduler caído

function nowIso() {
  return new Date().toISOString();
}

async function ensureDir() {
  await mkdir(STATE_DIR, { recursive: true });
}

async function readJson(path, def) {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw);
  } catch {
    return def;
  }
}

async function writeJson(path, data) {
  await ensureDir();
  await writeFile(path, JSON.stringify(data, null, 2) + "\n");
}

async function appendLog(entry) {
  await ensureDir();
  const line = JSON.stringify({ ts: nowIso(), ...entry }) + "\n";
  await writeFile(LOG_FILE, line, { flag: "a" });
}

function isPaused() {
  try {
    stat.sync(PAUSE_FILE);
    return true;
  } catch {
    return false;
  }
}

function isResumed() {
  try {
    stat.sync(RESUME_FILE);
    return true;
  } catch {
    return false;
  }
}

// --- Lock ---

async function acquireLock() {
  const lockContent = JSON.stringify({ pid: process.pid, acquiredAt: nowIso() }) + "\n";
  try {
    await writeFile(LOCK_FILE, lockContent, { flag: "wx" });
    return true;
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    try {
      const raw = await readFile(LOCK_FILE, "utf8");
      const existing = JSON.parse(raw);
      const age = Date.now() - new Date(existing.acquiredAt).getTime();
      if (age > LOCK_STALE_MS) {
        await writeFile(LOCK_FILE, lockContent, { flag: "w" });
        return true;
      }
    } catch {
      try {
        await writeFile(LOCK_FILE, lockContent, { flag: "wx" });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

async function releaseLock() {
  try {
    await unlink(LOCK_FILE);
  } catch { /* no crítico */ }
}

// --- Heartbeat ---

async function writeHeartbeat(status = "active") {
  await writeJson(HEARTBEAT_FILE, {
    pid: process.pid,
    lastBeat: nowIso(),
    status,
  });
}

async function readHeartbeat() {
  return await readJson(HEARTBEAT_FILE, null);
}

// --- Config y Estado ---

function defaultConfig() {
  return {
    enabled: true,
    timezone: "America/Santiago",
    jobs: [
      {
        id: "agency-cycle",
        type: "executor",
        intervalMinutes: 15,
        args: ["--batch=true", "--maxtasks=3"],
        enabled: true,
        maxAttempts: 3,
      },
    ],
  };
}

async function loadConfig() {
  const cfg = await readJson(CONFIG_FILE, null);
  if (!cfg || !cfg.jobs) {
    await writeJson(CONFIG_FILE, defaultConfig());
    return defaultConfig();
  }
  return cfg;
}

function defaultState() {
  return { jobs: {}, schedulerPid: null, lastCycle: null };
}

async function loadState() {
  return await readJson(STATE_FILE, defaultState());
}

async function saveState(state) {
  await writeJson(STATE_FILE, state);
}

// --- Utils de tiempo ---

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

function isDue(nextRunIso) {
  if (!nextRunIso) return true;
  return new Date(nextRunIso) <= new Date();
}

// --- Ejecución de un job ---

async function runExecutorJob(job) {
  const args = job.args || ["--batch=true", "--maxtasks=3"];
  return new Promise((resolve) => {
    execFile("node", [EXECUTOR, ...args], {
      cwd: ROOT,
      timeout: 240000,
    }, (error, stdout, stderr) => {
      resolve({
        exitCode: error ? (typeof error.code === "number" ? error.code : -1) : 0,
        stdout: stdout || "",
        stderr: stderr || "",
        timedOut: error ? error.killed === false : false,
      });
    });
  });
}

async function runMissionJob(job) {
  const missionId = job.missionId;
  if (!missionId) {
    return { exitCode: 1, stdout: "", stderr: "missionId requerido para job de tipo mission" };
  }
  return new Promise((resolve) => {
    execFile("node", [MISSION_RUNNER, "execute", missionId], {
      cwd: ROOT,
      timeout: 300000,
    }, (error, stdout, stderr) => {
      resolve({
        exitCode: error ? (typeof error.code === "number" ? error.code : -1) : 0,
        stdout: stdout || "",
        stderr: stderr || "",
        timedOut: error ? error.killed === false : false,
      });
    });
  });
}

// --- Ciclo principal del scheduler ---

async function runCycle() {
  const start = nowIso();
  const cfg = await loadConfig();

  if (!cfg.enabled) {
    await appendLog({ evento: "scheduler.deshabilitado" });
    console.log(JSON.stringify({ estado: "deshabilitado", motivo: "scheduler.enabled = false" }));
    return;
  }

  // Pausa de emergencia
  if (isPaused() && !isResumed()) {
    await appendLog({ evento: "scheduler.pausado", motivo: ".agency-pause presente" });
    console.log(JSON.stringify({ estado: "pausado", motivo: "archivo .agency-pause presente; usar .agency-resume para reanudar" }));
    return;
  }

  // Si había una pausa y ahora hay resume, borrar archivos de pausa/resume
  if (isResumed()) {
    try { await unlink(RESUME_FILE); } catch {}
    try { await unlink(PAUSE_FILE); } catch {}
    await appendLog({ evento: "scheduler.reanudado" });
  }

  // Exclusión mutua
  const lockAcquired = await acquireLock();
  if (!lockAcquired) {
    await appendLog({ evento: "scheduler.bloqueado", motivo: "otra instancia en curso" });
    console.log(JSON.stringify({ estado: "bloqueado", motivo: "otra instancia del scheduler ya está en curso" }));
    process.exitCode = 1;
    return;
  }

  try {
    await writeHeartbeat("active");
    const state = await loadState();
    const results = [];

    for (const job of cfg.jobs) {
      if (!job.enabled) continue;

      const jobState = state.jobs[job.id] || {
        lastRun: null,
        nextRun: null,
        intervalMinutes: job.intervalMinutes || 60,
        consecutiveFailures: 0,
        totalRuns: 0,
        totalSkipped: 0,
        totalFailures: 0,
      };

      // Sincronizar intervalo si cambió en la config
      if (job.intervalMinutes) jobState.intervalMinutes = job.intervalMinutes;

      // Calcular próximo ciclo si no existe
      if (!jobState.nextRun) {
        jobState.nextRun = addMinutes(new Date(), jobState.intervalMinutes).toISOString();
      }

      const due = isDue(jobState.nextRun);

      if (!due) {
        results.push({ jobId: job.id, action: "skip", reason: "notDue", nextRun: jobState.nextRun });
        continue;
      }

      // Ejecutar job con reintentos
      let lastRunResult = null;
      let success = false;
      const maxAttempts = job.maxAttempts || 3;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (isPaused() && !isResumed()) {
          await appendLog({ evento: "scheduler.pausado_durante_job", jobId: job.id, attempt });
          jobState.totalSkipped = (jobState.totalSkipped || 0) + 1;
          await saveState(state);
          console.log(JSON.stringify({ estado: "pausado", jobId: job.id }));
          return;
        }

        let run;
        if (job.type === "mission") {
          run = await runMissionJob(job);
        } else {
          run = await runExecutorJob(job);
        }

        lastRunResult = run;
        if (run.exitCode === 0) {
          success = true;
          break;
        }

        jobState.consecutiveFailures = (jobState.consecutiveFailures || 0) + 1;
        await appendLog({
          evento: "scheduler.jobReintento",
          jobId: job.id,
          attempt,
          maxAttempts,
          exitCode: run.exitCode,
        });

        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 2000 * attempt));
        }
      }

      const now = new Date();
      jobState.lastRun = now.toISOString();
      jobState.nextRun = addMinutes(now, jobState.intervalMinutes).toISOString();
      jobState.totalRuns = (jobState.totalRuns || 0) + 1;

      if (success) {
        jobState.consecutiveFailures = 0;
        results.push({
          jobId: job.id,
          action: "executed",
          exitCode: lastRunResult.exitCode,
          nextRun: jobState.nextRun,
        });
        await appendLog({ evento: "scheduler.jobEjecutado", jobId: job.id, exitCode: lastRunResult.exitCode, nextRun: jobState.nextRun });
      } else {
        jobState.totalFailures = (jobState.totalFailures || 0) + 1;
        results.push({
          jobId: job.id,
          action: "failed",
          exitCode: lastRunResult ? lastRunResult.exitCode : -1,
          stderr: lastRunResult ? lastRunResult.stderr : "no execution",
          nextRun: jobState.nextRun,
        });
        await appendLog({ evento: "scheduler.jobFallido", jobId: job.id, exitCode: lastRunResult ? lastRunResult.exitCode : -1, nextRun: jobState.nextRun });
      }

      state.jobs[job.id] = jobState;
    }

    state.schedulerPid = process.pid;
    state.lastCycle = start;
    await saveState(state);
    await writeHeartbeat("active");

    console.log(JSON.stringify({
      estado: "completado",
      inicio: start,
      fin: nowIso(),
      jobs: results,
    }, null, 2));
  } finally {
    await releaseLock();
  }
}

// --- Modo --once (batch único, retrocompatibilidad) ---

async function runOnce() {
  const cfg = await loadConfig();
  const job = cfg.jobs.find((j) => j.enabled);
  if (!job) {
    console.log(JSON.stringify({ estado: "sinJobsHabilitados" }));
    return;
  }

  const args = job.args || ["--batch=true", "--maxtasks=3"];
  const run = await new Promise((resolve) => {
    execFile("node", [EXECUTOR, ...args], { cwd: ROOT, timeout: 240000 }, (error, stdout, stderr) => {
      resolve({
        exitCode: error ? (typeof error.code === "number" ? error.code : -1) : 0,
        stdout: stdout || "",
        stderr: stderr || "",
      });
    });
  });

  console.log(JSON.stringify({
    estado: run.exitCode === 0 ? "completado" : "fallido",
    modo: "once",
    jobId: job.id,
    exitCode: run.exitCode,
    salida: run.stdout.slice(0, 2000),
  }, null, 2));
}

// --- Estado ---

async function showStatus() {
  const cfg = await loadConfig();
  const state = await loadState();
  const hb = await readHeartbeat();

  let schedulerStatus = "inactivo";
  if (hb) {
    const age = Date.now() - new Date(hb.lastBeat).getTime();
    schedulerStatus = age < HEARTBEAT_TTL_MS ? "activo" : "caído";
  }

  const jobsStatus = cfg.jobs.map((job) => {
    const js = state.jobs[job.id] || {};
    return {
      id: job.id,
      type: job.type,
      enabled: job.enabled,
      intervalMinutes: job.intervalMinutes || 60,
      lastRun: js.lastRun || null,
      nextRun: js.nextRun || null,
      totalRuns: js.totalRuns || 0,
      totalFailures: js.totalFailures || 0,
      consecutiveFailures: js.consecutiveFailures || 0,
    };
  });

  console.log(JSON.stringify({
    scheduler: {
      status: schedulerStatus,
      pid: hb ? hb.pid : null,
      lastBeat: hb ? hb.lastBeat : null,
      paused: isPaused(),
    },
    config: CONFIG_FILE,
    jobs: jobsStatus,
  }, null, 2));
}

// --- CLI ---

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--once")) {
    await runOnce();
    return;
  }

  if (args.includes("--status")) {
    await showStatus();
    return;
  }

  await runCycle();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
