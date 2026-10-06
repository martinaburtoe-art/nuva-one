/**
 * Nüva Agency Gateway Worker fallback.
 * The model receives bounded repository context and can apply only exact replacements.
 */
import fs from "node:fs";
import path from "node:path";
import { generate } from "./nuva-ai-gateway.mjs";

const role = process.env.NUVA_AGENCY_ROLE || "constructor";
const root = process.cwd();
const maxFiles = 5;
const maxFileBytes = 30000;
const maxChangedLines = 220;

const denied = [
  /^\.github\//i,
  /^supabase\//i,
  /^package-lock\.json$/i,
  /^src\/.*(?:auth|security|billing|checkout|rls)/i,
];

function normalize(file) {
  return file.replaceAll("\\", "/");
}

function safeFile(file) {
  const normalized = normalize(file);
  return normalized && !normalized.startsWith("/") && !normalized.includes("../") && !denied.some((rule) => rule.test(normalized));
}

function readText(file) {
  if (!safeFile(file)) throw new Error("Unsafe file: " + file);
  const absolute = path.resolve(root, file);
  if (!absolute.startsWith(root + path.sep)) throw new Error("Path escapes workspace");
  const stat = fs.statSync(absolute);
  if (!stat.isFile() || stat.size > maxFileBytes) throw new Error("File is not eligible: " + file);
  return fs.readFileSync(absolute, "utf8");
}

function parseJson(text) {
  return JSON.parse(text.trim());
}

const backlog = fs.existsSync("docs/AGENT_BACKLOG.md") ? readText("docs/AGENT_BACKLOG.md") : "";
const construction = fs.existsSync("docs/nuva-agency/CONSTRUCTION_AGENT.md") ? readText("docs/nuva-agency/CONSTRUCTION_AGENT.md") : "";
const learning = fs.existsSync("docs/nuva-agency/LEARNING_PROTOCOL.md") ? readText("docs/nuva-agency/LEARNING_PROTOCOL.md") : "";
const files = fs.readdirSync("src", { recursive: true })
  .map(normalize)
  .filter((file) => /\.(ts|tsx|css)$/.test(file))
  .slice(0, 250);

const selectionPrompt = [
  "You are the " + role + " fallback worker for Nüva One. Select exactly ONE safe, evidence-backed task.",
  'Return ONLY JSON: {"task":"...","files":["relative/path",...]}.',
  "Rules: max " + maxFiles + " files; existing application files only; never choose auth, security, billing, checkout, Supabase migrations/RLS, workflows, package-lock, or secrets.",
  "Prefer a focused bug fix, regression test, UX/accessibility improvement, or documentation-backed implementation.",
  "Backlog:\n" + backlog.slice(0, 12000),
  "Construction guidance:\n" + construction.slice(0, 8000),
  "Learning evidence:\n" + learning.slice(0, 6000),
  "Candidate source files:\n" + files.join("\n"),
].join("\n");

const selection = parseJson((await generate(selectionPrompt, { timeoutMs: 30000 })).content);
if (!selection?.task || !Array.isArray(selection.files) || selection.files.length === 0 || selection.files.length > maxFiles) {
  throw new Error("Gateway worker returned an invalid task selection");
}

const context = [];
for (const file of selection.files) {
  if (!safeFile(file)) throw new Error("Unsafe file selected: " + file);
  context.push("FILE: " + file + "\n---\n" + readText(file) + "\n---");
}

const patchPrompt = [
  "Implement exactly ONE focused task in Nüva One.",
  "Role: " + role,
  "Task: " + selection.task,
  "",
  'Return ONLY JSON: {"summary":"...","edits":[{"file":"relative/path","find":"exact existing text","replace":"replacement text"}],"lesson":"reusable lesson or empty string"}',
  "",
  "Hard rules:",
  "- exact text replacements only; no new files.",
  "- max 5 edits and max " + maxChangedLines + " changed lines in total.",
  "- only modify files included in supplied context.",
  "- never touch secrets, workflows, package-lock, Supabase migrations/RLS, auth/security/billing/checkout.",
  "- preserve existing behavior outside the task.",
  "- do not fabricate APIs or imports.",
  "- if no safe implementation is possible, return edits: [].",
  "",
  "Context:\n" + context.join("\n\n"),
].join("\n");

const patch = parseJson((await generate(patchPrompt, { timeoutMs: 45000 })).content);
if (!Array.isArray(patch?.edits)) throw new Error("Gateway worker returned invalid edits");

let changed = 0;
for (const edit of patch.edits) {
  if (!edit || typeof edit.file !== "string" || typeof edit.find !== "string" || typeof edit.replace !== "string") {
    throw new Error("Malformed edit");
  }
  if (!selection.files.includes(edit.file) || !safeFile(edit.file)) throw new Error("Edit outside approved context: " + edit.file);
  const current = readText(edit.file);
  const occurrences = current.split(edit.find).length - 1;
  if (occurrences !== 1) throw new Error("Expected exactly one match in " + edit.file + ", found " + occurrences);
  changed += edit.replace.split("\n").length + edit.find.split("\n").length;
  if (changed > maxChangedLines) throw new Error("Gateway worker exceeded change budget");
  fs.writeFileSync(path.resolve(root, edit.file), current.replace(edit.find, edit.replace));
}

console.log(JSON.stringify({
  provider: "gateway-fallback",
  role,
  task: selection.task,
  summary: patch.summary || "No summary provided",
  files: patch.edits.map((edit) => edit.file),
  changedBudget: changed,
  lesson: patch.lesson || "",
}, null, 2));
