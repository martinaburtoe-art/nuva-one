import { afterEach, describe, expect, it, vi } from "vitest";
import { SPECIALISTS } from "../src/lib/agency/specialists.mjs";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("Agency runtime source pinning", () => {
  it("reads allowlisted files from the exact Vercel commit before local bundle artifacts", async () => {
    const commitSha = "e3a022b45ff44459ed07e72428b52c62fd697335";
    const sourceFiles = new Map([
      ["package.json", JSON.stringify({
        dependencies: { inngest: "^4.26.2", react: "^19.2.0", "@supabase/supabase-js": "^2.108.2" },
        devDependencies: { vitest: "^4.1.12" },
      })],
      ["bun.lock", "{ \"lockfileVersion\": 1 }"],
      ["package-lock.json", "{ \"lockfileVersion\": 3 }"],
    ]);

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

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      `https://raw.githubusercontent.com/martinaburtoe-art/nuva-one/${commitSha}/package.json`,
      `https://raw.githubusercontent.com/martinaburtoe-art/nuva-one/${commitSha}/bun.lock`,
      `https://raw.githubusercontent.com/martinaburtoe-art/nuva-one/${commitSha}/package-lock.json`,
    ]);
    expect(result.evidence).toContain("dependencias: 3; devDependencies: 1");
    expect(result.evidence.some((item) => item.includes("package.json leído") && !item.includes("142 bytes"))).toBe(true);
  });
});
