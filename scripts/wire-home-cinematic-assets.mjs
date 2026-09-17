#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const routePath = path.join(ROOT, "src/routes/experience.tsx");
const scenesPath = path.join(ROOT, "src/components/editorial-home-experience-scenes.tsx");
const assetDir = path.join(ROOT, "public/home-cinematic");
const route = await fs.readFile(routePath, "utf8");
const scenesComponent = await fs.readFile(scenesPath, "utf8");
const manifest = JSON.parse(await fs.readFile(path.join(ROOT, "docs/home-cinematic-veo-manifest.json"), "utf8"));

if (!route.includes("EditorialHomeExperienceV2")) {
  throw new Error("/experience is not using the current editorial V2 scene engine.");
}
if (!scenesComponent.includes("/home-cinematic/${kind}.mp4") || !scenesComponent.includes("/home-cinematic/${kind}-poster.webp")) {
  throw new Error("Editorial scene engine is missing the dynamic cinematic media contract.");
}

let generated = 0;
for (const scene of manifest.scenes) {
  const videoPath = path.join(assetDir, `${scene.id}.mp4`);
  const posterPath = path.join(assetDir, `${scene.id}-poster.webp`);
  if ((await isUsableFile(videoPath)) && (await isUsableFile(posterPath))) generated += 1;
}

console.log(`Cinematic media contract OK — ${generated}/${manifest.scenes.length} scene sets available.`);

async function isUsableFile(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile() && stats.size > 1024;
  } catch {
    return false;
  }
}
