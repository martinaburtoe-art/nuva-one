import { readFile, writeFile } from "node:fs/promises";

const revision =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  process.env.SOURCE_VERSION;

if (!revision) {
  throw new Error("Missing immutable build revision (VERCEL_GIT_COMMIT_SHA, GITHUB_SHA or SOURCE_VERSION).");
}

const marker = "__NUVA_BUILD_REVISION__";
const candidates = [
  ".vercel/output/static/sw.js",
  "dist/sw.js",
  "build/client/sw.js",
];

let stampedPath = null;
for (const path of candidates) {
  try {
    const source = await readFile(path, "utf8");
    if (!source.includes(marker)) continue;
    await writeFile(path, source.replaceAll(marker, revision), "utf8");
    stampedPath = path;
    break;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

if (!stampedPath) {
  throw new Error(`Could not find the built service worker containing ${marker}. Checked: ${candidates.join(", ")}`);
}

console.log(`[Nüva PWA] Stamped service worker with build revision ${revision} at ${stampedPath}`);
