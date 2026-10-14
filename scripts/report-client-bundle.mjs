import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";

const root = path.resolve(".vercel/output/static/assets");
const budgetRawKb = Number(process.env.NUVA_MAIN_CHUNK_MAX_KB ?? 700);
const budgetGzipKb = Number(process.env.NUVA_MAIN_CHUNK_MAX_GZIP_KB ?? 220);

async function filesUnder(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await filesUnder(full)));
    else if (/\.(?:js|css)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const files = await filesUnder(root);
const assets = await Promise.all(files.map(async (file) => {
  const data = await readFile(file);
  return {
    name: path.relative(root, file).replaceAll(path.sep, "/"),
    bytes: data.byteLength,
    gzipBytes: gzipSync(data, { level: 9 }).byteLength,
    type: file.endsWith(".css") ? "css" : "js",
  };
}));

const js = assets.filter((asset) => asset.type === "js");
const css = assets.filter((asset) => asset.type === "css");
const largest = [...assets].sort((a, b) => b.bytes - a.bytes).slice(0, 15);
const mainCandidates = js.filter((asset) => /^index-[^/]+\.js$/.test(asset.name));
const main = mainCandidates.sort((a, b) => b.bytes - a.bytes)[0];

console.log("NÜVA CLIENT ASSET REPORT");
console.log("Scope: emitted static JS/CSS files; total includes lazy chunks and is NOT the initial page transfer.");
console.log(`Assets: ${assets.length} total | JS ${js.length} | CSS ${css.length}`);
console.log(`All JS chunks: ${(js.reduce((sum, a) => sum + a.bytes, 0) / 1024).toFixed(1)} KiB raw / ${(js.reduce((sum, a) => sum + a.gzipBytes, 0) / 1024).toFixed(1)} KiB gzip (sum of individually compressed files)`);
console.log(`All CSS chunks: ${(css.reduce((sum, a) => sum + a.bytes, 0) / 1024).toFixed(1)} KiB raw / ${(css.reduce((sum, a) => sum + a.gzipBytes, 0) / 1024).toFixed(1)} KiB gzip`);
console.log("\nLargest emitted assets:");
for (const asset of largest) {
  console.log(`- ${asset.name}: ${(asset.bytes / 1024).toFixed(1)} KiB raw / ${(asset.gzipBytes / 1024).toFixed(1)} KiB gzip`);
}

if (!main) {
  console.error("No index-*.js main candidate found; cannot certify the configured main-chunk budget.");
  process.exitCode = 1;
} else {
  console.log(`\nMain index chunk candidate: ${main.name}: ${(main.bytes / 1024).toFixed(1)} KiB raw / ${(main.gzipBytes / 1024).toFixed(1)} KiB gzip`);
  if (main.bytes > budgetRawKb * 1024 || main.gzipBytes > budgetGzipKb * 1024) {
    console.error(`FAIL: main chunk exceeds budget (${budgetRawKb} KiB raw, ${budgetGzipKb} KiB gzip).`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: main chunk is within budget (${budgetRawKb} KiB raw, ${budgetGzipKb} KiB gzip).`);
  }
}
