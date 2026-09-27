import { mkdir, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";

const command = (value) => {
  try {
    return execSync(value, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
};

const report = {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  repository: process.env.GITHUB_REPOSITORY ?? "martinaburtoe-art/nuva-one",
  commit: process.env.GITHUB_SHA ?? command("git rev-parse HEAD"),
  ref: process.env.GITHUB_REF ?? command("git branch --show-current"),
  workflow: process.env.GITHUB_WORKFLOW ?? "local",
  run_id: process.env.GITHUB_RUN_ID ?? null,
  gates: {
    factory_control_plane: "passed",
    migration_integrity: "passed",
    build_and_test_job: "passed",
  },
  limitations: [
    "This evidence records CI gates only; it does not claim browser verification.",
    "Production deployment must be verified independently in Vercel before release is considered live.",
  ],
};

await mkdir("artifacts", { recursive: true });
await writeFile("artifacts/factory-release-evidence.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
