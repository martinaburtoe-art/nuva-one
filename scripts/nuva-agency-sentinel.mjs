import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

const productionUrl = (process.env.NUVA_PRODUCTION_URL ?? "https://nuva-one.vercel.app").replace(/\/$/, "");
const githubRepo = process.env.GITHUB_REPOSITORY ?? "martinaburtoe-art/nuva-one";
const githubToken = process.env.GITHUB_TOKEN;
const supabaseUrl = process.env.NUVA_SUPABASE_URL?.replace(/\/$/, "");
const supabaseAnonKey = process.env.NUVA_SUPABASE_ANON_KEY;
const timeoutMs = Number(process.env.NUVA_SENTINEL_TIMEOUT_MS ?? 12_000);

const checks = [];

function fingerprint(input) {
  return createHash("sha256").update(input).digest("hex").slice(0, 24);
}

async function request(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      redirect: "follow",
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

function record(check) {
  checks.push({
    ...check,
    fingerprint: fingerprint(
      [check.source, check.name, check.status, check.detail ?? ""].join(":"),
    ),
    observedAt: new Date().toISOString(),
  });
}

async function checkProduction() {
  const started = Date.now();

  try {
    const response = await request(productionUrl);
    const durationMs = Date.now() - started;
    const ok = response.status >= 200 && response.status < 500;

    record({
      source: "vercel",
      name: "production_http",
      status: ok ? "healthy" : "critical",
      httpStatus: response.status,
      durationMs,
      detail: ok
        ? `Production responded with HTTP ${response.status}`
        : `Production returned HTTP ${response.status}`,
    });
  } catch (error) {
    record({
      source: "vercel",
      name: "production_http",
      status: "critical",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

async function checkGithubActions() {
  if (!githubToken) {
    record({
      source: "github",
      name: "actions_health",
      status: "skipped",
      detail: "GITHUB_TOKEN is not available",
    });
    return;
  }

  try {
    const response = await request(
      `https://api.github.com/repos/${githubRepo}/actions/runs?branch=main&per_page=10`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${githubToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "nuva-agency-sentinel",
        },
      },
    );

    if (!response.ok) {
      record({
        source: "github",
        name: "actions_health",
        status: "warning",
        httpStatus: response.status,
        detail: "GitHub Actions API did not return a successful response",
      });
      return;
    }

    const payload = await response.json();
    const runs = Array.isArray(payload.workflow_runs) ? payload.workflow_runs : [];
    const recentFailures = runs.filter(
      (run) => run.conclusion === "failure" || run.conclusion === "timed_out",
    );

    record({
      source: "github",
      name: "actions_health",
      status: recentFailures.length > 0 ? "warning" : "healthy",
      detail:
        recentFailures.length > 0
          ? `${recentFailures.length} recent failed/timed-out workflow runs detected`
          : "No recent failed or timed-out workflow runs detected",
      recentRunCount: runs.length,
      recentFailureCount: recentFailures.length,
      latestRun: runs[0]
        ? {
            name: runs[0].name,
            status: runs[0].status,
            conclusion: runs[0].conclusion,
            sha: runs[0].head_sha,
          }
        : null,
    });
  } catch (error) {
    record({
      source: "github",
      name: "actions_health",
      status: "warning",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

async function checkSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) {
    record({
      source: "supabase",
      name: "rest_health",
      status: "skipped",
      detail: "NUVA_SUPABASE_URL or NUVA_SUPABASE_ANON_KEY is not configured",
    });
    return;
  }

  try {
    const response = await request(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    });

    record({
      source: "supabase",
      name: "rest_health",
      status: response.ok ? "healthy" : "warning",
      httpStatus: response.status,
      detail: response.ok
        ? "Supabase REST endpoint is reachable"
        : "Supabase REST endpoint returned a non-success response",
    });
  } catch (error) {
    record({
      source: "supabase",
      name: "rest_health",
      status: "warning",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

function buildSummary() {
  const critical = checks.filter((check) => check.status === "critical").length;
  const warning = checks.filter((check) => check.status === "warning").length;
  const healthy = checks.filter((check) => check.status === "healthy").length;
  const skipped = checks.filter((check) => check.status === "skipped").length;

  return {
    version: "sentinel-v1",
    generatedAt: new Date().toISOString(),
    environment: "production-observation",
    repository: githubRepo,
    productionUrl,
    totals: {
      checks: checks.length,
      healthy,
      warning,
      critical,
      skipped,
    },
    status: critical > 0 ? "critical" : warning > 0 ? "warning" : "healthy",
    checks,
    incidentFingerprints: [
      ...new Set(
        checks
          .filter((check) => check.status === "critical" || check.status === "warning")
          .map((check) => check.fingerprint),
      ),
    ],
  };
}

async function main() {
  await Promise.all([checkProduction(), checkGithubActions(), checkSupabase()]);

  const summary = buildSummary();
  await mkdir("artifacts/nuva-agency", { recursive: true });
  await writeFile(
    "artifacts/nuva-agency/sentinel.json",
    JSON.stringify(summary, null, 2),
  );

  console.log(JSON.stringify(summary, null, 2));

  if (summary.status === "critical") {
    process.exitCode = 2;
  } else if (summary.status === "warning") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 2;
});
