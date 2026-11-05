import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const workflow = await readFile(
  new URL("../.github/workflows/nuva-agent-durable-worker.yml", import.meta.url),
  "utf8",
);

describe("durable worker OIDC contract", () => {
  it("requests a fresh GitHub OIDC token for every heartbeat and finish call", () => {
    const refreshes = workflow.match(/jq -er \.value/g) ?? [];
    const freshHeaders = workflow.match(/X-Agency-OIDC-Token: \$oidc/g) ?? [];
    const claimOnlyStaticHeaders = workflow.match(/X-Agency-OIDC-Token: \$AGENCY_OIDC_TOKEN/g) ?? [];

    expect(refreshes).toHaveLength(6);
    expect(freshHeaders).toHaveLength(6);
    expect(claimOnlyStaticHeaders).toHaveLength(1);
  });

  it("requires finish_task to return an explicit ok=true body", () => {
    expect(workflow).toContain("if ! jq -e '.ok == true' \"$response_file\" >/dev/null; then");
  });
});
