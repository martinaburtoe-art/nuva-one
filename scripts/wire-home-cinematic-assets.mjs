#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const componentPath = path.join(ROOT, "src/components/home-cinematic-experience.tsx");
const assetDir = path.join(ROOT, "public/home-cinematic");
const source = await fs.readFile(componentPath, "utf8");
const manifest = JSON.parse(
  await fs.readFile(path.join(ROOT, "docs/home-cinematic-veo-manifest.json"), "utf8"),
);

let output = source;
let changed = false;

for (const scene of manifest.scenes) {
  const videoPath = path.join(assetDir, `${scene.id}.mp4`);
  const posterPath = path.join(assetDir, `${scene.id}-poster.webp`);
  if (!(await isUsableFile(videoPath)) || !(await isUsableFile(posterPath))) continue;

  const scenePattern = new RegExp(
    `(\\{\\s*id:\\s*"${escapeRegExp(scene.id)}"[\\s\\S]*?action:\\s*"[^"]+"\\s*)(\\})`,
  );
  const match = output.match(scenePattern);
  if (!match || match.index === undefined) {
    throw new Error(`Scene ${scene.id} not found in ${componentPath}`);
  }

  const sceneText = match[0];
  if (sceneText.includes(`video: "/home-cinematic/${scene.id}.mp4"`)) continue;

  const replacement = `${match[1]}, poster: "/home-cinematic/${scene.id}-poster.webp", video: "/home-cinematic/${scene.id}.mp4"${match[2]}`;
  output = output.slice(0, match.index) + replacement + output.slice(match.index + sceneText.length);
  changed = true;
}

if (changed) {
  await fs.writeFile(componentPath, output);
  console.log("Wired generated cinematic assets into SCENES.");
} else {
  console.log("No new cinematic assets to wire.");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
}

async function isUsableFile(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile() && stats.size > 1024;
  } catch {
    return false;
  }
}
