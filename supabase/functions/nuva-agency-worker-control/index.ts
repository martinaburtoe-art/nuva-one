import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@6";

const REPO = "martinaburtoe-art/nuva-one";
const AGENTS = ["orchestrator","constructor","finance","sales","supply","people","compliance","growth","security","qa","sentinel","ux","release"];

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json", "cache-control": "no-store", "access-control-allow-origin": "*" }
});

function key(name: "publishable" | "secret") {
  const raw = Deno.env.get(name === "secret" ? "SUPABASE_SECRET_KEYS" : "SUPABASE_PUBLISHABLE_KEYS");
  if (raw) {
    const parsed = JSON.parse(raw);
    return parsed.default ?? Object.values(parsed)[0];
  }
  return Deno.env.get(name === "secret" ? "SUPABASE_SERVICE_ROLE_KEY" : "SUPABASE_ANON_KEY") ?? "";
}

const admin = () => createClient(Deno.env.get("SUPABASE_URL")!, key("secret"), { auth: { persistSession: false, autoRefreshToken: false } });

const GITHUB_JWKS = createRemoteJWKSet(new URL("https://token.actions.githubusercontent.com/.well-known/jwks"));
async function githubRun(token: string, runId: string, agentId: string) {
  const { payload } = await jwtVerify(token, GITHUB_JWKS, { issuer: "https://token.actions.githubusercontent.com" });
  if (payload.repository !== REPO || String(payload.run_id ?? "") !== runId || !AGENTS.includes(agentId)) {
    throw new Error("WORKER_OIDC_CLAIMS_DENIED");
  }
  return { repository: { full_name: REPO } };
}

async function authorize(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? request.headers.get("x-agency-github-token") ?? request.headers.get("x-agency-oidc-token");
  if (!token) return { kind: "deny" as const, status: 401 };
  const runId = request.headers.get("x-agency-run-id") ?? "0";
  const agentId = request.headers.get("x-agency-agent-id");
  if (request.headers.get("x-agency-github-token") && agentId && AGENTS.includes(agentId)) {
    await githubRun(token, runId, agentId);
    return { kind: "worker" as const, agentId, runId };
  }
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, key("publishable"), { auth: { persistSession: false } });
  const { data } = await userClient.auth.getUser(token);
  if (data.user?.app_metadata?.platform_role === "owner") return { kind: "owner" as const, userId: data.user.id };
  return { kind: "deny" as const, status: 403 };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return json({ ok: true });
  try {
    const auth = await authorize(request);
    if (auth.kind === "deny") return json({ error: "AGENCY_ACCESS_DENIED" }, auth.status);
    const client = admin();

    if (request.method === "GET") {
      if (auth.kind !== "owner") return json({ error: "OWNER_REQUIRED" }, 403);
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
      return json({ generated_at: new Date().toISOString(), missions: missions.data ?? [], tasks: tasks.data ?? [], events: events.data ?? [], leases: leases.data ?? [], approvals: approvals.data ?? [], artifacts: artifacts.data ?? [] });
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action as string;

    if (auth.kind === "worker") {
      if (action === "claim_task") {
        let { data, error } = await client.rpc("agency_claim_task", { p_agent_id: auth.agentId, p_lease_seconds: body.leaseSeconds ?? 21600 });
        if (error) throw error;
        if (!data) {
          const { data: mission } = await client.from("agency_missions").select("id,objective,success_criteria").eq("metadata->>mode", "durable-autonomous-agency").not("status", "in", "('cancelled','failed')").order("priority", { ascending: false }).limit(1).maybeSingle();
          if (mission) {
            const { error: taskError } = await client.from("agency_tasks").insert({ mission_id: mission.id, title: `Autonomous ${auth.agentId} cycle`, objective: mission.objective, agent_id: auth.agentId, priority: auth.agentId === "security" ? 100 : 70, input_context: { success_criteria: mission.success_criteria, source: "durable-cycle" } });
            if (taskError) throw taskError;
            const claimed = await client.rpc("agency_claim_task", { p_agent_id: auth.agentId, p_lease_seconds: body.leaseSeconds ?? 21600 });
            if (claimed.error) throw claimed.error;
            data = claimed.data;
          }
        }
        return json({ claimed: data ?? null });
      }
      if (action === "heartbeat") {
        const { data, error } = await client.rpc("agency_heartbeat", { p_lease_token: body.leaseToken, p_extend_seconds: body.extendSeconds ?? 3600 });
        if (error) throw error;
        return json({ ok: Boolean(data) });
      }
      if (action === "finish_task") {
        const { data, error } = await client.rpc("agency_finish_task", { p_lease_token: body.leaseToken, p_status: body.status, p_summary: body.summary ?? null, p_result: body.result ?? {} });
        if (error) throw error;
        return json({ ok: Boolean(data) });
      }
      if (action === "event") {
        const { error } = await client.from("agency_events").insert({ mission_id: body.missionId ?? null, task_id: body.taskId ?? null, agent_id: auth.agentId, event_type: body.eventType, level: body.level ?? "info", message: body.message, payload: body.payload ?? {} });
        if (error) throw error;
        return json({ ok: true });
      }
      if (action === "delegate") {
        const { data, error } = await client.from("agency_tasks").insert({ mission_id: body.missionId, parent_task_id: body.parentTaskId ?? null, title: body.title, objective: body.objective, agent_id: body.agentId, priority: body.priority ?? 50, max_attempts: body.maxAttempts ?? 3, depends_on: body.dependsOn ?? [], input_context: body.inputContext ?? {} }).select().single();
        if (error) throw error;
        await client.from("agency_events").insert({ mission_id: body.missionId, task_id: data.id, agent_id: auth.agentId, event_type: "task.delegated", level: "info", message: `Delegated to ${body.agentId}`, payload: { title: body.title } });
        return json({ task: data });
      }
      return json({ error: "UNKNOWN_WORKER_ACTION" }, 400);
    }

    if (action === "create_mission") {
      const { data: mission, error } = await client.from("agency_missions").insert({ title: body.title, objective: body.objective, priority: body.priority ?? 80, owner_user_id: auth.userId, success_criteria: body.successCriteria ?? [], metadata: body.metadata ?? {}, status: "queued" }).select().single();
      if (error) throw error;
      const tasks = Array.isArray(body.tasks) ? body.tasks : [{ agentId: "orchestrator", title: "Orchestrate mission", objective: body.objective, priority: body.priority ?? 80 }];
      const rows = tasks.map((t: Record<string, unknown>) => ({ mission_id: mission.id, title: t.title, objective: t.objective, agent_id: t.agentId, priority: t.priority ?? 50, depends_on: t.dependsOn ?? [], input_context: t.inputContext ?? {} }));
      const { data: createdTasks, error: taskError } = await client.from("agency_tasks").insert(rows).select();
      if (taskError) throw taskError;
      await client.from("agency_events").insert({ mission_id: mission.id, agent_id: "owner", event_type: "mission.created", level: "success", message: "Durable mission created", payload: { task_count: rows.length } });
      return json({ mission, tasks: createdTasks ?? [] });
    }
    if (action === "mission_status") {
      const patch = body.status === "paused" ? { status: "paused" } : body.status === "queued" ? { status: "queued" } : body.status === "cancelled" ? { status: "cancelled", completed_at: new Date().toISOString() } : null;
      if (!patch) return json({ error: "INVALID_MISSION_STATUS" }, 400);
      const { error } = await client.from("agency_missions").update(patch).eq("id", body.missionId);
      if (error) throw error;
      return json({ ok: true });
    }
    if (action === "approval") {
      const status = body.status === "approved" || body.status === "rejected" ? body.status : null;
      if (!status) return json({ error: "INVALID_APPROVAL_STATUS" }, 400);
      const { error } = await client.from("agency_approvals").update({ status, decided_by: auth.userId, decided_at: new Date().toISOString(), decision_note: body.note ?? null }).eq("id", body.approvalId).eq("status", "pending");
      if (error) throw error;
      return json({ ok: true });
    }
    return json({ error: "UNKNOWN_AGENCY_ACTION" }, 400);
  } catch (error) {
    console.error("nuva-agency-worker-control", error);
    return json({ error: error instanceof Error ? error.message : "AGENCY_CONTROL_FAILED" }, 502);
  }
});
