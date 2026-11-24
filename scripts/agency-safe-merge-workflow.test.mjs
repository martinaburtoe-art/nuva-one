import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

const workflow = await readFile(
  new URL("../.github/workflows/nuva-agency-safe-merge.yml", import.meta.url),
  "utf8",
);

describe("Agency safe-merge workflow eligibility", () => {
  it("does not report an independent safety success for ordinary pull requests", () => {
    expect(workflow).toContain(
      "if: \${{ github.event_name != 'pull_request' || startsWith(github.head_ref, 'agent/agency-') }}",
    );
  });
});
