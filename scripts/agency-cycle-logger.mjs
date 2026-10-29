import { writeFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const LOGS_DIR = "logs/cycles";
const INDEX_FILE = join(LOGS_DIR, "index.json");

function nowIso() {
  return new Date().toISOString();
}

function cycleId() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function ensureDir() {
  await mkdir(LOGS_DIR, { recursive: true });
}

async function readIndex() {
  try {
    const raw = await readFile(INDEX_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return { cycles: [] };
  }
}

async function writeIndex(index) {
  await writeFile(INDEX_FILE, JSON.stringify(index, null, 2) + "\n");
}

async function logCycle({
  taskId,
  taskTitle,
  agent,
  delegationMethod,
  result, // 'accepted' | 'rejected' | 'returned' | 'executed'
  filesAffected,
  qaVerdict,
  securityVerdict,
  orchestratorDecision,
  evidence,
}) {
  await ensureDir();

  const id = cycleId();
  const timestamp = nowIso();

  const record = {
    id,
    timestamp,
    cycle: id,
    taskId,
    taskTitle,
    agent,
    delegationMethod,
    result,
    filesAffected: filesAffected || [],
    qaVerdict: qaVerdict || "pending",
    securityVerdict: securityVerdict || "pending",
    orchestratorDecision: orchestratorDecision || "pending",
    evidence: evidence || [],
    persisted: true,
  };

  const fileName = `cycle-${id}.json`;
  const filePath = join(LOGS_DIR, fileName);
  await writeFile(filePath, JSON.stringify(record, null, 2) + "\n");

  const index = await readIndex();
  index.cycles.push({
    id,
    timestamp,
    cycle: id,
    taskId,
    taskTitle,
    agent,
    result,
    qaVerdict,
    securityVerdict,
    orchestratorDecision,
    file: fileName,
  });
  index.cycles.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  await writeIndex(index);

  return { record, filePath, indexFile: INDEX_FILE };
}

async function main() {
  const args = process.argv.slice(2);
  const opts = {};
  for (const arg of args) {
    const eq = arg.indexOf("=");
    if (eq === -1) continue;
    opts[arg.slice(0, eq)] = arg.slice(eq + 1);
  }

  const required = ["taskId", "agent", "orchestratorDecision"];
  const missing = required.filter((k) => !(k in opts));
  if (missing.length > 0) {
    console.error(
      `Faltan parámetros requeridos: ${missing.join(", ")}. Uso: node scripts/agency-cycle-logger.mjs taskId=T-XX agent=Constructor orchestratorDecision=accepted [qaVerdict=approved] [securityVerdict=approved] [result=executed] [filesAffected=file1.ts,file2.ts] [evidence=ev1,ev2]`
    );
    process.exitCode = 1;
    return;
  }

  const filesAffected = opts.filesAffected ? opts.filesAffected.split(",").filter(Boolean) : [];
  const evidence = opts.evidence ? opts.evidence.split(",").filter(Boolean) : [];

  const { record, filePath } = await logCycle({
    taskId: opts.taskId,
    taskTitle: opts.taskTitle || "",
    agent: opts.agent,
    delegationMethod: opts.delegationMethod || "direct",
    result: opts.result || "executed",
    filesAffected,
    qaVerdict: opts.qaVerdict || "pending",
    securityVerdict: opts.securityVerdict || "pending",
    orchestratorDecision: opts.orchestratorDecision,
    evidence,
  });

  console.log(JSON.stringify({ ok: true, cycleId: record.id, file: filePath, record }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
