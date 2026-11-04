// scripts/agency-generate-tasks.mjs
// Generación continua de tareas para Nüva Agency.
// Cuando el backlog se queda sin tareas elegibles (batch-complete),
// este script inspecciona el estado real de Nüva One, consulta el roadmap
// de lanzamiento y genera tareas concretas que contribuyan al producto.

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const BACKLOG = "docs/nuva-agency/AGENT_BACKLOG.md";
const EVIDENCE_LOG = "docs/launch/AGENCY_EVIDENCE_LOG.md";
const GENERATED_DIR = "logs/task-generation";
const LAST_GEN_FILE = join(GENERATED_DIR, "last-generation.json");

const SPECIALIST_IDS = [
  "finance", "sales", "supply", "people", "growth", "orchestrator",
  "constructor", "compliance", "security", "qa", "sentinel", "ux", "release",
];

const DEPARTMENTS = {
  finance: "Gastos y finanzas",
  sales: "Ventas",
  supply: "Abastecimiento",
  people: "Personas",
  growth: "Crecimiento",
  orchestrator: "Operaciones",
  constructor: "Construcción",
  compliance: "Cumplimiento",
  security: "Seguridad y privacidad",
  qa: "QA",
  sentinel: "Sentinel",
  ux: "UX",
  release: "Release",
};

function nowIso() {
  return new Date().toISOString();
}

function nextTaskId(blocks) {
  const max = blocks.reduce((m, b) => {
    const n = parseInt(b.id.replace("T-", ""), 10);
    return n > m ? n : m;
  }, 0);
  return `T-${String(max + 1).padStart(3, "0")}`;
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

function backlogToMarkdown(blocks) {
  let md =
    "# AGENT_BACKLOG — Nüva Agency\n|\nBacklog único de tareas operativas del equipo de agentes especializados.\nFuente de verdad para el orquestador: selecciona la primera tarea segura y sin bloqueos,\nla asigna al especialista adecuado, y registra el resultado al cerrar el ciclo.\n|\nFormato de cada entrada:\n- `T-XX` — identificador único\n- `titulo` — nombre corto\n- `departamento` — Finanzas / Ventas / Abastecimiento / Personas / Cumplimiento / Crecimiento / Operaciones\n- `especialista` — rol del agente que ejecuta\n- `prioridad` — P0 (bloquea lanzamiento) / P1 (alta) / P2 (media) / P3 (defense-in-depth)\n- `estado` — PENDIENTE / EN_CURSO / BLOQUEADO / COMPLETADO / RECHAZADO\n- `dependencias` — entradas T-XX previas o `ninguna`\n- `criterios_de_aceptacion` — qué debe demostrarse para dar por completada\n- `pruebas_requeridas` — typecheck / lint / tests / build / mutación / revisión independiente\n- `evidencia` — archivos, commits, salidas de comando (rellenar al completar)\n- `seguridad` — sin producción / sin migración remota / sin RLS / sin secretos\n|\n---\n";
  for (const b of blocks) {
    md += `## ${b.id} — ${b.title}\n`;
    md += `- departamento: ${b.fields.departamento || ""}\n`;
    md += `- especialista: ${b.fields.especialista || ""}\n`;
    md += `- prioridad: ${b.fields.prioridad || ""}\n`;
    md += `- estado: ${b.fields.estado || ""}\n`;
    md += `- dependencias: ${b.fields.dependencias || "ninguna"}\n`;
    md += `- criterios_de_aceptacion: ${b.fields.criterios_de_aceptacion || ""}\n`;
    md += `- pruebas_requeridas: ${b.fields.pruebas_requeridas || ""}\n`;
    md += `- evidencia: ${b.fields.evidencia || ""}\n`;
    md += `- seguridad: ${b.fields.seguridad || ""}\n`;
    md += "\n";
  }
  return md;
}

async function readJson(path) {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeJson(path, data) {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2) + "\n");
}

// --- Inspección del estado del producto ---

async function scanSourceForTodos() {
  // Busca TODO/FIXME/HACK en archivos fuente (excluye node_modules, .git, dist, logs)
  const todos = [];
  const exts = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".svelte", ".vue", ".py"];
  const skipDirs = ["node_modules", ".git", "dist", "build", "logs", ".vercel", "supabase"];

  async function walk(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (skipDirs.includes(entry.name)) continue;
        await walk(full);
      } else if (exts.includes(extname(entry.name))) {
        try {
          const content = await readFile(full, "utf8");
          const lines = content.split(/\r?\n/);
          for (let i = 0; i < lines.length; i++) {
            if (/\b(TODO|FIXME|HACK|XXX|BUG)\b/i.test(lines[i])) {
              todos.push({
                file: full,
                line: i + 1,
                text: lines[i].trim().slice(0, 120),
              });
            }
          }
        } catch {
          // ignore unreadable
        }
      }
    }
  }

  await walk(join(ROOT, "src"));
  await walk(join(ROOT, "scripts"));
  return todos;
}

async function checkBuildAndTests() {
  const results = { build: null, tests: null, typecheck: null, lint: null };
  const isWindows = process.platform === "win32";
  const npmBase = isWindows ? ["cmd", "/c", "npm"] : ["npm"];
  const npxBase = isWindows ? ["cmd", "/c", "npx"] : ["npx"];

  try {
    const out = execFileSync(npmBase[0], [...npmBase.slice(1), "run", "build"], {
      cwd: ROOT, encoding: "utf8", timeout: 120000,
    });
    results.build = { ok: true, output: out.slice(-500) };
  } catch (e) {
    results.build = { ok: false, error: (e.stderr || e.message || String(e)).slice(-300) };
  }

  try {
    const out = execFileSync(npmBase[0], [...npmBase.slice(1), "test", "--", "--run"], {
      cwd: ROOT, encoding: "utf8", timeout: 120000,
    });
    results.tests = { ok: true, output: out.slice(-500) };
  } catch (e) {
    results.tests = { ok: false, error: (e.stderr || e.message || String(e)).slice(-300) };
  }

  try {
    const out = execFileSync(npxBase[0], [...npxBase.slice(1), "tsc", "--noEmit"], {
      cwd: ROOT, encoding: "utf8", timeout: 120000,
    });
    results.typecheck = { ok: true, output: out.slice(-500) };
  } catch (e) {
    results.typecheck = { ok: false, error: (e.stderr || e.message || String(e)).slice(-300) };
  }

  try {
    const out = execFileSync(npmBase[0], [...npmBase.slice(1), "run", "lint"], {
      cwd: ROOT, encoding: "utf8", timeout: 120000,
    });
    results.lint = { ok: true, output: out.slice(-500) };
  } catch (e) {
    results.lint = { ok: false, error: (e.stderr || e.message || String(e)).slice(-300) };
  }

  return results;
}

async function readRoadmap() {
  const candidates = [
    "docs/roadmap.md",
    "docs/lanzamiento.md",
    "docs/launch/ROADMAP.md",
    "docs/nuva-agency/ROADMAP.md",
  ];
  for (const c of candidates) {
    if (existsSync(join(ROOT, c))) {
      try {
        return { source: c, content: await readFile(join(ROOT, c), "utf8") };
      } catch { /* ignore */ }
    }
  }
  return null;
}

// --- Generación de tareas ---

function buildGeneratedTask(id, title, dept, specialist, priority, deps, criteria, tests, evidence, security) {
  return {
    id,
    title,
    fields: {
      departamento: dept,
      especialista: specialist,
      prioridad: priority,
      estado: "PENDIENTE",
      dependencias: deps || "ninguna",
      criterios_de_aceptacion: criteria,
      pruebas_requeridas: tests,
      evidencia: evidence,
      seguridad: security,
      generado: nowIso(),
      origen: "agency-generate-tasks",
    },
  };
}

function taskToMarkdown(t) {
  return `## ${t.id} — ${t.title}\n` +
    `- departamento: ${t.fields.departamento}\n` +
    `- especialista: ${t.fields.especialista}\n` +
    `- prioridad: ${t.fields.prioridad}\n` +
    `- estado: ${t.fields.estado}\n` +
    `- dependencias: ${t.fields.dependencias}\n` +
    `- criterios_de_aceptacion: ${t.fields.criterios_de_aceptacion}\n` +
    `- pruebas_requeridas: ${t.fields.pruebas_requeridas}\n` +
    `- evidencia: ${t.fields.evidencia}\n` +
    `- seguridad: ${t.fields.seguridad}\n` +
    "\n";
}

async function generateTasks() {
  const md = await readFile(BACKLOG, "utf8");
  const blocks = parseBlocks(md);
  const byId = {};
  for (const b of blocks) byId[b.id] = b;
  const existingTitles = new Set(blocks.map((b) => b.title));

  const pending = blocks.filter((b) => b.fields.estado === "PENDIENTE");
  const completed = blocks.filter((b) => b.fields.estado === "COMPLETADO");
  const blocked = blocks.filter((b) => b.fields.estado === "BLOQUEADO");
  const newTasks = [];

  // Inspección del producto
  const todos = await scanSourceForTodos();
  const quality = await checkBuildAndTests();
  const roadmap = await readRoadmap();

  // 1. Si hay TODOs en el código fuente, generar tarea de corrección (constructor/qa)
  const codeTodos = todos.filter((t) => t.file.includes("/src/"));
  if (codeTodos.length > 0) {
    const sample = codeTodos.slice(0, 3);
    const id = nextTaskId([...blocks, ...newTasks]);
    newTasks.push(buildGeneratedTask(
      id,
      `Corregir pendientes de código fuente (${sample.length} detectados)`,
      "Construcción", "constructor", "P1", "ninguna",
      `Revisar y resolver los marcadores TODO/FIXME/HACK detectados en el código fuente: ${sample.map((t) => `${t.file}:${t.line}`).join(", ")}. Cada uno debe estar resuelto o documentado como intencional.`,
      "revisión de código fuente afectado; sin pruebas de producción",
      "archivos revisados + notas de resolución",
      "solo código fuente, sin producción",
    ));
  }

  // 2. Si build falla, generar tarea de release
  if (quality.build && !quality.build.ok) {
    const id = nextTaskId([...blocks, ...newTasks]);
    newTasks.push(buildGeneratedTask(
      id,
      `Corregir fallo de build de producción`,
      "Release", "release", "P0", "ninguna",
      `El comando \`npm run build\` falla con: ${quality.build.error}. Corregir para que el build pase con exit 0 sin alterar comportamiento del producto.`,
      "npm run build exit 0; artefactos en dist/",
      "salida del build corregido",
      "solo build local, sin despliegue",
    ));
  }

  // 3. Si tests fallan, generar tarea de QA
  if (quality.tests && !quality.tests.ok) {
    const id = nextTaskId([...blocks, ...newTasks]);
    newTasks.push(buildGeneratedTask(
      id,
      `Corregir pruebas que fallan`,
      "QA", "qa", "P0", "ninguna",
      `El comando \`npm test -- --run\` falla con: ${quality.tests.error}. Corregir pruebas rotas o actualizar expectativas si el comportamiento cambió intencionalmente.`,
      "npm test -- --run exit 0; 100% de pruebas pasando",
      "salida de pruebas corregidas",
      "solo pruebas locales, sin producción",
    ));
  }

  // 4. Si typecheck falla, generar tarea de constructor
  if (quality.typecheck && !quality.typecheck.ok) {
    const id = nextTaskId([...blocks, ...newTasks]);
    newTasks.push(buildGeneratedTask(
      id,
      `Corregir errores de typecheck TypeScript`,
      "Construcción", "constructor", "P1", "ninguna",
      `El comando \`npx tsc --noEmit\` falla con: ${quality.typecheck.error}. Corregir tipos sin usar \`any\` ni \`@ts-ignore\` como solución general.`,
      "npx tsc --noEmit exit 0",
      "salida del typecheck corregido",
      "solo typecheck local",
    ));
  }

  // 5. Si hay tareas bloqueadas (T-40, T-49, T-50), generar tarea de investigación de desbloqueo
  const blockedIds = blocked.map((b) => b.id);
  if (blockedIds.length > 0) {
    const id = nextTaskId([...blocks, ...newTasks]);
    newTasks.push(buildGeneratedTask(
      id,
      `Investigar desbloqueo de tareas: ${blockedIds.join(", ")}`,
      "Operaciones", "orchestrator", "P1", blockedIds.join(","),
      `Investigar cada tarea bloqueada (${blockedIds.join(", ")}), documentar qué permiso o recurso falta, preparar alternativas que no requieran autorización de deploy ni cambios en producción, y proponer camino para desbloquearlas.`,
      "documento de bloqueos con alternativas viables; sin cambios en producción",
      "registro de bloqueos + alternativas preparadas",
      "solo investigación y documentación",
    ));
  }

  // 6. Si no hay tareas pendientes elegibles, generar tareas de lanzamiento basadas en el roadmap
  const eligiblePending = pending.filter((b) => {
    const deps = (b.fields.dependencias || "ninguna").split(/[,;]/).map(s => s.trim()).filter(Boolean);
    if (deps.length === 1 && deps[0] === "ninguna") return true;
    return deps.every((d) => byId[d] && byId[d].fields.estado === "COMPLETADO");
  });

  if (eligiblePending.length === 0 && pending.length > 0) {
    // Todas las pendientes están bloqueadas por dependencias no resueltas
    const yaExisteResolver = blocks.some((b) => b.title.startsWith("Resolver dependencias pendientes para desbloquear tareas:"));
    if (yaExisteResolver) {
      // Ya existe una tarea de resolución de dependencias; no crear duplicados encadenados
    } else {
      const id = nextTaskId([...blocks, ...newTasks]);
      newTasks.push(buildGeneratedTask(
        id,
        `Resolver dependencias pendientes para desbloquear tareas: ${pending.map((p) => p.id).join(", ")}`,
        "Operaciones", "orchestrator", "P1", pending.map((p) => p.id).join(","),
        `Analizar las dependencias no resueltas de las tareas pendientes (${pending.map((p) => p.id).join(", ")}), completar tareas prerequisite o actualizar dependencias si ya están resueltas.`,
        "backlog actualizado con dependencias resueltas o tareas prerequisite completadas",
        "backlog con estados corregidos",
        "solo documentación de estados",
      ));
    }
  }

  // 7. Si todo está limpio, generar tareas de mejora continua (P2/P3)
  if (newTasks.length === 0 && eligiblePending.length === 0) {
    // No hay nada pendiente — generar tareas de mejora del producto
    const id = nextTaskId([...blocks, ...newTasks]);
    newTasks.push(buildGeneratedTask(
      id,
      "Auditar cobertura de pruebas en módulos críticos del Owner Console",
      "QA", "qa", "P2", "ninguna",
      "Identificar módulos del Owner Console sin pruebas automatizadas, escribir pruebas de unidad para cubrir flujos principales (dashboard, venta POS, inventario), verificar que npm test -- --run mantenga 100% PASS.",
      "npm test -- --run exit 0; nuevas pruebas en src/lib/ y src/components/",
      "archivos de prueba creados + salida de pruebas",
      "solo pruebas locales",
    ));
  }

  // --- Deduplicar: omitir tareas cuyo título ya existe en el backlog ---
  const dedupedTasks = newTasks.filter((t) => !existingTitles.has(t.title));
  if (dedupedTasks.length < newTasks.length) {
    console.log(`Deduplicación: omitidas ${newTasks.length - dedupedTasks.length} tarea(s) duplicada(s) del backlog`);
  }

  // --- Aplicar nuevos tareas al backlog ---
  if (dedupedTasks.length > 0) {
    const allBlocks = [...blocks, ...dedupedTasks];
    await writeFile(BACKLOG, backlogToMarkdown(allBlocks));

    // Registrar en el log de generación
    const genRecord = {
      id: `gen-${Date.now()}`,
      timestamp: nowIso(),
      tasksGenerated: dedupedTasks.length,
      taskIds: dedupedTasks.map((t) => t.id),
      sourceInspection: {
        todosFound: todos.length,
        buildOk: quality.build?.ok ?? null,
        testsOk: quality.tests?.ok ?? null,
        typecheckOk: quality.typecheck?.ok ?? null,
        lintOk: quality.lint?.ok ?? null,
      },
      roadmap: roadmap ? { source: roadmap.source } : null,
    };
    await writeJson(LAST_GEN_FILE, genRecord);

    // Registrar evidencia
    const evidenceMd = await readFile(EVIDENCE_LOG, "utf8").catch(() => "# AGENCY_EVIDENCE_LOG\n");
    const evidenceEntry = `\n## #${parseInt(evidenceMd.match(/#(\d+)\s*$/m)?.[1] || "0") + 1} — Generación automática de tareas (${dedupedTasks.length} tareas)\n- timestamp: ${nowIso()}\n- tareas: ${dedupedTasks.map((t) => t.id).join(", ")}\n- origen: agency-generate-tasks.mjs\n- inspección: TODOs=${todos.length}, build=${quality.build?.ok ?? "n/a"}, tests=${quality.tests?.ok ?? "n/a"}, typecheck=${quality.typecheck?.ok ?? "n/a"}\n- evidencia: AGENT_BACKLOG.md actualizado con ${dedupedTasks.length} nuevas tareas PENDIENTE\n`;
    await writeFile(EVIDENCE_LOG, evidenceMd + evidenceEntry);

    console.log(JSON.stringify({
      phase: "tasks-generated",
      tasksGenerated: dedupedTasks.length,
      taskIds: dedupedTasks.map((t) => t.id),
      inspection: genRecord.sourceInspection,
    }, null, 2));
  } else {
    console.log(JSON.stringify({
      phase: "no-tasks-generated",
      message: "No se generaron nuevas tareas: backlog limpio y producto en estado estable",
      inspection: {
        todosFound: todos.length,
        buildOk: quality.build?.ok ?? null,
        testsOk: quality.tests?.ok ?? null,
        typecheckOk: quality.typecheck?.ok ?? null,
        lintOk: quality.lint?.ok ?? null,
      },
    }, null, 2));
  }
}

generateTasks().catch((error) => {
  console.error(JSON.stringify({ phase: "error", error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exitCode = 1;
});
