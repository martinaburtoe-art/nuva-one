// hermes-repo-map.mjs — Repository Intelligence para Hermes Engineering
// Escanea el repositorio Nüva One y produce un mapa compacto de archivos,
// símbolos (funciones, clases, tipos, exports) y dependencias entre archivos.
// Diseñado para dar a Hermes comprensión estructurada del código sin
// instalar dependencias adicionales (usa solo Node.js stdlib).
//
// Uso: node scripts/hermes-repo-map.mjs [raiz] [salida.json]
//   raiz:    directorio a escanear (por defecto: .)
//   salida:  archivo JSON de salida (por defecto: docs/hermes-engineering/repo-map.json)

import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"];
const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  ".turbo",
  "coverage",
  ".vscode",
  ".idea",
  "logs",
  "supabase",
]);
const IGNORE_FILES = new Set([".gitignore", ".eslintignore", ".prettierrc", "package-lock.json"]);

const MAX_SYMBOLS_PER_FILE = 60;
const MAX_FILES = 2000;

// ---------- Symbol extraction (regex-based, no Tree-sitter) ----------

const SYMBOL_PATTERNS = [
  // export function / function declaration
  { kind: "function", re: /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z$_][\w$]*)/g },
  // export const / let / var with arrow or value
  { kind: "constant", re: /(?:export\s+)?(?:const|let|var)\s+([A-Za-z$_][\w$]*)\s*[:=]/g },
  // class declaration
  { kind: "class", re: /(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z$_][\w$]*)/g },
  // type / interface declaration
  { kind: "type", re: /(?:export\s+)?(?:type|interface|enum)\s+([A-Za-z$_][\w$]*)/g },
  // method inside class (simplified)
  { kind: "method", re: /^\s*(?:async\s+)?([A-Za-z$_][\w$]*)\s*\([^)]*\)\s*\{/gm },
];

function extractSymbols(text) {
  const symbols = [];
  for (const { kind, re } of SYMBOL_PATTERNS) {
    let match;
    re.lastIndex = 0;
    while ((match = re.exec(text)) !== null) {
      if (symbols.length >= MAX_SYMBOLS_PER_FILE) break;
      symbols.push({ kind, name: match[1] });
    }
  }
  return symbols;
}

// ---------- Import/export dependency extraction ----------

const IMPORT_PATTERNS = [
  // import ... from "..." / import "..."
  /(?:import\s+(?:[^"']*from\s+)?)["']([^"']+)["']/g,
  // export ... from "..."
  /export\s+.*?from\s+["']([^"']+)["']/g,
  // dynamic import("...")
  /import\s*\(\s*["']([^"']+)["']\s*\)/g,
];

function extractDependencies(text) {
  const deps = new Set();
  for (const re of IMPORT_PATTERNS) {
    let match;
    re.lastIndex = 0;
    while ((match = re.exec(text)) !== null) {
      const raw = match[1];
      if (!raw || raw.startsWith(".") || raw.startsWith("/")) {
        // relative import — resolve later
        deps.add({ type: "relative", target: raw });
      } else if (!raw.startsWith("@") && !raw.includes("/")) {
        // bare package
        deps.add({ type: "package", target: raw });
      } else if (raw.startsWith("@")) {
        const slash = raw.indexOf("/");
        const scope = slash > 0 ? raw.slice(0, slash) : raw;
        deps.add({ type: "scoped-package", target: scope });
      }
    }
  }
  return Array.from(deps);
}

// ---------- File walking ----------

async function walkDir(dir, baseDir, fileList = []) {
  if (fileList.length >= MAX_FILES) return fileList;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (fileList.length >= MAX_FILES) break;
    if (entry.name.startsWith(".") && entry.name !== ".env.example") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      await walkDir(full, baseDir, fileList);
    } else if (entry.isFile()) {
      const ext = entry.name.slice(entry.name.lastIndexOf("."));
      if (!EXTENSIONS.includes(ext)) continue;
      if (IGNORE_FILES.has(entry.name)) continue;
      fileList.push(full);
    }
  }
  return fileList;
}

// ---------- Symbol cross-referencing (definición vs uso) ----------

function buildSymbolCrossRef(files, symbolIndex) {
  const crossRef = new Map(); // symbolName -> { definedIn: [file], usedIn: [file] }
  for (const [symName, definingFiles] of symbolIndex) {
    const usedIn = [];
    for (const file of files) {
      if (definingFiles.includes(file.path)) continue; // ya está en definedIn
      const symText = file.symbols.map((s) => s.name).join(" ");
      const importsText = (file.dependencies || []).join(" ");
      const combined = symText + " " + importsText;
      const wordRegex = new RegExp(`\\b${symName.replace(/[.*+?^${}()|[\]\\\\]/g, "\\$&")}\\b`);
      if (wordRegex.test(combined)) {
        usedIn.push(file.path);
      }
    }
    crossRef.set(symName, { definedIn: definingFiles, usedIn });
  }
  return crossRef;
}

// ---------- Main ----------

async function main() {
  const root = process.argv[2] || ".";
  const outputPath = process.argv[3] || "docs/hermes-engineering/repo-map.json";

  const filePaths = await walkDir(root, root);
  const files = [];
  const symbolIndex = new Map(); // symbolName -> [file, ...]
  const depGraph = new Map(); // file -> [depFile, ...]

  for (const filePath of filePaths) {
    let text;
    try {
      text = await readFile(filePath, "utf8");
    } catch {
      continue;
    }

    const relPath = relative(root, filePath).split(sep).join("/");
    const symbols = extractSymbols(text);
    const rawDeps = extractDependencies(text);

    // Register symbols for cross-file lookup
    for (const sym of symbols) {
      if (!symbolIndex.has(sym.name)) symbolIndex.set(sym.name, []);
      symbolIndex.get(sym.name).push(relPath);
    }

    files.push({
      path: relPath,
      size: text.length,
      lines: text.split(/\r?\n/).length,
      symbols,
      rawDependencies: rawDeps.map((d) => d.target),
      dependencyTypes: rawDeps.map((d) => d.type),
    });
  }

// Build symbol cross-reference: definition vs usage across files
  const symbolCrossRef = buildSymbolCrossRef(files, symbolIndex);
  const crossRefList = Array.from(symbolCrossRef.entries()).map(([name, ref]) => ({
    symbol: name,
    definedIn: ref.definedIn,
    usedIn: ref.usedIn,
  }));
    // Build dependency graph: match relative imports to actual files
  const fileSet = new Set(files.map((f) => f.path));
  const possibleExtensions = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", "/index.ts", "/index.tsx", "/index.js", "/index.jsx"];

  for (const file of files) {
    const resolvedDeps = [];
    for (const raw of file.rawDependencies) {
      if (raw.startsWith(".") || raw.startsWith("/")) {
        // Resolve relative import from the file's directory
        const fileDir = relative(root, join(root, file.path).replace(/[^/\\]*$/, ""));
        let resolved = null;
        for (const ext of possibleExtensions) {
          const candidate = (fileDir ? fileDir + "/" : "") + raw.replace(/^\.\//, "") + ext;
          if (fileSet.has(candidate)) {
            resolved = candidate;
            break;
          }
        }
        if (resolved && resolved !== file.path) resolvedDeps.push(resolved);
      }
    }
    file.dependencies = resolvedDeps;
    depGraph.set(file.path, resolvedDeps);
    // Clean up raw fields from output
    delete file.rawDependencies;
    delete file.dependencyTypes;
  }

  // Identify entry points and key modules
  const entryPoints = files.filter((f) =>
    f.path.includes("main") || f.path.includes("App") || f.path.includes("routes") || f.path.endsWith(".server.ts")
  );
  const symbolFiles = files.filter((f) => f.symbols.length > 0);

  const map = {
    generatedAt: new Date().toISOString(),
    root,
    summary: {
      totalFilesScanned: files.length,
      filesWithSymbols: symbolFiles.length,
      totalSymbols: files.reduce((acc, f) => acc + f.symbols.length, 0),
      totalDependencies: files.reduce((acc, f) => acc + f.dependencies.length, 0),
    },
    entryPoints: entryPoints.map((f) => f.path),
    symbolCrossRef: crossRefList,
    files,
  };

  // Write output
  const outDir = outputPath.split("/").slice(0, -1).join("/");
  if (outDir) {
    try {
      await mkdir(outDir, { recursive: true });
    } catch {
      // dir may already exist
    }
  }
  await writeFile(outputPath, JSON.stringify(map, null, 2));
  console.log(JSON.stringify({
    status: "ok",
    output: outputPath,
    summary: map.summary,
    entryPoints: map.entryPoints.slice(0, 10),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
