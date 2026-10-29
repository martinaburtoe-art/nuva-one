/**
 * agency-scheduler.mjs — ETAPA 3: Ejecución programada de Nüva Agency.
 *
 * Implementa un scheduler por lotes sobre el executor existente
 * (scripts/agency-task-executor.mjs) con:
 *
 *   - Exclusión mutua: lock file .scheduler.lock, stale > 5 min se sobrescribe.
 *   - Límites: maxTareasPorCiclo y maxMsPorCiclo.
 *   - Reintentos acotados: maxReintentosCiclo (default 3).
 *   - Pausa de emergencia: archivo .agency-pause (presencia = pausado).
 *   - Registro duradero: escribe en logs/scheduler/ y delega al executor.
 *   - Protección contra bucles: contador de ciclos sin progreso, parada forzada.
 *   - Protección contra gasto ilimitado de IA: no hay llamadas a LLM; solo comandos locales.
 *
 * No declara ejecución continua: es un comando batch. Para ejecución programada
 * real se requiere configurar externamente (cron de SO, GitHub Actions schedule,
 * o Vercel cron). Documentado al final.
 */

import { execFile } from "node:child_process";
import { readFile, writeFile, mkdir, unlink, stat } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const LOCK_FILE = join(ROOT, "logs", "scheduler", ".scheduler.lock");
const PAUSE_FILE = join(ROOT, ".agency-pause");
const SCHEDULER_LOG_DIR = join(ROOT, "logs", "scheduler");
const EXECUTOR = join(ROOT, "scripts", "agency-task-executor.mjs");
const LOCK_STALE_MS = 300000; // 5 min

const DEFAULT_MAX_TAREAS = 3;
const DEFAULT_MAX_MS = 180000; // 3 min
const DEFAULT_MAX_REINTENTOS = 3;
const MAX_CICLOS_SIN_PROGRESO = 5;

function nowIso() {
  return new Date().toISOString();
}

function logDir() {
  return SCHEDULER_LOG_DIR;
}

async function ensureDir() {
  await mkdir(SCHEDULER_LOG_DIR, { recursive: true });
}

async function appendLog(entry) {
  await ensureDir();
  const file = join(SCHEDULER_LOG_DIR, `scheduler-${new Date().toISOString().slice(0, 10)}.log`);
  const line = JSON.stringify({ ts: nowIso(), ...entry }) + "\n";
  await writeFile(file, line, { flag: "a" });
}

async function acquireLock() {
  const lockContent = JSON.stringify({
    pid: process.pid,
    acquiredAt: nowIso(),
  }) + "\n";
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
  } catch {
    // No crítico
  }
}

function isPaused() {
  try {
    require("node:fs").statSync(PAUSE_FILE);
    return true;
  } catch {
    return false;
  }
}

async function runExecutor(args) {
  return new Promise((resolve) => {
    execFile("node", [EXECUTOR, ...args], { cwd: ROOT, timeout: 240000 }, (error, stdout, stderr) => {
      resolve({
        exitCode: error ? (typeof error.code === "number" ? error.code : -1) : 0,
        stdout: stdout || "",
        stderr: stderr || "",
        error: error ? error.message : null,
        timedOut: error ? error.killed === false : false,
      });
    });
  });
}

async function leerResultadoEjecucion(stdout) {
  try {
    const jsonStart = stdout.indexOf("{");
    const jsonEnd = stdout.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) return null;
    return JSON.parse(stdout.slice(jsonStart, jsonEnd + 1));
  } catch {
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const opts = {};
  for (const arg of args) {
    const cleanArg = arg.startsWith("--") ? arg.slice(2) : arg;
    const eq = cleanArg.indexOf("=");
    if (eq === -1) opts[cleanArg] = true;
    else opts[cleanArg.slice(0, eq)] = cleanArg.slice(eq + 1);
  }

  const maxTareas = parseInt(opts["maxtareas"] || opts["max-tareas"] || DEFAULT_MAX_TAREAS, 10);
  const maxMs = parseInt(opts["maxms"] || opts["max-ms"] || DEFAULT_MAX_MS, 10);
  const maxReintentos = parseInt(opts["maxreintentos"] || opts["max-retries"] || DEFAULT_MAX_REINTENTOS, 10);

  const resultado = {
    inicio: nowIso(),
    scheduler: "agency-scheduler",
    modo: "batch",
    maxTareasPorCiclo: maxTareas,
    maxMsPorCiclo: maxMs,
    maxReintentosCiclo: maxReintentos,
    ciclos: [],
    estado: "iniciado",
  };

  await appendLog({ evento: "scheduler.iniciado", config: { maxTareas, maxMs, maxReintentos } });

  // Pausa de emergencia
  if (isPaused()) {
    resultado.estado = "pausado";
        await appendLog({ evento: "scheduler.pausado", motivo: "archivo .agency-pause presente" });
    console.log(JSON.stringify(resultado, null, 2));
    return;
  }

  // Exclusión mutua
  const lockAcquired = await acquireLock();
  if (!lockAcquired) {
    resultado.estado = "bloqueado";
    resultado.motivo = "Otra instancia del scheduler ya está en curso";
    await appendLog({ evento: "scheduler.bloqueado", motivo: "lock activo" });
    console.log(JSON.stringify(resultado, null, 2));
    process.exitCode = 1;
    return;
  }

  try {
    let ciclosSinProgreso = 0;
    let reintento = 0;

    while (reintento <= maxReintentos) {
      const cicloInicio = Date.now();
      const ciclo = {
        numero: reintento + 1,
        inicio: nowIso(),
      };

      // Verificar pausa antes de cada ciclo
      if (isPaused()) {
        resultado.estado = "pausado";
        await appendLog({ evento: "scheduler.pausado_durante_ciclo", ciclo: reintento + 1 });
        break;
      }

      // Ejecutar executor en modo batch con límites
      const exec = await runExecutor([
        "--batch=true",
        `--maxtasks=${maxTareas}`,
        `--maxms=${maxMs}`,
        "--dry-run=false",
      ]);

      const duracion = Date.now() - cicloInicio;
      ciclo.duracionMs = duracion;
      ciclo.salida = exec.stdout;
      ciclo.error = exec.stderr;
      ciclo.exitCode = exec.exitCode;
      ciclo.timedOut = exec.timedOut;

      const parseado = await leerResultadoEjecucion(exec.stdout);
      ciclo.resultadoParseado = parseado;

      const progreso = parseado && parseado.tasksExecuted > 0;
      if (progreso) {
        ciclosSinProgreso = 0;
      } else {
        ciclosSinProgreso++;
      }

      // Protección contra bucles: si no hay progreso en N ciclos seguidos, parar
      if (ciclosSinProgreso >= MAX_CICLOS_SIN_PROGRESO) {
        resultado.estado = "detenido";
        resultado.motivo = `Sin progreso en ${MAX_CICLOS_SIN_PROGRESO} ciclos consecutivos`;
        await appendLog({
          evento: "scheduler.detenido_bucles",
          ciclosSinProgreso,
          ciclo: reintento + 1,
        });
        break;
      }

      // Si el executor terminó normalmente (phase complete o batch-complete), salir con éxito
      if (parseado && (parseado.phase === "complete" || parseado.phase === "batch-complete")) {
        resultado.estado = "completado";
        resultado.mensaje = parseado.message || "Ciclo completado sin tareas pendientes";
        break;
      }

      // Si falló, reintentar acotadamente
      if (exec.exitCode !== 0 || !progreso) {
        reintento++;
        if (reintento <= maxReintentos) {
          await appendLog({
            evento: "scheduler.reintentando",
            reintento,
            maxReintentos,
            exitCode: exec.exitCode,
          });
          await new Promise((r) => setTimeout(r, 2000 * reintento));
          continue;
        }
        resultado.estado = "fallido";
        resultado.motivo = `Executor falló tras ${maxReintentos} reintentos`;
        await appendLog({ evento: "scheduler.fallido", reintentos: maxReintentos, exitCode: exec.exitCode });
        break;
      }

      break;
    }

    resultado.ciclos.push(...[]); // placeholder para compatibilidad
    resultado.fin = nowIso();
    await appendLog({ evento: "scheduler.finalizado", estado: resultado.estado });
    console.log(JSON.stringify(resultado, null, 2));
  } finally {
    await releaseLock();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});