import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  "docs/NUVA_ONE_FACTORY.md",
  "docs/FACTORY_WORKFLOW.md",
];

const requiredTools = [
  "OpenCode",
  "OpenDesign",
  "Cline",
  "Obsidian",
  "Hedra",
  "Ideogram",
];

const forbiddenRuntimeTerms = ["nuva-studio", "whatsapp"];

const failures = [];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    failures.push(`Missing required Factory document: ${file}`);
  }
}

const factoryDocPath = path.join(root, "docs/NUVA_ONE_FACTORY.md");
if (fs.existsSync(factoryDocPath)) {
  const content = fs.readFileSync(factoryDocPath, "utf8");
  for (const tool of requiredTools) {
    if (!content.includes(tool)) {
      failures.push(`Factory map is missing tool: ${tool}`);
    }
  }
}

const sourceRoots = ["src"];
for (const sourceRoot of sourceRoots) {
  const absoluteRoot = path.join(root, sourceRoot);
  if (!fs.existsSync(absoluteRoot)) continue;

  const stack = [absoluteRoot];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!["node_modules", ".git", "dist"].includes(entry.name)) stack.push(fullPath);
        continue;
      }

      if (!/\.(ts|tsx|js|mjs|sql|json)$/.test(entry.name)) continue;

      const content = fs.readFileSync(fullPath, "utf8").toLowerCase();
      for (const term of forbiddenRuntimeTerms) {
        if (content.includes(term)) {
          failures.push(`Retired runtime term "${term}" found in ${path.relative(root, fullPath)}`);
        }
      }
    }
  }
}

if (failures.length) {
  console.error("Factory control-plane validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Factory control-plane validation passed.");
console.log(`- Required documents: ${requiredFiles.length}/${requiredFiles.length}`);
console.log(`- Factory tools documented: ${requiredTools.length}/${requiredTools.length}`);
console.log("- Retired Studio/WhatsApp runtime residue: 0");
