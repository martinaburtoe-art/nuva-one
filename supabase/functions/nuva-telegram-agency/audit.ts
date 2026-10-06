import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

type Evidence = {
  source: string;
  status: "pass" | "warn" | "fail";
  summary: string;
  details?: Record<string, unknown>;
  checked_at: string;
};

const now = () => new Date().toISOString();

async function githubEvidence(): Promise<Evidence> {
  const checked_at = now();
  const base = "https://api.github.com/repos/martinaburtoe-art/nuva-one";
  const headers = {
    accept: "application/vnd.github+json",
    "user-agent": "nuva-agency-health-check",
    "x-github-api-version": "2022-11-28",
  };

  try {
    const [repoResponse, commitsResponse, prsResponse, runsResponse] = await Promise.all([
      fetch(base, { headers }),
      fetch(base + "/commits?sha=main&per_page=3", { headers }),
      fetch(base + "/pulls?state=open&per_page=10", { headers }),
      fetch(base + "/actions/runs?branch=main&per_page=10", { headers }),
    ]);

    if (![repoResponse, commitsResponse, prsResponse, runsResponse].every((r) => r.ok)) {
      return { source: "github", status: "warn", summary: "GitHub API respondió parcialmente o sin autorización.", checked_at };
    }

    const repo = await repoResponse.json();
    const commits = await commitsResponse.json();
    const prs = await prsResponse.json();
    const runs = await runsResponse.json();
    const latestRuns = (runs.workflow_runs ?? []).slice(0, 10);

    return {
      source: "github",
      status: latestRuns.some((run: any) => run.conclusion === "failure") ? "warn" : "pass",
      summary: "GitHub conectado; main=" + repo.default_branch + ", PR abiertos=" + prs.length + ", workflows recientes=" + latestRuns.length + ".",
      details: {
        default_branch: repo.default_branch,
        latest_commit: commits?.[0]?.sha ?? null,
        latest_commit_message: commits?.[0]?.commit?.message ?? null,
        open_prs: prs.map((pr: any) => ({ number: pr.number, title: pr.title, head: pr.head?.ref, url: pr.html_url })),
        recent_workflows: latestRuns.map((run: any) => ({
          name: run.name,
          status: run.status,
          conclusion: run.conclusion,
          run_number: run.run_number,
          url: run.html_url,
        })),
      },
      checked_at,
    };
  } catch (error) {
    return { source: "github", status: "fail", summary: "No fue posible consultar GitHub.", details: { error: error instanceof Error ? error.message : "unknown" }, checked_at };
  }
}

async function supabaseEvidence(db: SupabaseClient): Promise<Evidence> {
  const checked_at = now();
  try {
    const tables = [
      "ops_agent_learning",
      "ops_incidents",
      "ops_findings",
      "ops_metrics_hourly",
      "ops_anomalies",
      "ops_llm_usage",
      "owner_telegram_sessions",
    ];

    const counts = await Promise.all(tables.map(async (table) => {
      const { count, error } = await db.from(table).select("*", { count: "exact", head: true });
      return { table, count: count ?? 0, error: error?.message ?? null };
    }));

    let integrity: unknown = null;
    const integrityResult = await db.rpc("nuva_core_integrity_audit");
    if (!integrityResult.error) integrity = integrityResult.data;

    const failures = counts.filter((item) => item.error);
    return {
      source: "supabase",
      status: failures.length ? "warn" : "pass",
      summary: failures.length
        ? "Supabase conectado con " + failures.length + " consulta(s) no disponibles."
        : "Supabase conectado; tablas operacionales y auditoría de integridad consultadas.",
      details: { counts, integrity },
      checked_at,
    };
  } catch (error) {
    return { source: "supabase", status: "fail", summary: "No fue posible completar la auditoría Supabase.", details: { error: error instanceof Error ? error.message : "unknown" }, checked_at };
  }
}

async function vercelEvidence(): Promise<Evidence> {
  const checked_at = now();
  const publicUrl = "https://nuva-one.vercel.app";
  const started = Date.now();
  try {
    const response = await fetch(publicUrl, { redirect: "follow" });
    const latency_ms = Date.now() - started;
    const details: Record<string, unknown> = {
      url: publicUrl,
      http_status: response.status,
      latency_ms,
      final_url: response.url,
    };

    const token = Deno.env.get("VERCEL_TOKEN")?.trim();
    const projectId = Deno.env.get("VERCEL_PROJECT_ID")?.trim();
    if (token && projectId) {
      const api = await fetch("https://api.vercel.com/v9/projects/" + encodeURIComponent(projectId), {
        headers: { authorization: "Bearer " + token },
      });
      details.vercel_api = api.ok ? "connected" : "http_" + api.status;
    } else {
      details.vercel_api = "not_configured";
    }

    return {
      source: "vercel",
      status: response.ok ? "pass" : "warn",
      summary: response.ok ? "Producción respondió HTTP " + response.status + "." : "Producción respondió HTTP " + response.status + "; requiere revisión.",
      details,
      checked_at,
    };
  } catch (error) {
    return { source: "vercel", status: "fail", summary: "No fue posible alcanzar producción.", details: { error: error instanceof Error ? error.message : "unknown" }, checked_at };
  }
}

async function providerEvidence(
  providers: string[],
  generate: (provider: string, prompt: string) => Promise<{ text: string; model: string }>,
): Promise<Evidence> {
  const checked_at = now();
  const results: Record<string, unknown>[] = [];
  for (const provider of providers) {
    const started = Date.now();
    try {
      const result = await generate(provider, "Return exactly: NÜVA_HEALTH_OK");
      results.push({ provider, status: "pass", model: result.model, latency_ms: Date.now() - started, response_ok: result.text.trim() === "NÜVA_HEALTH_OK" });
    } catch (error) {
      results.push({ provider, status: "fail", latency_ms: Date.now() - started, error: error instanceof Error ? error.message : "unknown" });
    }
  }

  const failed = results.filter((item) => item.status === "fail").length;
  return {
    source: "ai_providers",
    status: failed ? "warn" : "pass",
    summary: failed ? failed + " proveedor(es) no superaron la prueba live." : results.length + " proveedor(es) superaron la prueba live.",
    details: { results },
    checked_at,
  };
}

export async function runHealthAudit(
  db: SupabaseClient,
  providers: string[],
  generate: (provider: string, prompt: string) => Promise<{ text: string; model: string }>,
) {
  const started = Date.now();
  const [github, supabase, vercel, ai] = await Promise.all([
    githubEvidence(),
    supabaseEvidence(db),
    vercelEvidence(),
    providerEvidence(providers, generate),
  ]);

  const evidence = [github, supabase, vercel, ai];
  const failures = evidence.filter((item) => item.status === "fail").length;
  const warnings = evidence.filter((item) => item.status === "warn").length;
  const status = failures ? "FAIL" : warnings ? "WARN" : "PASS";

  const audit = {
    protocol: "AUDIT_HEALTH_CHECK",
    status,
    duration_ms: Date.now() - started,
    checked_at: now(),
    evidence,
  };

  const { error: persistError } = await db.from("ops_agent_audit_runs").insert({
    protocol: audit.protocol,
    status: audit.status,
    duration_ms: audit.duration_ms,
    evidence: audit.evidence,
  });

  return {
    ...audit,
    persisted: !persistError,
    persistence_error: persistError?.message ?? null,
  };
}
