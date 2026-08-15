import { readFileSync, writeFileSync } from "node:fs";

const indexPath = "src/routes/index.tsx";
const workflowPath = ".github/workflows/integrate-home-showcase.yml";
const text = readFileSync(indexPath, "utf8");

if (text.includes("const SHOWCASE_MODULES =")) {
  console.log("Homepage showcase already integrated");
  process.exit(0);
}

const start = text.indexOf("const SHOWCASE_TABS =");
const end = text.indexOf("function DemoAndComparison", start);
if (start < 0 || end < 0) {
  throw new Error("Could not locate the existing homepage showcase boundaries");
}

const workflow = readFileSync(workflowPath, "utf8");
const marker = "replacement = r'''";
const replacementStart = workflow.indexOf(marker);
if (replacementStart < 0) {
  throw new Error("Could not find homepage showcase replacement marker");
}
const contentStart = replacementStart + marker.length;
const contentEnd = workflow.indexOf("'''", contentStart);
if (contentEnd < 0) {
  throw new Error("Could not find homepage showcase replacement terminator");
}
const replacement = workflow.slice(contentStart, contentEnd);

writeFileSync(indexPath, text.slice(0, start) + replacement + text.slice(end));
console.log("Homepage showcase integrated for this build");
