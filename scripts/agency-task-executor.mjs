import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir, unlink, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const BACKLOG = "docs/nuva-agency/AGENT_BACKLOG.md";
const LOGS_DIR = "logs/cycles";
const EXEC_DIR = "logs/executions";
const INDEX_FILE = join(LOGS_DIR, "index.json");
const SELECTOR = "scripts/agency-select-next-task.mjs";
const LOGGER = "scripts/agency-cycle-logger.mjs";
const SPECIALIST_RUNNER = "scripts/agency-run-specialist.mjs";
const SPECIALIST_IDS = ["finance", "sales", "supply", "people", "growth", "orchestrator", "constructor", "compliance", "security", "qa", "sentinel", "ux", "release"];
const PERSISTED_MISSION_KEY = `agency-batch-${randomUUID()}`;

// Persistencia duradera opcional (Supabase). Se inicializa solo si hay credenciales.
let persistClient = null;
let persistAvailable = false;
try {
  const mod = await import("./agency-persist-supabase.mjs");
  persistClient = mod.client;
  persistAvailable = mod.available;
} catch {
  // Persistencia no disponible: el executor sigue funcionando con logs locales.
}

// Límites de seguridad innegociables (sin producción, sin migraciones remotas, sin secretos)
const FORBIDDEN_PATHS = [
  "supabase/migrations/",
  "vercel.json",
  ".env",
  ".env.local",
  ".env.production",
  "package-lock.json",
  "bun.lock",
  "pnpm-lock.yaml",
];
const FORBIDDEN_PATTERNS = [
  /service_role/i,
  /production\s*mutation/i,
  /deploy\s*production/i,
  /vercel\s*--prod/i,
];

const PRIORITY_ORDER = { P0: 0, P1: 1, P2: 2, P3: 3 };

async function finalizePersistedMission(status, summary) {
  if (!persistAvailable || !persistClient) return;
  try {
    const { finalizeMission } = await import("./agency-persist-supabase.mjs");
    const persisted = await finalizeMission({ missionId: PERSISTED_MISSION_KEY, status, summary });
    if (!persisted.persisted) console.warn(`Agency persistence finalization: ${persisted.reason}`);
  } catch (error) {
    console.warn(`Agency persistence finalization failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// --- T-12: File locking contra ejecuciones concurrentes ---
const LOCK_FILE = join(EXEC_DIR, ".executor.lock");
const LOCK_STALE_MS = 300000; // 5 min: un lock más antiguo se considera stale

async function acquireLock(execIdValue) {
  const lockContent = JSON.stringify({
    lockId: execIdValue,
    pid: process.pid,
    acquiredAt: nowIso(),
  }) + "\n";
  try {
    // Intentar crear el lock de forma atómica (wx = fallar si existe)
    await writeFile(LOCK_FILE, lockContent, { flag: "wx" });
    return true;
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    // Ya existe un lock: comprobar si es stale
    try {
      const raw = await readFile(LOCK_FILE, "utf8");
      const existing = JSON.parse(raw);
      const age = Date.now() - new Date(existing.acquiredAt).getTime();
      if (age > LOCK_STALE_MS) {
        // Lock stale: forzar sobrescritura (w permite reemplazar archivo existente)
        await writeFile(LOCK_FILE, lockContent, { flag: "w" });
        return true;
      }
    } catch {
      // Si no se puede leer el lock, forzar sobrescritura
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
    // No crítico si no se puede borrar
  }
}

function isLockHeld() {
  return existsSync(LOCK_FILE);
}

function nowIso() {
  return new Date().toISOString();
}

function execId() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `exec-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${ms}`;
}

async function readJson(path) {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseBlocks(markdown) {
  const blocks = [];
  let current = null;
  for (const line of markdown.split(/\r?\n/)) {
  const m = line.match(/^## (T-\d+)\s+—\s+(.+)$/);
  if (m) {
    if (current) blocks.push(current);
    current = { id: m[1], title: m[2], fields: {} };
    continue;
  }
  if (current) {
    const fm = line.match(/^\s*-\s*([^:]+):\s*(.*)$/);
    if (fm) current.fields[fm[1].trim()] = fm[2].trim();
  }
  }
  if (current) blocks.push(current);
  return blocks;
  }

function depsResolved(block, byId) {
  const deps = (block.fields.dependencias || "ninguna")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (deps.length === 1 && deps[0] === "ninguna") return true;
  return deps.every((d) => byId[d] && byId[d].fields.estado === "COMPLETADO");
}

function selectNextTask(blocks) {
  const byId = {};
  for (const b of blocks) byId[b.id] = b;

  const candidates = blocks.filter(
    (b) => b.fields.estado === "PENDIENTE" && depsResolved(b, byId)
  );

  candidates.sort(
    (a, b) =>
      (PRIORITY_ORDER[a.fields.prioridad] ?? 99) -
      (PRIORITY_ORDER[b.fields.prioridad] ?? 99)
  );

  return candidates[0] ? { id: candidates[0].id, title: candidates[0].title, block: candidates[0] } : null;
}

function checkSecurityLimits(taskBlock) {
  const violations = [];
  const evidence = (taskBlock.fields.evidencia || "").toLowerCase();
  const filesAffected = (taskBlock.fields.filesAffected || "").toLowerCase();
  const combined = evidence + " " + filesAffected;

  for (const p of FORBIDDEN_PATHS) {
    if (combined.includes(p.toLowerCase())) {
      violations.push(`ruta prohibida: ${p}`);
    }
  }
  for (const re of FORBIDDEN_PATTERNS) {
    if (re.test(combined)) {
      violations.push(`patrón prohibido: ${re}`);
    }
  }

  return {
    allowed: violations.length === 0,
    violations,
  };
}

function resolveCommand(taskBlock) {
  const title = taskBlock.title.toLowerCase();
  const criteria = (taskBlock.fields.criterios_de_aceptacion || "").toLowerCase();
  const tests = (taskBlock.fields.pruebas_requeridas || "").toLowerCase();
  const combined = criteria + " " + tests;

  // Detectar tipo de tarea por título/criterios/pruebas
  if (/\bnpm test\b/.test(combined)) {
    const m = combined.match(/npm test -- (`?)([^\s`]+)\1?/);
    return { type: "npm_test", command: ["npm", "test", "--", m ? m[2] : "."] };
  }
  if (/\bnpm run lint\b/.test(criteria) || /\blint\b/.test(title)) {
    return { type: "npm_run", command: ["npm", "run", "lint"] };
  }
  if (/\bnpm run typecheck\b/.test(criteria) || /\btypecheck\b/.test(title)) {
    return { type: "npm_run", command: ["npm", "run", "typecheck"] };
  }
  if (/\bnpm run build\b/.test(criteria) || /\bbuild\b/.test(title)) {
    return { type: "npm_run", command: ["npm", "run", "build"] };
  }

  return { type: "unknown", command: null };
}

/**
 * Detecta si la tarea debe ser ejecutada por uno de los especialistas de Agency.
 * Devuelve un plan de tipo "specialist" sin comando de shell.
 */
function resolveSpecialist(taskBlock) {
  const specialist = (taskBlock.fields.especialista || "").toLowerCase().trim();
  if (SPECIALIST_IDS.includes(specialist)) {
    return { type: "specialist", specialistId: specialist };
  }
  return null;
}

async function runCommand(command, cwd, timeoutMs = 120000) {
  const start = Date.now();
  const isWindows = process.platform === "win32";
  // En Windows, .cmd/.bat no se spawnean directamente; envolver en cmd /c
  const shellCmd = isWindows ? ["cmd", "/c", ...command] : command;

  return new Promise((resolve) => {
    const tryRun = (cmd) => {
      const child = execFile(cmd[0], cmd.slice(1), { cwd, timeout: timeoutMs }, (error, stdout, stderr) => {
        const duration = Date.now() - start;
        const exitCode = error
          ? (typeof error.code === "number" ? error.code : -1)
          : 0;
        resolve({
          exitCode,
          signal: error ? error.signal : null,
          stdout: stdout || "",
          stderr: stderr || "",
          durationMs: duration,
          timedOut: error ? error.killed === false : false,
          commandUsed: cmd.slice(0, 3).join(" "),
        });
      });
      child.on("timeout", () => {
        child.kill();
        resolve({
          exitCode: -1,
          signal: "SIGTERM",
          stdout: "",
          stderr: "Command timed out",
          durationMs: Date.now() - start,
          timedOut: true,
          commandUsed: cmd.slice(0, 3).join(" "),
        });
      });
      child.on("error", (err) => {
        if (err.code === "ENOENT" && !cmd[0].endsWith(".cmd") && !isWindows) {
          tryRun([cmd[0] + ".cmd", ...cmd.slice(1)]);
        } else {
          const duration = Date.now() - start;
          resolve({
            exitCode: -1,
            signal: null,
            stdout: "",
            stderr: err.message || String(err),
            durationMs: duration,
            timedOut: false,
            commandUsed: cmd.slice(0, 3).join(" "),
          });
        }
      });
    };
    tryRun(shellCmd);
  });
}

async function readIndex() {
  const data = await readJson(INDEX_FILE);
  if (data && Array.isArray(data.cycles) && Array.isArray(data.executions)) {
    return data;
  }
  // Índice ausente o corrupto: reconstruir desde archivos individuales
  const cycles = await scanCycleFiles();
  const executions = await scanExecutionFiles();
  return { cycles, executions, reconstructed: !!data === false };
}

async function writeIndex(index) {
  await mkdir(LOGS_DIR, { recursive: true });
  await writeFile(INDEX_FILE, JSON.stringify(index, null, 2) + "\n");
}

// --- T-12: Escaneo de archivos individuales para reconstrucción de índice ---
async function scanExecutionFiles() {
  const executions = [];
  try {
    const entries = await readdir(EXEC_DIR);
    for (const entry of entries) {
      if (!entry.endsWith(".json") || entry.startsWith(".")) continue;
      const data = await readJson(join(EXEC_DIR, entry));
      if (data && data.id) {
        executions.push({
          id: data.id,
          timestamp: data.timestamp,
          taskId: data.taskId,
          agent: data.agent,
          result: data.result,
          qaVerdict: data.qaVerdict,
          securityVerdict: data.securityVerdict,
          orchestratorDecision: data.orchestratorDecision,
          file: entry,
        });
      }
    }
  } catch {
    // Directorio no existe todavía
  }
  executions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return executions;
}

async function scanCycleFiles() {
  const cycles = [];
  try {
    const entries = await readdir(LOGS_DIR);
    for (const entry of entries) {
      if (!entry.startsWith("cycle-") || !entry.endsWith(".json")) continue;
      const data = await readJson(join(LOGS_DIR, entry));
      if (data && data.id) {
        cycles.push({
          id: data.id,
          timestamp: data.timestamp,
          taskId: data.taskId,
          taskTitle: data.taskTitle,
          agent: data.agent,
          result: data.result,
          qaVerdict: data.qaVerdict,
          securityVerdict: data.securityVerdict,
          orchestratorDecision: data.orchestratorDecision,
          file: entry,
        });
      }
    }
  } catch {
    // Directorio no existe todavía
  }
  cycles.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return cycles;
}

async function logExecution(index, record) {
  await mkdir(EXEC_DIR, { recursive: true });
  const fileName = `${record.id}.json`;
  const filePath = join(EXEC_DIR, fileName);
  await writeFile(filePath, JSON.stringify(record, null, 2) + "\n");

  index.executions.push({
    id: record.id,
    timestamp: record.timestamp,
    taskId: record.taskId,
    agent: record.agent,
    result: record.result,
    qaVerdict: record.qaVerdict,
    securityVerdict: record.securityVerdict,
    orchestratorDecision: record.orchestratorDecision,
    file: fileName,
  });
  index.executions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  await writeIndex(index);
}

async function main() {
  // --- T-12: Adquirir lock contra ejecuciones concurrentes ---
  const execIdValue = execId();
  const lockAcquired = await acquireLock(execIdValue);
  if (!lockAcquired) {
    console.error("Otra instancia del ejecutor ya está en curso (lock activo). Abortando.");
    process.exitCode = 1;
    return;
  }
  try {
    await runMainWithLock(execIdValue);
  } finally {
    await releaseLock();
  }
}

async function runMainWithLock(execIdValue) {
  const args = process.argv.slice(2);
  const opts = {};
  for (const arg of args) {
    // Quitar prefijo "--" si existe
    const cleanArg = arg.startsWith("--") ? arg.slice(2) : arg;
    const eq = cleanArg.indexOf("=");
    if (eq === -1) {
      opts[cleanArg] = true;
    } else {
      opts[cleanArg.slice(0, eq)] = cleanArg.slice(eq + 1);
    }
  }

  const dryRun = opts["dry-run"] === "true" || opts["dryrun"] === "true";
  const resume = opts["resume"] === "true";
  const specifiedTask = opts["task"];
  const specifiedSpecialist = opts["specialist"];
  const batchMode = opts["batch"] === "true";
  const maxTasks = opts["maxtasks"] ? parseInt(opts["maxtasks"], 10) : 1;
  const maxMs = opts["maxms"] ? parseInt(opts["maxms"], 10) : 300000;
  const maxRetries = opts["maxretries"] ? parseInt(opts["maxretries"], 10) : 0;

  const result = {
    generatedAt: nowIso(),
    dryRun,
    resume,
    batch: batchMode,
    phase: "selection",
  };

  // 1. Leer backlog persistente
  const md = await readFile(BACKLOG, "utf8");
  const blocks = parseBlocks(md);
  const byId = {};
  for (const b of blocks) byId[b.id] = b;

  result.totalTasks = blocks.length;
  result.pendingTasks = blocks.filter((b) => b.fields.estado === "PENDIENTE").length;

  // Modo batch: bucle de selección→ejecución hasta límite o sin tareas
  const batchResults = [];
  let tasksExecuted = 0;
  const batchStart = Date.now();

  while (true) {
    // Verificar límites de batch
    if (tasksExecuted >= maxTasks) {
      result.phase = "batch-limit-reached";
      result.message = `Límite de tareas alcanzado: ${maxTasks}`;
      break;
    }
    if (Date.now() - batchStart > maxMs) {
      result.phase = "batch-timeout";
      result.message = `Tiempo máximo de lote alcanzado: ${maxMs} ms`;
      break;
    }

    // Volver a leer el backlog en cada iteración (estado puede haber cambiado)
    const currentMd = await readFile(BACKLOG, "utf8");
    const currentBlocks = parseBlocks(currentMd);
    const currentById = {};
    for (const b of currentBlocks) currentById[b.id] = b;

    // 2. Seleccionar siguiente tarea (via selector existente o task especificada)
    let taskBlock = null;
    let selectionMethod = "selector";
    if (specifiedTask && tasksExecuted === 0) {
      taskBlock = currentById[specifiedTask];
      if (!taskBlock) {
        result.error = `Tarea no encontrada en backlog: ${specifiedTask}`;
        result.phase = "error";
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      selectionMethod = "specified";
    } else {
      const { execFileSync } = await import("node:child_process");
      let selectorOutput;
      try {
        selectorOutput = execFileSync("node", [SELECTOR], { encoding: "utf8" });
      } catch (syncError) {
        // El selector puede devuir código != 0 sin nextTask; su stdout aún trae el JSON
        selectorOutput = syncError.stdout || syncError.stderr || "{}";
      }
      const selectorResult = JSON.parse(selectorOutput);
      if (!selectorResult.nextTask) {
        if (tasksExecuted === 0) {
          result.phase = "complete";
          result.message = "No hay tareas PENDIENTE con dependencias resueltas";
        } else {
          result.phase = "batch-complete";
          result.message = `No más tareas elegibles tras ${tasksExecuted} ejecutadas`;
        }
        break;
      }
      taskBlock = currentById[selectorResult.nextTask.id];
    }

    // Soporte de reanudación: si la tarea ya está COMPLETADA, saltar
    if (resume && taskBlock.fields.estado === "COMPLETADO") {
      if (specifiedTask) {
        result.phase = "skipped";
        result.message = `Tarea ${taskBlock.id} ya está COMPLETADO. No se duplica.`;
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      // En batch, simplemente continuar con la siguiente
      continue;
    }

    // 3. Verificar dependencias, estado, permisos y límites de seguridad
    const depsOk = depsResolved(taskBlock, currentById);
    const security = checkSecurityLimits(taskBlock);

    result.phase = "checks";
    const selectedTaskInfo = {
      id: taskBlock.id,
      title: taskBlock.title,
      departamento: taskBlock.fields.departamento,
      especialista: specifiedSpecialist || taskBlock.fields.especialista,
      prioridad: taskBlock.fields.prioridad,
      dependencias: taskBlock.fields.dependencias,
      estado: taskBlock.fields.estado,
      depsResolved: depsOk,
      securityAllowed: security.allowed,
      securityViolations: security.violations,
      selectionMethod,
    };

    if (!depsOk && !specifiedTask) {
      result.error = "Dependencias no resueltas";
      result.phase = "blocked";
      batchResults.push({ taskId: taskBlock.id, phase: "blocked", reason: "dependencias" });
      break;
    }

    if (!security.allowed) {
      result.error = "Límites de seguridad violados";
      result.securityViolations = security.violations;
      result.phase = "blocked";
      batchResults.push({ taskId: taskBlock.id, phase: "blocked", reason: "security" });
      break;
    }

    // 4. Asignar especialista
    const specialist = specifiedSpecialist || taskBlock.fields.especialista || "Constructor";
    selectedTaskInfo.assignedSpecialist = specialist;

    // 5. Preparar ejecución (comando real)
    const execPlan = resolveCommand(taskBlock);

    // Si no hay comando de shell, probar si es un especialista de Agency
    if (execPlan.type === "unknown") {
      const specialistPlan = resolveSpecialist(taskBlock);
      if (specialistPlan) {
        execPlan.type = "specialist";
        execPlan.specialistId = specialistPlan.specialistId;
        execPlan.command = ["node", SPECIALIST_RUNNER, specialistPlan.specialistId, taskBlock.id];
      }
    }

    if (dryRun) {
      result.phase = "dry-run-complete";
      result.message = "Modo dry-run: no se realizaron mutaciones";
      result.selectedTask = selectedTaskInfo;
      result.executionPlan = execPlan;
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    // 6. Ejecutar tarea mediante herramienta real (con reintentos)
    let lastRun = null;
    let attempt = 0;
    let executionOk = false;
    const previousState = taskBlock.fields.estado;

    while (attempt <= maxRetries && !executionOk) {
      attempt++;
      const exec = {
        id: execId(),
        timestamp: nowIso(),
        taskId: taskBlock.id,
        taskTitle: taskBlock.title,
        agent: specialist,
        delegationMethod: "direct",
        phase: "execution",
        previousState,
        retryCount: attempt - 1,
        executionPlan: execPlan,
      };

      if (execPlan.type === "unknown" || !execPlan.command) {
        exec.result = "BLOCKED";
        exec.qaVerdict = "UNKNOWN";
        exec.securityVerdict = "UNKNOWN";
        exec.orchestratorDecision = "rejected";
        exec.error = "No se detectó un comando ejecutable para esta tarea";
        exec.evidence = [];
        exec.durationMs = 0;

        const index = await readIndex();
        await logExecution(index, exec);

        batchResults.push({ taskId: taskBlock.id, phase: "execution-complete", reason: "no-comando", execution: exec });
        lastRun = exec;
        executionOk = exec.result === "PASS" || exec.result === "WARN";
        break;
      }

      const start = Date.now();
      const run = await runCommand(execPlan.command, process.cwd(), 180000);
      const duration = Date.now() - start;

      exec.exitCode = run.exitCode;
      exec.stdout = run.stdout;
      exec.stderr = run.stderr;
      exec.durationMs = duration;
      exec.timedOut = run.timedOut;

      // Si es especialista, parsear el resultado estructurado del stdout JSON
      if (execPlan.type === "specialist") {
        let specialistResult = null;
        try {
          const jsonStart = run.stdout.indexOf("{");
          const jsonEnd = run.stdout.lastIndexOf("}");
          if (jsonStart !== -1 && jsonEnd !== -1) {
            specialistResult = JSON.parse(run.stdout.slice(jsonStart, jsonEnd + 1));
          }
        } catch {
          specialistResult = null;
        }
        if (specialistResult) {
          exec.result = specialistResult.result;
          exec.evidence = specialistResult.evidence;
          exec.errors = specialistResult.errors;
          exec.specialistResult = specialistResult;
          exec.qaVerdict = specialistResult.result;
          exec.securityVerdict = specialistResult.result;
          exec.orchestratorDecision =
            specialistResult.result === "PASS" || specialistResult.result === "WARN"
              ? "accepted"
              : "rejected";
        } else {
          exec.result = run.exitCode === 0 ? "PASS" : "FAIL";
          exec.evidence = [
            `Comando: ${execPlan.command.join(" ")}`,
            `Código de salida: ${run.exitCode}`,
            `Duración: ${duration} ms`,
            `Intento: ${attempt}`,
          ];
        }
      } else {
        exec.result = run.exitCode === 0 ? "PASS" : "FAIL";
        exec.evidence = [
          `Comando: ${execPlan.command.join(" ")}`,
          `Código de salida: ${run.exitCode}`,
          `Duración: ${duration} ms`,
          `Archivos ejecutados: scripts/agency-task-executor.mjs`,
          `Intento: ${attempt}`,
        ];
      }

      lastRun = exec;

      // Persistencia durable: no escribir dry-runs y conservar IDs lógicos como metadata.
      if (!dryRun && persistAvailable && persistClient) {
        try {
          const { persistExecution } = await import("./agency-persist-supabase.mjs");
          const persisted = await persistExecution({
            missionId: PERSISTED_MISSION_KEY,
            taskId: taskBlock.id,
            title: taskBlock.title,
            objective: taskBlock.fields.criterios_de_aceptacion || "",
            agentId: specialist,
            status: exec.result === "PASS" || exec.result === "WARN" ? "completed" : "failed",
            result: exec.result,
            summary: exec.evidence?.join(" | ") || "",
            output: { specialist: execPlan.specialistId, exitCode: run.exitCode, durationMs: duration },
            attemptCount: attempt,
            maxAttempts: maxRetries + 1,
            inputContext: { source: "agency-task-executor", backlogTaskId: taskBlock.id },
          });
          exec.evidence.push(persisted.persisted
            ? `Supabase durable: PASS (task ${persisted.taskId})`
            : `Supabase durable: BLOCKED (${persisted.reason})`);
        } catch (error) {
          exec.evidence.push(`Supabase durable: ERROR (${error instanceof Error ? error.message : String(error)})`);
        }
      }

      const index = await readIndex();
      await logExecution(index, exec);

      if (exec.result === "PASS" || exec.result === "WARN") {
        executionOk = true;
      } else if (attempt <= maxRetries) {
        // Reintento tras fallo
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }

    const exec = lastRun;
    tasksExecuted++;

    batchResults.push({
      taskId: taskBlock.id,
      phase: "execution-complete",
      result: exec ? exec.result : "UNKNOWN",
      executionId: exec ? exec.id : null,
    });

    result.selectedTask = selectedTaskInfo;
    result.executionPlan = execPlan;
    result.execution = exec;
    result.batchResults = batchResults;
    result.tasksExecuted = tasksExecuted;

    if (exec.result !== "PASS" && exec.result !== "WARN" && exec.result !== "BLOCKED") {
      result.phase = "execution-failed";
      if (!dryRun) await finalizePersistedMission("failed", result.message || `Tarea ${taskBlock.id} falló`);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    // 7. Actualizar backlog: marcar tarea según resultado real
    let estadoFinal = "COMPLETADO";
    if (exec.result === "BLOCKED") estadoFinal = "BLOQUEADO";
    if (exec.result === "FAIL") estadoFinal = "BLOQUEADO";

    for (const b of currentBlocks) {
      if (b.id === taskBlock.id) {
        b.fields.estado = estadoFinal;
        break;
      }
    }

    // Reconstruir markdown del backlog con estados actualizados
    let updatedMd = "# AGENT_BACKLOG — Nüva Agency\n|\nBacklog único de tareas operativas del equipo de agentes especializados.\nFuente de verdad para el orquestador: selecciona la primera tarea segura y sin bloqueos,\nla asigna al especialista adecuado, y registra el resultado al cerrar el ciclo.\n|\nFormato de cada entrada:\n- `T-XX` — identificador único\n- `titulo` — nombre corto\n- `departamento` — Finanzas / Ventas / Abastecimiento / Personas / Cumplimiento / Crecimiento / Operaciones\n- `especialista` — rol del agente que ejecuta\n- `prioridad` — P0 (bloquea lanzamiento) / P1 (alta) / P2 (media) / P3 (defense-in-depth)\n- `estado` — PENDIENTE / EN_CURSO / BLOQUEADO / COMPLETADO / RECHAZADO\n- `dependencias` — entradas T-XX previas o \"ninguna\"\n- `criterios_de_aceptacion` — qué debe demostrarse para dar por completada\n- `pruebas_requeridas` — typecheck / lint / tests / build / mutación / revisión independiente\n- `evidencia` — archivos, commits, salidas de comando (rellenar al completar)\n- `seguridad` — sin producción / sin migración remota / sin RLS / sin secretos\n|\n---\n";

    for (const b of currentBlocks) {
      updatedMd += `## ${b.id} — ${b.title}\n`;
      updatedMd += `- departamento: ${b.fields.departamento || ""}\n`;
      updatedMd += `- especialista: ${b.fields.especialista || ""}\n`;
      updatedMd += `- prioridad: ${b.fields.prioridad || ""}\n`;
      updatedMd += `- estado: ${b.fields.estado || ""}\n`;
      updatedMd += `- dependencias: ${b.fields.dependencias || "ninguna"}\n`;
      updatedMd += `- criterios_de_aceptacion: ${b.fields.criterios_de_aceptacion || ""}\n`;
      updatedMd += `- pruebas_requeridas: ${b.fields.pruebas_requeridas || ""}\n`;
      updatedMd += `- evidencia: ${b.fields.evidencia || ""}\n`;
      updatedMd += `- seguridad: ${b.fields.seguridad || ""}\n`;
      updatedMd += "\n";
    }

    await writeFile(BACKLOG, updatedMd);

    if (!batchMode) {
      result.phase = "complete";
      result.message = `Tarea ${taskBlock.id} ejecutada y marcada como COMPLETADO`;
      result.backlogUpdated = true;
      if (!dryRun) {
        const finalStatus = exec.result === "BLOCKED" ? "paused" : exec.result === "FAIL" ? "failed" : "completed";
        await finalizePersistedMission(finalStatus, result.message);
      }
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    // En batch, continuar con la siguiente tarea
  }

  result.phase = result.phase || "batch-complete";
  result.message = `Lote finalizado: ${tasksExecuted} tarea(s) ejecutada(s)`;
  result.backlogUpdated = true;
  if (!dryRun && tasksExecuted > 0) {
    const finalStatus = batchResults.some((item) => item.result === "FAIL")
      ? "failed"
      : batchResults.some((item) => item.result === "BLOCKED")
        ? "paused"
        : result.phase === "batch-complete"
          ? "completed"
          : "queued";
    await finalizePersistedMission(finalStatus, result.message);
  }
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
