#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = process.env.VEO_MODEL || "veo-3.1-generate-preview";
const API_KEY = process.env.GEMINI_API_KEY;
const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, "public/home-cinematic");
const MANIFEST_PATH = path.join(ROOT, "docs/home-cinematic-veo-manifest.json");

if (!API_KEY) {
  console.error("Missing GEMINI_API_KEY. Set it in the environment; never commit the key to the repository.");
  process.exit(1);
}

const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8"));
const only = process.argv.slice(2).filter(Boolean);
const scenes = only.length
  ? manifest.scenes.filter((scene) => only.includes(scene.id) || only.includes(scene.number))
  : manifest.scenes;

if (!scenes.length) {
  console.error("No matching scenes. Use scene ids/numbers such as 01 or hero.");
  process.exit(1);
}

await fs.mkdir(OUTPUT_DIR, { recursive: true });

function mimeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "image/png";
}

async function inlineImage(relativePath) {
  if (!relativePath) return undefined;
  const absolute = path.resolve(ROOT, relativePath);
  const data = await fs.readFile(absolute);
  return { inlineData: { mimeType: mimeFor(absolute), data: data.toString("base64") } };
}

async function generate(scene) {
  const prompt = [manifest.continuityLock, scene.prompt].filter(Boolean).join("\n\n");
  const instance = { prompt };
  if (scene.firstFrame) instance.image = await inlineImage(scene.firstFrame);
  if (scene.lastFrame) instance.lastFrame = await inlineImage(scene.lastFrame);

  if (scene.references?.length) {
    instance.referenceImages = [];
    for (const reference of scene.references.slice(0, 3)) {
      instance.referenceImages.push({
        image: await inlineImage(reference),
        referenceType: "asset",
      });
    }
  }

  const body = {
    instances: [instance],
    parameters: {
      aspectRatio: scene.aspectRatio ?? manifest.defaults.aspectRatio,
      durationSeconds: scene.durationSeconds ?? manifest.defaults.durationSeconds,
      resolution: scene.resolution ?? manifest.defaults.resolution,
      personGeneration: "allow_adult",
    },
  };

  const start = await fetch(`${API_BASE}/models/${MODEL}:predictLongRunning`, {
    method: "POST",
    headers: {
      "x-goog-api-key": API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const startJson = await start.json();
  if (!start.ok || !startJson.name) {
    throw new Error(`Veo start failed (${start.status}): ${JSON.stringify(startJson)}`);
  }

  let operation = startJson;
  while (!operation.done) {
    await new Promise((resolve) => setTimeout(resolve, 10_000));
    const poll = await fetch(`${API_BASE}/${operation.name}`, {
      headers: { "x-goog-api-key": API_KEY },
    });
    operation = await poll.json();
    if (!poll.ok) throw new Error(`Veo poll failed (${poll.status}): ${JSON.stringify(operation)}`);
  }

  if (operation.error) {
    throw new Error(`Veo generation failed: ${JSON.stringify(operation.error)}`);
  }

  const uri = operation.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
  if (!uri) throw new Error(`Veo returned no video URI: ${JSON.stringify(operation)}`);

  const videoResponse = await fetch(uri, {
    headers: { "x-goog-api-key": API_KEY },
    redirect: "follow",
  });
  if (!videoResponse.ok) throw new Error(`Video download failed (${videoResponse.status})`);

  const videoPath = path.join(OUTPUT_DIR, `${scene.id}.mp4`);
  await fs.writeFile(videoPath, Buffer.from(await videoResponse.arrayBuffer()));

  const posterPath = path.join(OUTPUT_DIR, `${scene.id}-poster.webp`);
  try {
    await execFileAsync("ffmpeg", [
      "-y", "-i", videoPath, "-frames:v", "1", "-vf", "scale=1600:-2", "-q:v", "5", posterPath,
    ]);
  } catch (error) {
    console.warn(`Poster extraction skipped for ${scene.id}: ${error.message}`);
  }

  console.log(`Generated ${scene.id}: ${videoPath}`);
}

for (const scene of scenes) {
  try {
    await generate(scene);
  } catch (error) {
    console.error(`\n[FAILED] ${scene.id}: ${error.message}`);
    process.exitCode = 1;
    break;
  }
}
