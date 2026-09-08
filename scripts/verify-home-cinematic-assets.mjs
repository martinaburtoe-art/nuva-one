#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const manifestPath = path.join(ROOT, "docs/home-cinematic-veo-manifest.json");
const componentPath = path.join(ROOT, "src/components/home-cinematic-experience.tsx");
const assetDir = path.join(ROOT, "public/home-cinematic");

const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
const component = await fs.readFile(componentPath, "utf8");
const scenes = manifest.scenes;

if (!Array.isArray(scenes) || scenes.length !== 14) {
  throw new Error(`Expected exactly 14 cinematic scenes; found ${scenes?.length ?? 0}.`);
}

const ids = new Set();
for (const scene of scenes) {
  if (!scene.id || !scene.number) throw new Error("Every cinematic scene needs id and number.");
  if (ids.has(scene.id)) throw new Error(`Duplicate cinematic scene id: ${scene.id}`);
  ids.add(scene.id);

  const sceneMarker = `{ id: "${scene.id}"`;
  if (!component.includes(sceneMarker)) {
    throw new Error(`Scene ${scene.id} is missing from the scene engine.`);
  }

  const video = `/home-cinematic/${scene.id}.mp4`;
  const poster = `/home-cinematic/${scene.id}-poster.webp`;
  const hasVideo = component.includes(`video: "${video}"`);
  const hasPoster = component.includes(`poster: "${poster}"`);

  const videoFile = path.join(assetDir, `${scene.id}.mp4`);
  const posterFile = path.join(assetDir, `${scene.id}-poster.webp`);
  const lastFile = path.join(assetDir, `${scene.id}-last.webp`);
  const files = [videoFile, posterFile, lastFile];
  const generated = await Promise.all(files.map(async (file) => {
    try {
      const stat = await fs.stat(file);
      return stat.isFile() && stat.size > 1024;
    } catch {
      return false;
    }
  }));

  const allGenerated = generated.every(Boolean);
  if (allGenerated && (!hasVideo || !hasPoster)) {
    throw new Error(`Generated assets exist for ${scene.id} but are not fully wired into the scene engine.`);
  }
  if (!allGenerated && (hasVideo || hasPoster)) {
    throw new Error(`Scene ${scene.id} references cinematic assets that are missing or invalid on disk.`);
  }
}

console.log(`Home cinematic integrity OK — ${scenes.length} scenes, ${scenes.filter((scene) => component.includes(`video: "/home-cinematic/${scene.id}.mp4"`)).length} generated scene sets wired.`);
