import { execFileSync } from "node:child_process";
import { generate } from "./nuva-ai-gateway.mjs";

const diff = execFileSync("git", ["diff", "HEAD^", "--", ".", ":(exclude)package-lock.json"], {
  encoding: "utf8",
  maxBuffer: 2_000_000,
});

if (!diff.trim()) {
  console.log("NEEDS_EVIDENCE\nNo diff available for Gateway review.");
  process.exit(0);
}

const prompt = [
  "Act as the independent Nüva One PR reviewer using read-only evidence.",
  "Review ONLY the supplied diff.",
  "Check correctness, regression risk, TypeScript/React consistency, security/RLS implications when relevant, tests, build/lint/type safety, accessibility for UI changes, and scope discipline.",
  "Do not invent defects. Distinguish blocking defects from suggestions.",
  "End with exactly one verdict: READY, CHANGES_REQUESTED, or NEEDS_EVIDENCE.",
  "Return concise findings with file references.",
  "",
  "DIFF:",
  diff.slice(0, 180000),
].join("\n");

const result = await generate(prompt, {
  providers: ["gemini", "groq", "cloudflare"],
  timeoutMs: 45000,
});

console.log(result.content.trim());
console.log("\nGateway provider: " + result.provider + "/" + result.model);
