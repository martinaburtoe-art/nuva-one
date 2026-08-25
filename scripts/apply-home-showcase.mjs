import { readFileSync, writeFileSync } from "node:fs";

const indexPath = "src/routes/index.tsx";
const workflowPath = ".github/workflows/integrate-home-showcase.yml";
const text = readFileSync(indexPath, "utf8");

// The homepage showcase is now maintained in source control. Never rewrite an
// already-integrated homepage during production builds.
if (text.includes("const SHOWCASE_MODULES =")) {
  console.log("Homepage showcase already integrated; build is source-of-truth");
  process.exit(0);
}

// The legacy integration workflow is intentionally disabled. A production
// build must never fail because that deprecated workflow no longer contains
// the old replacement payload.
const workflow = readFileSync(workflowPath, "utf8");
if (
  workflow.includes("Legacy homepage showcase integration (manual only)") ||
  workflow.includes("disabled workflow")
) {
  console.log("Legacy homepage integration is disabled; skipping source rewrite");
  process.exit(0);
}

const start = text.indexOf("const SHOWCASE_TABS =");
const end = text.indexOf("function DemoAndComparison", start);
if (start < 0 || end < 0) {
  throw new Error("Could not locate the existing homepage showcase boundaries");
}

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
