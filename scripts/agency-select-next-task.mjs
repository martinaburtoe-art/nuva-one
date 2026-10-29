import { readFile } from "node:fs/promises";

const BACKLOG = "docs/nuva-agency/AGENT_BACKLOG.md";
const PRIORITY_ORDER = { P0: 0, P1: 1, P2: 2, P3: 3 };

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

async function main() {
  const md = await readFile(BACKLOG, "utf8");
  const blocks = parseBlocks(md);
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

  const result = {
    generatedAt: new Date().toISOString(),
    totalTasks: blocks.length,
    pendingTasks: blocks.filter((b) => b.fields.estado === "PENDIENTE").length,
    candidates: candidates.map((b) => b.id),
    nextTask: candidates[0] ? { id: candidates[0].id, title: candidates[0].title } : null,
  };

  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.nextTask ? 0 : 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
