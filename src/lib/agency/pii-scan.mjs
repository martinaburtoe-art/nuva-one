import { readdir, readFile, lstat } from "node:fs/promises";
import { extname } from "node:path";

const TEXT_EXTENSIONS = new Set([".json", ".md", ".txt", ".log"]);
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const RUT_PATTERN = /(?<![\d])(?:\d{1,2}\.?)?\d{3}\.\d{3}-?[\dkK](?![\dkK])/g;

export function isValidChileanRut(value) {
  const normalized = String(value).replace(/[^\dkK]/gi, "").toUpperCase();
  if (!/^\d{7,8}[\dK]$/.test(normalized)) return false;
  const body = normalized.slice(0, -1);
  const suppliedDv = normalized.slice(-1);
  let multiplier = 2;
  let sum = 0;
  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  const expectedDv = remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);
  return suppliedDv === expectedDv;
}

export function scanPiiText(content) {
  const text = String(content);
  const emailMatches = [...text.matchAll(EMAIL_PATTERN)].length;
  const rutCandidates = text.match(RUT_PATTERN) ?? [];
  const rutMatches = rutCandidates.filter(isValidChileanRut).length;
  return { emailMatches, rutMatches, totalMatches: emailMatches + rutMatches };
}

async function walk(directory, state, limits, depth = 0) {
  if (depth > limits.maxDepth || state.scannedFiles >= limits.maxFiles) {
    state.truncated = true;
    return;
  }
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") state.missingDirectories += 1;
    else state.unreadableDirectories += 1;
    return;
  }
  for (const entry of entries) {
    if (state.scannedFiles >= limits.maxFiles) {
      state.truncated = true;
      break;
    }
    if (entry.name.startsWith(".") || entry.isSymbolicLink()) continue;
    const path = directory + "/" + entry.name;
    if (entry.isDirectory()) {
      await walk(path, state, limits, depth + 1);
      continue;
    }
    if (!entry.isFile() || !TEXT_EXTENSIONS.has(extname(entry.name).toLowerCase())) continue;
    try {
      const metadata = await lstat(path);
      if (metadata.size > limits.maxFileBytes) {
        state.skippedLargeFiles += 1;
        continue;
      }
      const matches = scanPiiText(await readFile(path, "utf8"));
      state.scannedFiles += 1;
      if (matches.totalMatches > 0) {
        state.filesWithFindings += 1;
        state.emailMatches += matches.emailMatches;
        state.rutMatches += matches.rutMatches;
      }
    } catch {
      state.unreadableFiles += 1;
    }
  }
}

export async function scanPiiDirectories(directories, options = {}) {
  const limits = {
    maxFiles: Number.isInteger(options.maxFiles) ? Math.max(1, options.maxFiles) : 250,
    maxDepth: Number.isInteger(options.maxDepth) ? Math.max(1, options.maxDepth) : 5,
    maxFileBytes: Number.isInteger(options.maxFileBytes) ? Math.max(1024, options.maxFileBytes) : 1_000_000,
  };
  const state = {
    scannedFiles: 0,
    filesWithFindings: 0,
    emailMatches: 0,
    rutMatches: 0,
    missingDirectories: 0,
    unreadableDirectories: 0,
    unreadableFiles: 0,
    skippedLargeFiles: 0,
    truncated: false,
  };
  for (const directory of directories) {
    if (typeof directory === "string" && directory.trim()) await walk(directory, state, limits);
  }
  const hasFindings = state.filesWithFindings > 0;
  const incomplete = state.scannedFiles === 0 || state.missingDirectories > 0
    || state.unreadableDirectories > 0 || state.unreadableFiles > 0
    || state.skippedLargeFiles > 0 || state.truncated;
  const status = hasFindings ? "FAIL" : state.scannedFiles === 0 ? "UNKNOWN" : incomplete ? "WARN" : "PASS";
  return { ...state, status };
}
