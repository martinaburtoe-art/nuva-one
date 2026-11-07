// hermes-engineering-loop.mjs — Autonomous Coding Loop para Hermes Engineering
// Implementa el ciclo: INSPECT → PLAN → EDIT → TEST → FIX → VERIFY → RECORD
// Diseñado para ejecutar mejoras locales, reversibles y aisladas sobre Nüva One
// sin instalar dependencias externas (solo Node.js stdlib + herramientas del repo).
//
// Uso: node scripts/hermes-engineering-loop.mjs <tarea> [--commit]
//   tarea:    descripción breve de la mejora a implementar
//   --commit: si se pasa, crea un commit local tras verificar (sin push)

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { exec } from "node:child_process";
import { join, relative, sep } from "node:path";
import { promisify } from "node:util";

const execSh = promisify(exec);
const REPO_ROOT = "C:/Users/marti/Documents/nuva-one";
const LOOP_LOG = "docs/hermes-engineering/loop-log.json";

// ---------- Utilidades ----------

async function sh(cmd, args = [], opts = {}) {
  const fullCmd = [cmd, ...args].join(" ");
  try {
    const { stdout, stderr } = await execSh(fullCmd, { cwd: REPO_ROOT, shell: true, ...opts });
    return { ok: true, stdout, stderr };
  } catch (err) {
    return { ok: false, stdout: err.stdout || "", stderr: err.stderr || String(err) };
  }
}

function nowIso() {
  return new Date().toISOString();
}

// ---------- Paso 1: INSPECT — leer estado actual ----------

async function inspect(task) {
  const report = {
    step: "INSPECT",
    timestamp: nowIso(),
    task,
    repo: {},
  };

  // Rama y HEAD
  const branch = await sh("git", ["branch", "--show-current"]);
  const head = await sh("git", ["log", "--oneline", "-1"]);
  const status = await sh("git", ["status", "--porcelain"]);
  const remotes = await sh("git", ["remote", "-v"]);

  report.repo = {
    branch: branch.ok ? branch.stdout.trim() : "UNKNOWN",
    head: head.ok ? head.stdout.trim() : "UNKNOWN",
    workingTree: status.ok ? status.stdout.trim() : "UNKNOWN",
    remotes: remotes.ok ? remotes.stdout.trim() : "NONE",
  };

  return report;
}

// ---------- Paso 2: PLAN — diseñar cambios basado en el repo map ----------

async function plan(task, inspectReport) {
  const plan = {
    step: "PLAN",
    timestamp: nowIso(),
    task,
    filesToRead: [],
    filesToEdit: [],
    filesToCreate: [],
    testsToRun: [],
    rationale: [],
    risks: [],
  };

  // Leer repo map si existe para entender el código
  const mapPath = join(REPO_ROOT, "docs", "hermes-engineering", "repo-map.json");
  let repoMap;
  try {
    const raw = await readFile(mapPath, "utf8");
    repoMap = JSON.parse(raw);
  } catch {
    repoMap = null;
  }

  if (repoMap) {
    plan.rationale.push(
      `Repo map disponible: ${repoMap.summary.totalFilesScanned} archivos, ${repoMap.summary.totalSymbols} símbolos, ${repoMap.summary.totalDependencies} dependencias resueltas`
    );
    // Identificar archivos relevantes para la tarea (heurística por nombre)
    const relevant = repoMap.files.filter(
      (f) =>
        f.path.includes("repo-map") ||
        f.path.includes("hermes") ||
        f.path.includes("agency") ||
        f.path.includes("specialist")
    );
    plan.filesToRead = relevant.map((f) => f.path).slice(0, 10);
  } else {
    plan.risks.push("Repo map no disponible; se trabajará sin comprensión estructural previa");
  }

  // Plan específico para la tarea de cross-referencing de símbolos
  if (task.toLowerCase().includes("symbol") || task.toLowerCase().includes("cross-ref")) {
    plan.filesToEdit = ["scripts/hermes-repo-map.mjs"];
    plan.filesToCreate = [];
    plan.testsToRun = ["node scripts/hermes-repo-map.mjs . docs/hermes-engineering/repo-map.json", "npx vitest run"];
    plan.rationale.push(
      "Añadir cross-referencing: para cada símbolo, listar archivos que lo definen y archivos que lo importan"
    );
    plan.risks.push("Cambio solo en script de ingeniería; sin tocar código de producción ni tests del producto");
  } else {
    plan.filesToEdit = [];
    plan.filesToCreate = [];
    plan.testsToRun = ["npx vitest run", "npx tsc --noEmit"];
    plan.rationale.push("Tarea genérica: se aplicarán pruebas generales de regresión");
  }

  return plan;
}

// ---------- Paso 3: EDIT — aplicar cambios coherentes ----------

async function edit(plan) {
  const results = { edited: [], created: [], errors: [] };

  for (const file of plan.filesToEdit) {
    const fullPath = join(REPO_ROOT, file);
    try {
      const content = await readFile(fullPath, "utf8");
      const modified = await applyEdit(file, content, plan.task);
      if (modified !== content) {
        await writeFile(fullPath, modified);
        results.edited.push(file);
      } else {
        results.edited.push(`${file} (sin cambios necesarios)`);
      }
    } catch (err) {
      results.errors.push(`${file}: ${err.message}`);
    }
  }

  for (const file of plan.filesToCreate) {
    const fullPath = join(REPO_ROOT, file);
    try {
      const dir = fullPath.split(sep).slice(0, -1).join(sep);
      await mkdir(dir, { recursive: true });
      await writeFile(fullPath, "// archivo creado por hermes-engineering-loop\n");
      results.created.push(file);
    } catch (err) {
      results.errors.push(`${file}: ${err.message}`);
    }
  }

  return results;
}

async function applyEdit(file, content, task) {
  // Edit específico: añadir cross-referencing de símbolos al repo map
  if (file === "scripts/hermes-repo-map.mjs") {
    return addSymbolCrossRef(content);
  }
  return content;
}

function addSymbolCrossRef(content) {
  // 1. Añadir import de readFile si no está (ya está importado)
  // 2. Añadir función buildSymbolCrossRef antes de main()
  const crossRefFn = `
// ---------- Symbol cross-referencing (definición vs uso) ----------

function buildSymbolCrossRef(files, symbolIndex) {
  const crossRef = new Map(); // symbolName -> { definedIn: [file], usedIn: [file] }
  for (const [symName, definingFiles] of symbolIndex) {
    const usedIn = [];
    for (const file of files) {
      if (definingFiles.includes(file.path)) continue; // ya está en definedIn
      const symText = file.symbols.map((s) => s.name).join(" ");
      const importsText = (file.dependencies || []).join(" ");
      const combined = symText + " " + importsText;
      if (combined.includes(symName)) {
        usedIn.push(file.path);
      }
    }
    crossRef.set(symName, { definedIn: definingFiles, usedIn });
  }
  return crossRef;
}

`;

  // Insertar antes de "// ---------- Main ----------" (idempotente: no duplicar si ya existe)
  const anchor = "// ---------- Main ----------";
  if (content.includes(anchor) && !content.includes("function buildSymbolCrossRef")) {
    content = content.replace(anchor, crossRefFn.trim() + "\n\n" + anchor);
  }

  // 3. En main(), después de construir symbolIndex, añadir crossRef y incluirlo en el output
  const mainAnchor = "  // Build dependency graph: match relative imports to actual files";
  const crossRefCode = `
  // Build symbol cross-reference: definition vs usage across files
  const symbolCrossRef = buildSymbolCrossRef(files, symbolIndex);
  const crossRefList = Array.from(symbolCrossRef.entries()).map(([name, ref]) => ({
    symbol: name,
    definedIn: ref.definedIn,
    usedIn: ref.usedIn,
  }));

`;

  if (content.includes(mainAnchor) && !content.includes("symbolCrossRef")) {
    content = content.replace(mainAnchor, crossRefCode.trim() + "\n  " + mainAnchor);
  }

  // 4. Añadir crossRef al objeto map
  const mapAnchor = "    entryPoints: entryPoints.map((f) => f.path),";
  const crossRefMap = `    entryPoints: entryPoints.map((f) => f.path),
    symbolCrossRef: crossRefList,`;

  if (content.includes(mapAnchor) && !content.includes("symbolCrossRef:")) {
    content = content.replace(mapAnchor, crossRefMap);
  }

  return content;
}

// ---------- Paso 4: TEST — ejecutar pruebas ----------

async function test(plan) {
  const results = [];

  for (const testCmd of plan.testsToRun) {
    const [cmd, ...args] = testCmd.split(/\s+/);
    const start = Date.now();
    const result = await sh(cmd, args, { timeout: 120000 });
    const duration = Date.now() - start;
    results.push({
      command: testCmd,
      ok: result.ok,
      durationMs: duration,
      stdout: result.stdout.slice(0, 2000),
      stderr: result.stderr.slice(0, 2000),
    });
    if (!result.ok) break; // parar en primera falla
  }

  return results;
}

// ---------- Paso 5: FIX — intentar corregir errores automáticamente ----------

async function fix(testResults, plan) {
  const fixes = [];
  const failed = testResults.filter((t) => !t.ok);

  for (const failure of failed) {
    // Heurística simple: si es un error de sintaxis en el script editado, reportar
    fixes.push({
      failedCommand: failure.command,
      stderr: failure.stderr.slice(0, 500),
      action: "revisar_manualmente",
      autoFixable: false,
    });
  }

  return fixes;
}

// ---------- Paso 6: VERIFY — confirmar que todo pasa ----------

async function verify(plan) {
  const checks = [];

  // TypeScript
  const tsc = await sh("npx", ["tsc", "--noEmit"], { timeout: 120000 });
  checks.push({ name: "tsc --noEmit", ok: tsc.ok, output: tsc.stdout.slice(0, 500) + tsc.stderr.slice(0, 500) });

  // Vitest
  const vitest = await sh("npx", ["vitest", "run"], { timeout: 120000 });
  checks.push({ name: "vitest run", ok: vitest.ok, output: vitest.stdout.slice(0, 500) + vitest.stderr.slice(0, 500) });

  // Lint (solo errores, no advertencias)
  const lint = await sh("npm", ["run", "lint"], { timeout: 120000 });
  checks.push({ name: "npm run lint", ok: lint.ok, output: lint.stdout.slice(0, 500) + lint.stderr.slice(0, 500) });

  return checks;
}

// ---------- Paso 7: RECORD — escribir log del ciclo ----------

async function record(cycleRecord) {
  const logPath = join(REPO_ROOT, LOOP_LOG);
  let existing = [];
  try {
    const raw = await readFile(logPath, "utf8");
    existing = JSON.parse(raw);
  } catch {
    existing = [];
  }
  existing.push(cycleRecord);
  const dir = logPath.split(sep).slice(0, -1).join(sep);
  await mkdir(dir, { recursive: true });
  await writeFile(logPath, JSON.stringify(existing, null, 2));
}

// ---------- Ejecutar ciclo completo ----------

async function runCycle(task, shouldCommit) {
  const cycle = {
    task,
    startedAt: nowIso(),
    steps: [],
    result: "PENDING",
  };

  try {
    // INSPECT
    const insp = await inspect(task);
    cycle.steps.push(insp);
    console.log(`[INSPECT] rama=${insp.repo.branch} HEAD=${insp.repo.head}`);

    // PLAN
    const pln = await plan(task, insp);
    cycle.steps.push(pln);
    console.log(`[PLAN] archivos a editar: ${pln.filesToEdit.join(", ") || "(ninguno)"}`);

    // EDIT
    const editRes = await edit(pln);
    cycle.steps.push({ step: "EDIT", timestamp: nowIso(), result: editRes });
    console.log(`[EDIT] editados: ${editRes.edited.join(", ")}`);

    // TEST
    const testRes = await test(pln);
    cycle.steps.push({ step: "TEST", timestamp: nowIso(), result: testRes });
    const allTestsOk = testRes.every((t) => t.ok);
    console.log(`[TEST] ${testRes.length} comando(s), todos OK: ${allTestsOk}`);

    // FIX (si hay fallos)
    if (!allTestsOk) {
      const fixes = await fix(testRes, pln);
      cycle.steps.push({ step: "FIX", timestamp: nowIso(), result: fixes });
      console.log(`[FIX] ${fixes.length} corrección(es) identificada(s)`);
    }

    // VERIFY
    const verifyRes = await verify(pln);
    cycle.steps.push({ step: "VERIFY", timestamp: nowIso(), result: verifyRes });
    const allVerifyOk = verifyRes.every((v) => v.ok);
    console.log(`[VERIFY] todos los checks OK: ${allVerifyOk}`);

    // COMMIT (si todo pasa y se solicitó)
    if (allTestsOk && allVerifyOk && shouldCommit) {
      const commitRes = await sh("git", ["add", "-A"]);
      const commit = await sh("git", ["commit", "-m", `feat(engineering): ${task} (Hermes Engineering autonomous loop)`]);
      cycle.steps.push({ step: "COMMIT", timestamp: nowIso(), result: { ok: commit.ok, output: commit.stdout } });
      console.log(`[COMMIT] ${commit.ok ? "EXITO" : "FALLO"}: ${commit.stdout.trim() || commit.stderr.trim()}`);
    }

    cycle.result = allTestsOk && allVerifyOk ? "SUCCESS" : "FAILURE";
  } catch (err) {
    cycle.result = "ERROR";
    cycle.error = err.message;
    console.error(`[ERROR] ${err.message}`);
  }

  cycle.finishedAt = nowIso();
  await record(cycle);
  return cycle;
}

// ---------- Entry point ----------

async function main() {
  const task = process.argv[2];
  const shouldCommit = process.argv.includes("--commit");

  if (!task) {
    console.error("Uso: node scripts/hermes-engineering-loop.mjs <tarea> [--commit]");
    process.exitCode = 1;
    return;
  }

  const cycle = await runCycle(task, shouldCommit);
  console.log(`\n=== CICLO TERMINADO: ${cycle.result} ===`);
  process.exitCode = cycle.result === "SUCCESS" ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
