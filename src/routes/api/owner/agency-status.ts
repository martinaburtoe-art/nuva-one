import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";
import type { Database } from "@/integrations/supabase/types";

const REPO = "martinaburtoe-art/nuva-one";
const AGENCY_WORKFLOWS = [
  "nuva-agent-builder.yml",
  "nuva-agency-sentinel.yml",
  "nuva-agency-verify.yml",
  "nuva-agency-web-qa.yml",
  "nuva-agency-autonomous-repair.yml",
  "nuva-agency-autonomous-merge.yml",
  "nuva-agency-safe-merge.yml",
  "nuva-agent-health.yml",
];

type GitHubRun = {
  id: number;
  name?: string | null;
  workflow_id?: number;
  status?: string | null;
  conclusion?: string | null;
  html_url?: string;
  created_at?: string;
  updated_at?: string;
  run_started_at?: string | null;
  head_sha?: string;
};

type GitHubJob = {
  id: number;
  name?: string | null;
  status?: string | null;
  conclusion?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  html_url?: string;
  steps?: Array<{
    name?: string;
    status?: string;
    conclusion?: string | null;
    number?: number;
    started_at?: string | null;
    completed_at?: string | null;
  }>;
};

async function github(path: string) {
  const token = process.env.GITHUB_TOKEN;
  const response = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status}`);
  return response.json();
}

async function ownerCheck(request: Request) {
  const { url, anonKey, ok } = getServerSupabaseEnv();
  if (!ok) return { ok: false as const, status: 500, error: "Configuración de Supabase incompleta" };
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!token) return { ok: false as const, status: 401, error: "No autenticado" };

  const client = createClient<Database>(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return { ok: false as const, status: 401, error: "Sesión inválida o expirada" };
  if (data.user.app_metadata?.platform_role !== "owner") {
    return { ok: false as const, status: 403, error: "AGENCY_ACCESS_DENIED" };
  }
  return { ok: true as const };
}

function deriveAgent(run: GitHubRun) {
  const name = (run.name ?? "").toLowerCase();
  if (name.includes("builder") || name.includes("constructor")) return "constructor";
  if (name.includes("sentinel")) return "sentinel";
  if (name.includes("web qa")) return "ux";
  if (name.includes("repair")) return "qa";
  if (name.includes("merge") || name.includes("verify") || name.includes("safe")) return "release";
  return "orchestrator";
}

export const Route = createFileRoute("/api/owner/agency-status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await ownerCheck(request);
        if (!auth.ok) return new Response(JSON.stringify({ error: auth.error }), { status: auth.status });

        try {
          const workflowResponses = await Promise.all(
            AGENCY_WORKFLOWS.map(async (workflow) => {
              try {
                const data = await github(`/actions/workflows/${workflow}/runs?per_page=5`);
                return { workflow, runs: (data.workflow_runs ?? []) as GitHubRun[] };
              } catch {
                return { workflow, runs: [] as GitHubRun[] };
              }
            }),
          );

          const runs = workflowResponses.flatMap(({ workflow, runs }) =>
            runs.map((run) => ({ ...run, workflow_file: workflow, agent_id: deriveAgent(run) })),
          );
          runs.sort((a, b) => Date.parse(b.updated_at ?? b.created_at ?? "") - Date.parse(a.updated_at ?? a.created_at ?? ""));

          const active = runs.filter((run) => run.status === "in_progress" || run.status === "queued" || run.status === "waiting").slice(0, 6);
          const selected = active[0] ?? runs[0] ?? null;

          let jobs: GitHubJob[] = [];
          if (selected) {
            try {
              const data = await github(`/actions/runs/${selected.id}/jobs?per_page=100`);
              jobs = (data.jobs ?? []) as GitHubJob[];
            } catch {
              jobs = [];
            }
          }

          const recentRuns = runs.slice(0, 20).map((run) => ({
            id: run.id,
            name: run.name ?? run.workflow_file,
            workflow_file: run.workflow_file,
            agent_id: run.agent_id,
            status: run.status ?? "unknown",
            conclusion: run.conclusion ?? null,
            created_at: run.created_at ?? null,
            updated_at: run.updated_at ?? null,
            run_started_at: run.run_started_at ?? null,
            head_sha: run.head_sha ?? null,
            html_url: run.html_url ?? null,
          }));

          const auditEvidence = await (async () => {
            const { url, serviceRoleKey, ok } = getServerSupabaseEnv();
            if (!ok || !serviceRoleKey) return [];
            const db = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
            const { data } = await db
              .from("ops_agent_audit_runs")
              .select("id,protocol,status,duration_ms,evidence,created_at")
              .order("created_at", { ascending: false })
              .limit(12);
            return data ?? [];
          })();

          return Response.json({
            generated_at: new Date().toISOString(),
            source: "github-actions",
            active_run: selected
              ? {
                  id: selected.id,
                  name: selected.name ?? selected.workflow_file,
                  workflow_file: selected.workflow_file,
                  agent_id: selected.agent_id,
                  status: selected.status,
                  conclusion: selected.conclusion,
                  html_url: selected.html_url,
                  head_sha: selected.head_sha,
                }
              : null,
            jobs: jobs.map((job) => ({
              id: job.id,
              name: job.name ?? "Job",
              status: job.status ?? "unknown",
              conclusion: job.conclusion ?? null,
              started_at: job.started_at ?? null,
              completed_at: job.completed_at ?? null,
              html_url: job.html_url ?? null,
              steps: (job.steps ?? []).map((step) => ({
                name: step.name ?? "Paso",
                status: step.status ?? "unknown",
                conclusion: step.conclusion ?? null,
                number: step.number ?? null,
                started_at: step.started_at ?? null,
                completed_at: step.completed_at ?? null,
              })),
            })),
            active_runs: active.map((run) => ({
              id: run.id,
              name: run.name ?? run.workflow_file,
              agent_id: run.agent_id,
              status: run.status,
              conclusion: run.conclusion,
              updated_at: run.updated_at ?? null,
              html_url: run.html_url ?? null,
            })),
            recent_runs: recentRuns,
            audit_evidence: auditEvidence,
          });
        } catch (error) {
          console.error("Agency status error", error);
          return new Response(JSON.stringify({ error: "No fue posible consultar la actividad de Nüva Agency." }), { status: 502 });
        }
      },
    },
  },
});
