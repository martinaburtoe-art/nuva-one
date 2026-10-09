import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";

const REPO = "martinaburtoe-art/nuva-one";
const AGENTS = ["orchestrator","constructor","finance","sales","supply","people","compliance","growth","security","qa","sentinel","ux","release"];

async function githubRun(token: string, runId: string) {
  const r = await fetch(`https://api.github.com/repos/${REPO}/actions/runs/${runId}`, {
    headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2026-03-10", Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error("WORKER_GITHUB_AUTH_FAILED");
  return r.json() as Promise<{ repository?: { full_name?: string }; status?: string; id?: number }>;
}

async function owner(request: Request) {
  const { url, anonKey, ok } = getServerSupabaseEnv();
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!ok || !bearer) return { ok: false as const, status: 401 };
  const db = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${bearer}` } }, auth: { persistSession: false } });
  const { data } = await db.auth.getUser(bearer);
  return data.user?.app_metadata?.platform_role === "owner" ? { ok: true as const, userId: data.user.id } : { ok: false as const, status: 403 };
}

async function worker(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const runId = request.headers.get("x-agency-run-id");
  const agentId = request.headers.get("x-agency-agent-id");
  if (!token || !runId || !agentId || !AGENTS.includes(agentId)) return { ok: false as const, status: 401 };
  const run = await githubRun(token, runId);
  if (run.repository?.full_name !== REPO) return { ok: false as const, status: 403 };
  return { ok: true as const, agentId, runId };
}

function db() {
  const { url, serviceRoleKey, ok } = getServerSupabaseEnv();
  if (!ok || !serviceRoleKey) throw new Error("AGENCY_SERVICE_ROLE_UNAVAILABLE");
  return createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const Route = createFileRoute("/api/owner/agency-control")({
  server: { handlers: {
    GET: async ({ request }) => {
      const auth = await owner(request);
      if (!auth.ok) return Response.json({ error: "AGENCY_ACCESS_DENIED" }, { status: auth.status });
      try {
        const client = db();
        const [missions, tasks, events, leases, approvals, artifacts] = await Promise.all([
          client.from("agency_missions").select("*").order("priority", { ascending: false }).order("created_at", { ascending: false }).limit(30),
          client.from("agency_tasks").select("*").order("created_at", { ascending: false }).limit(100),
          client.from("agency_events").select("*").order("created_at", { ascending: false }).limit(120),
          client.from("agency_agent_leases").select("id,task_id,agent_id,status,heartbeat_at,expires_at,created_at").order("heartbeat_at", { ascending: false }).limit(30),
          client.from("agency_approvals").select("*").order("created_at", { ascending: false }).limit(30),
          client.from("agency_artifacts").select("*").order("created_at", { ascending: false }).limit(50),
        ]);
        const error = missions.error || tasks.error || events.error || leases.error || approvals.error || artifacts.error;
        if (error) throw error;
        return Response.json({ generated_at: new Date().toISOString(), missions: missions.data ?? [], tasks: tasks.data ?? [], events: events.data ?? [], leases: leases.data ?? [], approvals: approvals.data ?? [], artifacts: artifacts.data ?? [] });
      } catch (e) {
        console.error("Agency control GET", e);
        return Response.json({ error: "AGENCY_CONTROL_UNAVAILABLE" }, { status: 502 });
      }
    },
    POST: async ({ request }) => {
      const body = await request.json().catch(() => ({}));
      const action = body?.action as string;
      const internal = ["claim_task","heartbeat","finish_task","event","delegate"].includes(action);
      const auth = internal ? await worker(request) : await owner(request);
      if (!auth.ok) return Response.json({ error: internal ? "AGENCY_WORKER_DENIED" : "AGENCY_ACCESS_DENIED" }, { status: auth.status });
      // La unión owner/worker no garantiza ambos IDs; extraemos el campo validado por cada vía.
      const workerAgentId = "agentId" in auth ? auth.agentId : "";
      const ownerUserId = "userId" in auth ? auth.userId : "";

      try {
        const client = db();
        if (action === "claim_task") {
          let { data, error } = await client.rpc("agency_claim_task", { p_agent_id: workerAgentId, p_lease_seconds: body.leaseSeconds ?? 1800 });
          if (error) throw error;
          if (!data) {
            const { data: mission } = await client.from("agency_missions").select("id,objective,success_criteria").eq("metadata->>mode", "durable-autonomous-agency").not("status", "in", "('cancelled','failed')").order("priority", { ascending: false }).limit(1).maybeSingle();
            if (mission) {
              const { error: taskError } = await client.from("agency_tasks").insert({
                mission_id: mission.id,
                title: `Autonomous ${workerAgentId} cycle`,
                objective: mission.objective,
                agent_id: workerAgentId,
                priority: workerAgentId === "security" ? 100 : 70,
                input_context: { success_criteria: mission.success_criteria, source: "durable-cycle" },
              });
              if (taskError) throw taskError;
              const claimed = await client.rpc("agency_claim_task", { p_agent_id: workerAgentId, p_lease_seconds: body.leaseSeconds ?? 1800 });
              if (claimed.error) throw claimed.error;
              data = claimed.data;
            }
          }
          return Response.json({ claimed: data ?? null });
        }
        if (action === "heartbeat") {
          const { data, error } = await client.rpc("agency_heartbeat", { p_lease_token: body.leaseToken, p_extend_seconds: body.extendSeconds ?? 900 });
          if (error) throw error;
          return Response.json({ ok: Boolean(data) });
        }
        if (action === "finish_task") {
          const { data, error } = await client.rpc("agency_finish_task", { p_lease_token: body.leaseToken, p_status: body.status, p_summary: body.summary ?? null, p_result: body.result ?? {} });
          if (error) throw error;
          return Response.json({ ok: Boolean(data) });
        }
        if (action === "event") {
          const { error } = await client.from("agency_events").insert({ mission_id: body.missionId ?? null, task_id: body.taskId ?? null, agent_id: workerAgentId, event_type: body.eventType, level: body.level ?? "info", message: body.message, payload: body.payload ?? {} });
          if (error) throw error;
          return Response.json({ ok: true });
        }
        if (action === "delegate") {
          const { data, error } = await client.from("agency_tasks").insert({
            mission_id: body.missionId, parent_task_id: body.parentTaskId ?? null, title: body.title, objective: body.objective,
            agent_id: body.agentId, priority: body.priority ?? 50, max_attempts: body.maxAttempts ?? 3,
            depends_on: body.dependsOn ?? [], input_context: body.inputContext ?? {},
          }).select().single();
          if (error) throw error;
          await client.from("agency_events").insert({ mission_id: body.missionId, task_id: data.id, agent_id: workerAgentId, event_type: "task.delegated", level: "info", message: `Delegated to ${body.agentId}`, payload: { title: body.title } });
          return Response.json({ task: data });
        }
        if (action === "create_mission") {
          const { data: mission, error } = await client.from("agency_missions").insert({
            title: body.title, objective: body.objective, priority: body.priority ?? 80, owner_user_id: ownerUserId,
            success_criteria: body.successCriteria ?? [], metadata: body.metadata ?? {}, status: "queued",
          }).select().single();
          if (error) throw error;
          const tasks = Array.isArray(body.tasks) ? body.tasks : [{ agentId: "orchestrator", title: "Orchestrate mission", objective: body.objective, priority: body.priority ?? 80 }];
          const rows = tasks.map((t: any) => ({ mission_id: mission.id, title: t.title, objective: t.objective, agent_id: t.agentId, priority: t.priority ?? 50, depends_on: t.dependsOn ?? [], input_context: t.inputContext ?? {} }));
          const { data: createdTasks, error: taskError } = await client.from("agency_tasks").insert(rows).select();
          if (taskError) throw taskError;
          await client.from("agency_events").insert({ mission_id: mission.id, agent_id: "owner", event_type: "mission.created", level: "success", message: "Durable mission created", payload: { task_count: rows.length } });
          return Response.json({ mission, tasks: createdTasks ?? [] });
        }
        if (action === "mission_status") {
          const patch = body.status === "paused" ? { status: "paused" } : body.status === "queued" ? { status: "queued" } : body.status === "cancelled" ? { status: "cancelled", completed_at: new Date().toISOString() } : null;
          if (!patch) return Response.json({ error: "INVALID_MISSION_STATUS" }, { status: 400 });
          const { error } = await client.from("agency_missions").update(patch).eq("id", body.missionId);
          if (error) throw error;
          return Response.json({ ok: true });
        }
        if (action === "approval") {
          const status = body.status === "approved" || body.status === "rejected" ? body.status : null;
          if (!status) return Response.json({ error: "INVALID_APPROVAL_STATUS" }, { status: 400 });
          const { error } = await client.from("agency_approvals").update({ status, decided_by: ownerUserId, decided_at: new Date().toISOString(), decision_note: body.note ?? null }).eq("id", body.approvalId).eq("status", "pending");
          if (error) throw error;
          return Response.json({ ok: true });
        }
        return Response.json({ error: "UNKNOWN_AGENCY_ACTION" }, { status: 400 });
      } catch (e) {
        console.error("Agency control POST", e);
        return Response.json({ error: e instanceof Error ? e.message : "AGENCY_CONTROL_FAILED" }, { status: 502 });
      }
    },
  }},
});
