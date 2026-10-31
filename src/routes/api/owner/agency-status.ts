import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";
import { authorizeAgencyOwner } from "@/lib/agency/owner-auth.server";

const REPO = "martinaburtoe-art/nuva-one";
const AGENCY_AGENTS = new Set(["orchestrator", "constructor", "finance", "sales", "supply", "people", "compliance", "growth", "security", "qa", "sentinel", "ux", "release"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AGENCY_WORKFLOWS = [
  "nuva-agent-builder.yml",
  "nuva-agency-sentinel.yml",
  "nuva-agency-verify.yml",
  "nuva-agency-web-qa.yml",
  "nuva-agency-autonomous-repair.yml",
  "nuva-agency-autonomous-merge.yml",
  "nuva-agency-safe-merge.yml",
  "nuva-agent-health.yml",
  "nuva-agency-durable-worker.yml",
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
        const auth = await authorizeAgencyOwner(request);
        if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

        if (new URL(request.url).searchParams.get("view") === "durable") {
          try {
            const env = getServerSupabaseEnv();
            if (!env.ok || !env.serviceRoleKey) {
              return Response.json({ error: "AGENCY_DURABLE_STORAGE_NOT_CONFIGURED" }, { status: 503 });
            }
            const db = createClient(env.url, env.serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
            const [missions, tasks, events, leases, approvals, artifacts] = await Promise.all([
              db.from("agency_missions").select("id,title,objective,status,priority,current_agent_id,last_heartbeat_at,success_criteria,created_at,updated_at").order("priority", { ascending: false }).order("created_at", { ascending: false }).limit(30),
              db.from("agency_tasks").select("id,mission_id,title,objective,agent_id,status,attempt_count,max_attempts,output_summary,result,input_context,created_at,updated_at,completed_at").order("created_at", { ascending: false }).limit(100),
              db.from("agency_events").select("id,mission_id,task_id,agent_id,event_type,level,message,payload,created_at").order("created_at", { ascending: false }).limit(120),
              db.from("agency_agent_leases").select("id,task_id,agent_id,status,heartbeat_at,expires_at").order("heartbeat_at", { ascending: false }).limit(30),
              db.from("agency_approvals").select("id,mission_id,task_id,requested_by_agent,action_type,risk_level,description,status,created_at").order("created_at", { ascending: false }).limit(30),
              db.from("agency_artifacts").select("id,mission_id,task_id,agent_id,artifact_type,name,uri,content_hash,metadata,created_at").order("created_at", { ascending: false }).limit(50),
            ]);
            const queryError = missions.error || tasks.error || events.error || leases.error || approvals.error || artifacts.error;
            if (queryError) throw queryError;
            return Response.json({
              generated_at: new Date().toISOString(),
              missions: missions.data ?? [], tasks: tasks.data ?? [], events: events.data ?? [],
              leases: leases.data ?? [], approvals: approvals.data ?? [], artifacts: artifacts.data ?? [],
            });
          } catch (error) {
            console.error("Agency durable read error", error);
            return Response.json({ error: "No fue posible leer el control plane durable." }, { status: 502 });
          }
        }

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
      POST: async ({ request }) => {
        const auth = await authorizeAgencyOwner(request);
        if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

        const env = getServerSupabaseEnv();
        if (!env.ok || !env.serviceRoleKey) {
          return Response.json({ error: "AGENCY_DURABLE_STORAGE_NOT_CONFIGURED" }, { status: 503 });
        }

        const body = await request.json().catch(() => null) as Record<string, unknown> | null;
        if (!body || Array.isArray(body)) return Response.json({ error: "INVALID_AGENCY_CONTROL_PAYLOAD" }, { status: 400 });
        const db = createClient(env.url, env.serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
        const now = new Date().toISOString();

        try {
          if (body.action === "create_mission") {
            const title = typeof body.title === "string" ? body.title.trim() : "";
            const objective = typeof body.objective === "string" ? body.objective.trim() : "";
            if (title.length < 3 || title.length > 120 || objective.length < 10 || objective.length > 4000) {
              return Response.json({ error: "MISSION_TITLE_OR_OBJECTIVE_INVALID" }, { status: 400 });
            }
            if (body.priority !== undefined && (!Number.isInteger(body.priority) || Number(body.priority) < 1 || Number(body.priority) > 100)) {
              return Response.json({ error: "MISSION_PRIORITY_INVALID" }, { status: 400 });
            }
            const priority = typeof body.priority === "number" ? body.priority : 80;
            const rawTasks = Array.isArray(body.tasks) ? body.tasks : [{ agentId: "orchestrator", title: "Orchestrate mission", objective }];
            if (rawTasks.length < 1 || rawTasks.length > 13) return Response.json({ error: "MISSION_TASK_COUNT_INVALID" }, { status: 400 });
            const taskRows: Array<Record<string, unknown>> = [];
            for (const rawTask of rawTasks) {
              if (!rawTask || typeof rawTask !== "object" || Array.isArray(rawTask)) {
                return Response.json({ error: "MISSION_TASK_INVALID" }, { status: 400 });
              }
              const task = rawTask as Record<string, unknown>;
              const agentId = typeof task.agentId === "string" ? task.agentId : "";
              const taskTitle = typeof task.title === "string" ? task.title.trim() : "";
              const taskObjective = typeof task.objective === "string" ? task.objective.trim() : "";
              if (!AGENCY_AGENTS.has(agentId) || taskTitle.length < 3 || taskTitle.length > 120 || taskObjective.length < 10 || taskObjective.length > 4000) {
                return Response.json({ error: "MISSION_TASK_INVALID" }, { status: 400 });
              }
              taskRows.push({
                title: taskTitle,
                objective: taskObjective,
                agent_id: agentId,
                priority: typeof task.priority === "number" && Number.isInteger(task.priority) ? Math.max(1, Math.min(100, task.priority)) : priority,
                depends_on: [],
                input_context: { source: "owner-console" },
              });
            }
            const successCriteria = Array.isArray(body.successCriteria)
              ? body.successCriteria.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 10)
              : [];
            const { data: mission, error: missionError } = await db.from("agency_missions").insert({
              title, objective, priority, status: "queued", owner_user_id: auth.userId,
              success_criteria: successCriteria,
              metadata: { mode: "durable-autonomous-agency", source: "owner-console" },
            }).select("id,title,objective,status,priority,created_at,updated_at").single();
            if (missionError) throw missionError;

            const { data: createdTasks, error: taskError } = await db.from("agency_tasks").insert(
              taskRows.map((task) => ({ ...task, mission_id: mission.id })),
            ).select("id,mission_id,title,objective,agent_id,status,priority,created_at");
            if (taskError) {
              await db.from("agency_missions").update({ status: "failed", completed_at: now }).eq("id", mission.id);
              throw taskError;
            }
            const { error: eventError } = await db.from("agency_events").insert({
              mission_id: mission.id, agent_id: "owner", event_type: "mission.created", level: "success",
              message: "Misión creada desde Owner Console", payload: { task_count: taskRows.length, owner_user_id: auth.userId },
            });
            if (eventError) throw eventError;
            return Response.json({ mission, tasks: createdTasks ?? [] }, { status: 201 });
          }

          if (body.action === "mission_status") {
            const missionId = typeof body.missionId === "string" ? body.missionId : "";
            const status = body.status;
            if (!UUID_RE.test(missionId) || !["paused", "queued", "cancelled"].includes(String(status))) {
              return Response.json({ error: "MISSION_STATUS_INVALID" }, { status: 400 });
            }
            const patch = status === "cancelled"
              ? { status: "cancelled", completed_at: now }
              : { status, completed_at: null };
            const { data: mission, error } = await db.from("agency_missions").update(patch).eq("id", missionId).select("id,status").maybeSingle();
            if (error) throw error;
            if (!mission) return Response.json({ error: "MISSION_NOT_FOUND" }, { status: 404 });
            const { error: eventError } = await db.from("agency_events").insert({
              mission_id: missionId, agent_id: "owner", event_type: "mission.status_changed",
              level: status === "cancelled" ? "warn" : "info", message: `Misión ${status} desde Owner Console`,
              payload: { status, owner_user_id: auth.userId },
            });
            if (eventError) throw eventError;
            return Response.json({ ok: true, mission });
          }

          if (body.action === "approval") {
            const approvalId = typeof body.approvalId === "string" ? body.approvalId : "";
            const status = body.status;
            const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : null;
            if (!UUID_RE.test(approvalId) || !["approved", "rejected"].includes(String(status))) {
              return Response.json({ error: "APPROVAL_DECISION_INVALID" }, { status: 400 });
            }
            const { data: approval, error } = await db.from("agency_approvals")
              .update({ status, decided_by: auth.userId, decided_at: now, decision_note: note })
              .eq("id", approvalId).eq("status", "pending")
              .select("id,mission_id,task_id,status,action_type")
              .maybeSingle();
            if (error) throw error;
            if (!approval) return Response.json({ error: "APPROVAL_NOT_PENDING_OR_NOT_FOUND" }, { status: 409 });
            const { error: eventError } = await db.from("agency_events").insert({
              mission_id: approval.mission_id, task_id: approval.task_id, agent_id: "owner",
              event_type: "approval.decided", level: status === "approved" ? "success" : "warn",
              message: `Aprobación ${status} desde Owner Console`,
              payload: { approval_id: approval.id, action_type: approval.action_type, note, owner_user_id: auth.userId },
            });
            if (eventError) throw eventError;
            return Response.json({ ok: true, approval });
          }

          return Response.json({ error: "UNKNOWN_AGENCY_CONTROL_ACTION" }, { status: 400 });
        } catch (error) {
          console.error("Agency owner control error", error);
          return Response.json({ error: "No fue posible completar la acción de Agency." }, { status: 502 });
        }
      },
    },
  },
});
