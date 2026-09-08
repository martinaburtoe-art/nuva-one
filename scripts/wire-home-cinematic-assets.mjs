#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const componentPath = path.join(ROOT, "src/components/home-cinematic-experience.tsx");
const assetDir = path.join(ROOT, "public/home-cinematic");
const source = await fs.readFile(componentPath, "utf8");
const manifest = JSON.parse(await fs.readFile(path.join(ROOT, "docs/home-cinematic-veo-manifest.json"), "utf8"));

let output = source;
let changed = false;

for (const scene of manifest.scenes) {
  const videoPath = path.join(assetDir, `${scene.id}.mp4`);
  const posterPath = path.join(assetDir, `${scene.id}-poster.webp`);
  if (!(await exists(videoPath)) || !(await exists(posterPath))) continue;

  const marker = `{ id: "${scene.id}"`;
  const index = output.indexOf(marker);
  if (index < 0) throw new Error(`Scene ${scene.id} not found in ${componentPath}`);

  const lineEnd = output.indexOf("\n", index);
  const end = lineEnd < 0 ? output.length : lineEnd;
  const line = output.slice(index, end);
  if (line.includes(`video: "/home-cinematic/${scene.id}.mp4"`)) continue;

  const replaced = line.replace(
    /\s*},\s*$/,
    `, poster: "/home-cinematic/${scene.id}-poster.webp", video: "/home-cinematic/${scene.id}.mp4" },`,
  );
  if (replaced === line) throw new Error(`Could not wire scene ${scene.id}`);
  output = output.slice(0, index) + replaced + output.slice(end);
  changed = true;
}

if (changed) {
  await fs.writeFile(componentPath, output);
  console.log("Wired generated cinematic assets into SCENES.");
} else {
  console.log("No new cinematic assets to wire.");
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
