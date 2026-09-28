import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const inputs = [
  "artifacts/nuva-agency/sentinel.json",
  "artifacts/nuva-agency/web-qa.json",
];

function fingerprint(source, name, detail) {
  return createHash("sha256")
    .update([source, name, detail].join(":"))
    .digest("hex")
    .slice(0, 24);
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

function normalize(report, source) {
  if (!report) return [];

  return (report.checks ?? [])
    .filter((check) => check.status === "warning" || check.status === "critical")
    .map((check) => {
      const detail = check.detail ?? check.name;
      const fp = fingerprint(source, check.name, detail);

      return {
        id: `incident-${fp}`,
        fingerprint: fp,
        source,
        name: check.name,
        severity: check.status === "critical" ? "CRITICAL" : "MEDIUM",
        status: "OPEN",
        summary: detail,
        evidence: {
          source,
          observedAt: check.observedAt ?? report.generatedAt,
          check: check.name,
          detail,
          metadata: check.metadata ?? {},
        },
        hypothesis: {
          statement: `The ${source} signal "${check.name}" requires investigation.`,
          confidence: check.status === "critical" ? 0.85 : 0.6,
          nextChecks:
            source === "web-qa"
              ? ["Repeat the failing route check and inspect the latest deployment."]
              : ["Collect an independent correlated signal before remediation."],
        },
        verification: {
          required: true,
          checks: [`repeat:${source}/${check.name}`],
          passed: false,
        },
      };
    });
}

async function main() {
  const reports = await Promise.all(inputs.map(readJson));
  const incidents = [
    ...normalize(reports[0], "sentinel"),
    ...normalize(reports[1], "web-qa"),
  ];

  const unique = new Map();
  for (const incident of incidents) {
    const current = unique.get(incident.fingerprint);
    if (!current) unique.set(incident.fingerprint, incident);
    else {
      current.evidence.correlatedSources = [
        ...(current.evidence.correlatedSources ?? []),
        incident.source,
      ];
    }
  }

  const list = [...unique.values()];
  const bundle = {
    version: "incident-bundle-v1",
    generatedAt: new Date().toISOString(),
    status: list.some((i) => i.severity === "CRITICAL")
      ? "critical"
      : list.length
        ? "warning"
        : "healthy",
    totals: {
      incidents: list.length,
      critical: list.filter((i) => i.severity === "CRITICAL").length,
      warning: list.filter((i) => i.severity === "MEDIUM").length,
    },
    incidents: list,
    safety: {
      productionMutation: false,
      approvalRequiredForHighRisk: true,
      verificationRequired: true,
    },
  };

  await writeFile(
    "artifacts/nuva-agency/incident-bundle.json",
    JSON.stringify(bundle, null, 2),
  );

  console.log(JSON.stringify(bundle, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 2;
});
