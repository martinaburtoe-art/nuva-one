#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const manifestPath = path.join(ROOT, "docs/home-cinematic-veo-manifest.json");
const componentPath = path.join(ROOT, "src/components/editorial-home-experience.tsx");
const assetDir = path.join(ROOT, "public/home-cinematic");

const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
const component = await fs.readFile(componentPath, "utf8");
const scenes = manifest.scenes;

if (!Array.isArray(scenes) || scenes.length !== 14) {
  throw new Error(`Expected exactly 14 cinematic scenes; found ${scenes?.length ?? 0}.`);
}

if (!component.includes("/home-cinematic/${kind}.mp4")) {
  throw new Error("Experience scene engine is missing the dynamic MP4 contract.");
}
if (!component.includes("/home-cinematic/${kind}-poster.webp")) {
  throw new Error("Experience scene engine is missing the dynamic poster contract.");
}

const ids = new Set();
let generatedSets = 0;
for (const scene of scenes) {
  if (!scene.id || !scene.number) throw new Error("Every cinematic scene needs id and number.");
  if (ids.has(scene.id)) throw new Error(`Duplicate cinematic scene id: ${scene.id}`);
  ids.add(scene.id);

  const files = [
    path.join(assetDir, `${scene.id}.mp4`),
    path.join(assetDir, `${scene.id}-poster.webp`),
    path.join(assetDir, `${scene.id}-last.webp`),
  ];
  const generated = await Promise.all(files.map(isUsableFile));
  const anyGenerated = generated.some(Boolean);
  const allGenerated = generated.every(Boolean);

  if (anyGenerated && !allGenerated) {
    throw new Error(`Incomplete generated asset set for ${scene.id}. Expected MP4, poster and last frame.`);
  }
  if (allGenerated) generatedSets += 1;
}

console.log(`Home cinematic integrity OK — ${scenes.length} scenes, ${generatedSets} complete generated scene sets.`);

async function isUsableFile(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile() && stat.size > 1024;
  } catch {
    return false;
  }
}
