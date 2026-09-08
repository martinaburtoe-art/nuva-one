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
const requested = only.length
  ? manifest.scenes.filter((scene) => only.includes(scene.id) || only.includes(scene.number))
  : manifest.scenes;

if (!requested.length) {
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

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function inlineImage(relativePath) {
  if (!relativePath) return undefined;
  const absolute = path.resolve(ROOT, relativePath);
  const data = await fs.readFile(absolute);
  return { inlineData: { mimeType: mimeFor(absolute), data: data.toString("base64") } };
}

async function generate(scene, fallbackFirstFrame) {
  const firstFrame = scene.firstFrame || fallbackFirstFrame;
  const prompt = [
    manifest.continuityLock,
    "CONTINUITY RULE: if a start frame is supplied, preserve its location, subject identity, wardrobe, camera direction, lighting and physical objects. Begin from that exact visual state and continue the action naturally; do not redesign the scene.",
    scene.prompt,
  ].filter(Boolean).join("\n\n");

  const instance = { prompt };
  if (firstFrame) instance.image = await inlineImage(firstFrame);
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
      personGeneration: manifest.defaults.personGeneration ?? "allow_adult",
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
  const videoBytes = Buffer.from(await videoResponse.arrayBuffer());
  if (videoBytes.length < 100_000) {
    throw new Error(`Video download for ${scene.id} is unexpectedly small (${videoBytes.length} bytes)`);
  }
  await fs.writeFile(videoPath, videoBytes);

  const posterPath = path.join(OUTPUT_DIR, `${scene.id}-poster.webp`);
  const lastFramePath = path.join(OUTPUT_DIR, `${scene.id}-last.webp`);
  await execFileAsync("ffmpeg", [
    "-y", "-i", videoPath, "-frames:v", "1", "-vf", "scale=1600:-2", "-q:v", "5", posterPath,
  ]);
  await execFileAsync("ffmpeg", [
    "-y", "-sseof", "-0.15", "-i", videoPath, "-frames:v", "1", "-vf", "scale=1600:-2", "-q:v", "5", lastFramePath,
  ]);

  console.log(`Generated ${scene.id}: ${videoPath}`);
  return `public/home-cinematic/${scene.id}-last.webp`;
}

for (const scene of requested) {
  const index = manifest.scenes.findIndex((candidate) => candidate.id === scene.id);
  const previous = index > 0 ? manifest.scenes[index - 1] : null;
  const previousLastFrame = previous ? `public/home-cinematic/${previous.id}-last.webp` : undefined;
  const fallbackFirstFrame = previousLastFrame && (await exists(path.resolve(ROOT, previousLastFrame)))
    ? previousLastFrame
    : undefined;

  try {
    await generate(scene, fallbackFirstFrame);
  } catch (error) {
    console.error(`\n[FAILED] ${scene.id}: ${error.message}`);
    process.exitCode = 1;
    break;
  }
}
