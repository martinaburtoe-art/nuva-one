import { afterEach, describe, expect, it, vi } from "vitest";
import { SPECIALISTS } from "../src/lib/agency/specialists.mjs";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const commitSha = "f6d5e628a6b8892531cf1660db9809ef61bf3d7b";
const manifest = {
  name: "nuva-one",
  dependencies: { inngest: "^4.26.2", react: "^19.2.0", "@supabase/supabase-js": "^2.108.2" },
  devDependencies: { vitest: "^4.1.12" },
};

async function runFinanceWithPinnedFiles(sourceFiles) {
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("VERCEL_GIT_COMMIT_SHA", commitSha);

  const fetchMock = vi.fn(async (input) => {
    const url = String(input);
    const path = url.slice(url.indexOf(commitSha) + commitSha.length + 1);
    const content = sourceFiles.get(path);
    return content === undefined
      ? { ok: false, status: 404, text: async () => "" }
      : { ok: true, status: 200, text: async () => content };
  });
  vi.stubGlobal("fetch", fetchMock);

  const result = await SPECIALISTS.finance({
    id: "inngest-source-pin-test",
    agent_id: "finance",
    input_context: { scope: "read-only" },
  });
  return { result, fetchMock };
}

describe("Agency runtime source pinning and lockfile audit", () => {
  it("reads allowlisted files from the exact Vercel commit and identifies real Bun lock drift", async () => {
    const npmLock = {
      packages: {
        "": {
          name: manifest.name,
          dependencies: manifest.dependencies,
          devDependencies: manifest.devDependencies,
        },
      },
    };
    const bunLock = `{
      "lockfileVersion": 1,
      "workspaces": {
        "": {
          "name": "tanstack_start_ts",
          "dependencies": {
            "react": "^19.2.0",
            "legacy-package": "^1.0.0",
          },
          "devDependencies": {
            "vitest": "^4.1.12",
          },
        },
      },
    }`;
    const sourceFiles = new Map([
      ["package.json", JSON.stringify(manifest)],
      ["bun.lock", bunLock],
      ["package-lock.json", JSON.stringify(npmLock)],
    ]);

    const { result, fetchMock } = await runFinanceWithPinnedFiles(sourceFiles);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      `https://raw.githubusercontent.com/martinaburtoe-art/nuva-one/${commitSha}/package.json`,
      `https://raw.githubusercontent.com/martinaburtoe-art/nuva-one/${commitSha}/bun.lock`,
      `https://raw.githubusercontent.com/martinaburtoe-art/nuva-one/${commitSha}/package-lock.json`,
    ]);
    expect(result.result).toBe("WARN");
    expect(result.evidence).toContain("dependencias: 3; devDependencies: 1");
    expect(result.evidence).toContain("package-lock.json root manifest matches package.json");
    expect(result.evidence.some((item) => item.includes("bun.lock root manifest drift"))).toBe(true);
    expect(result.evidence.some((item) => item.includes("tanstack_start_ts != nuva-one"))).toBe(true);
    expect(result.evidence.some((item) => item.includes("missing: inngest"))).toBe(true);
  });

  it("returns PASS when both lockfiles exactly match the pinned package manifest", async () => {
    const npmLock = {
      packages: {
        "": {
          name: manifest.name,
          dependencies: manifest.dependencies,
          devDependencies: manifest.devDependencies,
        },
      },
    };
    const bunLock = {
      lockfileVersion: 1,
      workspaces: {
        "": {
          name: manifest.name,
          dependencies: manifest.dependencies,
          devDependencies: manifest.devDependencies,
        },
      },
    };
    const sourceFiles = new Map([
      ["package.json", JSON.stringify(manifest)],
      ["bun.lock", JSON.stringify(bunLock)],
      ["package-lock.json", JSON.stringify(npmLock)],
    ]);

    const { result } = await runFinanceWithPinnedFiles(sourceFiles);

    expect(result.result).toBe("PASS");
    expect(result.evidence).toContain("package-lock.json root manifest matches package.json");
    expect(result.evidence).toContain("bun.lock root manifest matches package.json");
  });
});
