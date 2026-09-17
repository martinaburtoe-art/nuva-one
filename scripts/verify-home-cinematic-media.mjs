#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ROOT = process.cwd();
const ASSET_DIR = path.join(ROOT, "public/home-cinematic");
const MANIFEST_PATH = path.join(ROOT, "docs/home-cinematic-veo-manifest.json");
const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8"));
const allScenes = Array.isArray(manifest.scenes) ? manifest.scenes : [];
if (allScenes.length !== 14) throw new Error(`Expected 14 scenes; found ${allScenes.length}.`);

const requested = (process.env.VEO_SCENES || "").trim().split(/\s+/).filter(Boolean);
const scenes = requested.length
  ? allScenes.filter((scene) => requested.includes(scene.id) || requested.includes(scene.number))
  : allScenes;
if (!scenes.length) throw new Error("No valid scenes selected for technical media QA.");

async function usable(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile() && stat.size > 1024;
  } catch {
    return false;
  }
}

async function probe(filePath) {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error", "-select_streams", "v:0",
    "-show_entries", "stream=width,height,duration,codec_name,pix_fmt",
    "-of", "json", filePath,
  ]);
  const stream = JSON.parse(stdout).streams?.[0];
  if (!stream) throw new Error("No video stream found.");
  return stream;
}

for (const scene of scenes) {
  const video = path.join(ASSET_DIR, `${scene.id}.mp4`);
  const poster = path.join(ASSET_DIR, `${scene.id}-poster.webp`);
  const last = path.join(ASSET_DIR, `${scene.id}-last.webp`);
  if (!(await usable(video)) || !(await usable(poster)) || !(await usable(last))) {
    throw new Error(`${scene.id}: incomplete MP4/poster/last-frame set.`);
  }

  const stream = await probe(video);
  const width = Number(stream.width);
  const height = Number(stream.height);
  const duration = Number(stream.duration);
  if (width < 1920 || height < 1080) throw new Error(`${scene.id}: expected at least 1920x1080; found ${width}x${height}.`);
  if (Math.abs(width / height - 16 / 9) > 0.015) throw new Error(`${scene.id}: expected 16:9; found ${width}x${height}.`);
  if (!Number.isFinite(duration) || duration < 3.5 || duration > 8.5) throw new Error(`${scene.id}: expected 4–8 seconds; found ${duration}s.`);
  if (!stream.codec_name) throw new Error(`${scene.id}: missing video codec metadata.`);
  console.log(`${scene.id}: ${width}x${height}, ${duration.toFixed(2)}s, ${stream.codec_name}`);
}

console.log(`Cinematic media technical QA passed: ${scenes.length}/${scenes.length} scene sets.`);
