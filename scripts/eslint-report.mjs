import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const output = execFileSync("npx", ["eslint", ".", "--format", "json"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "inherit"],
  maxBuffer: 20 * 1024 * 1024,
});

const results = JSON.parse(output);
const byRule = new Map();
const byModule = new Map();
let warnings = 0;
let errors = 0;

for (const file of results) {
  const module = file.filePath.split("/src/")[1]?.split("/")[0] ?? "root";
  for (const message of file.messages) {
    if (message.severity === 1) warnings += 1;
    if (message.severity === 2) errors += 1;
    const rule = message.ruleId ?? "unknown";
    const current = byRule.get(rule) ?? { rule, warnings: 0, errors: 0 };
    if (message.severity === 1) current.warnings += 1;
    if (message.severity === 2) current.errors += 1;
    byRule.set(rule, current);
    const moduleCurrent = byModule.get(module) ?? { module, warnings: 0, errors: 0 };
    if (message.severity === 1) moduleCurrent.warnings += 1;
    if (message.severity === 2) moduleCurrent.errors += 1;
    byModule.set(module, moduleCurrent);
  }
}

const report = {
  generated_at: new Date().toISOString(),
  totals: { warnings, errors, files: results.length },
  by_rule: [...byRule.values()].sort((a, b) => b.warnings - a.warnings || b.errors - a.errors),
  by_module: [...byModule.values()].sort((a, b) => b.warnings - a.warnings || b.errors - a.errors),
};

writeFileSync("eslint-report.json", `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.totals));
console.table(report.by_rule.slice(0, 20));
console.table(report.by_module);
