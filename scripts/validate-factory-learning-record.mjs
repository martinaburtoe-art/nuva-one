import { readFile } from "node:fs/promises";

const path = process.argv[2];

if (!path) {
  console.error("Uso: npm run factory:validate-learning -- <archivo.json>");
  process.exit(1);
}

const fail = (message) => {
  console.error(`Factory Learning validation failed: ${message}`);
  process.exit(1);
};

let record;
try {
  record = JSON.parse(await readFile(path, "utf8"));
} catch (error) {
  fail(`no se pudo leer JSON válido: ${error.message}`);
}

const required = [
  "schema_version",
  "release_id",
  "commit",
  "objective",
  "scope",
  "expected_outcomes",
  "ci_evidence",
  "production_evidence",
  "actual_outcomes",
  "incidents",
  "regressions",
  "decisions",
  "learnings",
  "reusable_rules",
  "follow_up",
];

for (const key of required) {
  if (!(key in record)) fail(`falta el campo ${key}`);
}

const arrays = [
  "scope",
  "expected_outcomes",
  "actual_outcomes",
  "incidents",
  "regressions",
  "decisions",
  "learnings",
  "reusable_rules",
  "follow_up",
];

for (const key of arrays) {
  if (!Array.isArray(record[key])) fail(`${key} debe ser un array`);
}

if (record.schema_version !== 1) fail("schema_version debe ser 1");
if (!record.ci_evidence || typeof record.ci_evidence !== "object") fail("ci_evidence inválido");
if (!record.production_evidence || typeof record.production_evidence !== "object") {
  fail("production_evidence inválido");
}

const production = record.production_evidence;
if (production.deployment_state !== "READY") {
  fail("production_evidence.deployment_state debe ser READY");
}
if (production.commit_match !== true) {
  fail("production_evidence.commit_match debe ser true");
}
if (production.runtime_errors_checked !== true) {
  fail("production_evidence.runtime_errors_checked debe ser true");
}

const forbidden = /(?:password|secret|token|api[_-]?key|private[_-]?key|service[_-]?role|authorization)/i;
const serialized = JSON.stringify(record);

if (forbidden.test(serialized)) {
  fail("el registro contiene un posible secreto o credencial");
}

const placeholders = /REPLACE_WITH_/;
if (placeholders.test(serialized)) {
  fail("el registro todavía contiene placeholders");
}

console.log(`Factory Learning record válido: ${path}`);
