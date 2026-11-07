import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = readFileSync("src/routes/api/owner/agency-control.ts", "utf8");
const edge = readFileSync("supabase/functions/nuva-agency-worker-control/index.ts", "utf8");

describe("Agency empty-queue behavior", () => {
  it("returns idle when the durable queue has no task instead of manufacturing a cycle", () => {
    expect(route).toContain("return Response.json({ claimed: initialData ?? null });");
    expect(edge).toContain("return json({ claimed: initialData ?? null });");
    expect(route).not.toContain("Autonomous ${workerAgentId} cycle");
    expect(edge).not.toContain("Autonomous ${auth.agentId} cycle");
  });
});
