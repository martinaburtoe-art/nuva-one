import { readFile } from "node:fs/promises";

const requiredFiles = [
  "docs/NUVA_AGENCY_ARCHITECTURE.md",
  "docs/nuva-agency/AGENT_POLICY.md",
  "src/lib/agency/types.ts",
  "src/lib/agency/policy.ts",
  "src/lib/agency/policy.test.ts",
  "src/lib/agency/registry.ts",
  "src/lib/agency/incident.ts",
  "src/lib/agency/incident.test.ts",
  "scripts/nuva-agency-sentinel.mjs",
  "scripts/nuva-agency-web-qa.mjs",
  "scripts/nuva-agency-correlate.mjs",
  "scripts/nuva-agency-persist-incidents.mjs",
  ".github/workflows/nuva-agency-verify.yml",
  ".github/workflows/nuva-agency-sentinel.yml",
  ".github/workflows/nuva-agency-web-qa.yml",
];

const checks = [];

async function file(path) {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

function check(name, passed, detail) {
  checks.push({ name, passed, detail });
}

async function main() {
  const contents = new Map();

  for (const path of requiredFiles) {
    const value = await file(path);
    contents.set(path, value);
    check(
      `file:${path}`,
      value !== null,
      value === null ? "Required agency file is missing" : "Present",
    );
  }

  const policy = contents.get("docs/nuva-agency/AGENT_POLICY.md") ?? "";
  const sentinel = contents.get("scripts/nuva-agency-sentinel.mjs") ?? "";
  const workflow = contents.get(".github/workflows/nuva-agency-sentinel.yml") ?? "";
  const verify = contents.get(".github/workflows/nuva-agency-verify.yml") ?? "";
  const packageJson = JSON.parse((await file("package.json")) ?? "{}");

  check(
    "policy:production-mutation-disabled",
    /production mutation|production.*mutation/i.test(policy) &&
      /disabled|not enabled|no production/i.test(policy),
    "Policy must explicitly keep production mutation gated.",
  );

  check(
    "sentinel:observe-only",
    /observe-only|production mutations.*disabled|no production mutation/i.test(
      workflow + sentinel,
    ),
    "Sentinel workflow must remain observe-only.",
  );

  check(
    "sentinel:no-hardcoded-secret",
    !/service_role|eyJhbGciOiJIUzI1NiJ9/.test(sentinel),
    "Sentinel must not contain a service-role credential.",
  );

  check(
    "verify:typecheck",
    /npm run typecheck/.test(verify),
    "Agency verification must run TypeScript checks.",
  );

  check(
    "verify:lint",
    /npm run lint/.test(verify),
    "Agency verification must run lint.",
  );

  check(
    "verify:tests",
    /npm test -- --run/.test(verify),
    "Agency verification must run tests.",
  );

  check(
    "verify:audit",
    /npm audit --audit-level=high/.test(verify),
    "Agency verification must run dependency security audit.",
  );

  for (const script of [
    "agency:sentinel",
    "agency:qa",
    "agency:correlate",
    "agency:persist",
  ]) {
    check(
      `package-script:${script}`,
      typeof packageJson.scripts?.[script] === "string",
      `package.json exposes ${script}`,
    );
  }

  const passed = checks.filter((item) => item.passed).length;
  const failed = checks.length - passed;
  const report = {
    version: "agency-certification-v1",
    generatedAt: new Date().toISOString(),
    status: failed === 0 ? "CERTIFIED" : "BLOCKED",
    score: Math.round((passed / checks.length) * 100),
    totals: { checks: checks.length, passed, failed },
    checks,
    certificationScope: [
      "control-plane structure",
      "agent policy presence",
      "sentinel safety posture",
      "web QA presence",
      "incident correlation",
      "incident persistence path",
      "CI verification gates",
      "secret isolation",
    ],
    exclusions: [
      "A passing structural gate does not certify third-party account settings.",
      "Production autonomous mutation remains disabled by design.",
      "A CI run must be observed before claiming runtime certification.",
    ],
  };

  console.log(JSON.stringify(report, null, 2));
  if (failed > 0) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 2;
});
