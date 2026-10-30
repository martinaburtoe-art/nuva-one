import { createFileRoute } from "@tanstack/react-router";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";
import { authorizeAgencyOwner } from "@/lib/agency/owner-auth.server";
import { createClient } from "@supabase/supabase-js";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const REPO_ROOT = process.cwd();

const EXEC_DIR = path.join(REPO_ROOT, "logs", "executions");
const CYCLE_DIR = path.join(REPO_ROOT, "logs", "cycles");

type ExecutionRecord = {
  id: string;
  taskId: string;
  specialist: string;
  result: "PASS" | "FAIL" | "ERROR" | "BLOCKED" | "UNKNOWN";
  exitCode: number | null;
  durationMs: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  evidenceFile: string | null;
  errorSummary: string | null;
  retryCount: number | null;
  previousState: string | null;
};

type CycleRecord = {
  id: string;
  taskId: string | null;
  qaVerdict: string | null;
  securityVerdict: string | null;
  orchestratorDecision: string | null;
  createdAt: string | null;
  files: string[];
};

async function safeReadJson<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function listJsonFiles(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir);
    return entries.filter((e) => e.endsWith(".json") && !e.startsWith("."));
  } catch {
    return [];
  }
}

export const Route = createFileRoute("/api/owner/agency-logs")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await authorizeAgencyOwner(request);
        if (!auth.ok) {
          return new Response(JSON.stringify({ error: auth.error }), {
            status: auth.status,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const env = getServerSupabaseEnv();
          if (env.ok && env.serviceRoleKey) {
            const db = createClient(env.url, env.serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
            const [taskResult, eventResult] = await Promise.all([
              db.from("agency_tasks").select("id,mission_id,agent_id,status,attempt_count,result,error,input_context,created_at,updated_at,started_at,claimed_at,completed_at,output_summary").order("created_at", { ascending: false }).limit(100),
              db.from("agency_events").select("id,mission_id,task_id,agent_id,event_type,level,message,payload,created_at").order("created_at", { ascending: false }).limit(120),
            ]);
            const queryError = taskResult.error || eventResult.error;
            if (queryError) throw queryError;

            const executions: ExecutionRecord[] = (taskResult.data ?? []).map((task: any) => {
              const rawResult = typeof task.result?.result === "string" ? task.result.result : null;
              const result = (["PASS", "FAIL", "ERROR", "BLOCKED", "UNKNOWN"].includes(rawResult)
                ? rawResult
                : task.status === "completed" ? "PASS" : task.status === "failed" ? "FAIL" : "UNKNOWN") as ExecutionRecord["result"];
              const error = task.error && typeof task.error === "object" ? task.error.message ?? task.error.details ?? null : null;
              return {
                id: task.id,
                taskId: task.input_context?.backlog_task_id ?? task.result?.logical_task_id ?? task.id,
                specialist: task.agent_id,
                result,
                exitCode: typeof task.result?.exitCode === "number" ? task.result.exitCode : null,
                durationMs: typeof task.result?.durationMs === "number" ? task.result.durationMs : null,
                startedAt: task.started_at ?? task.claimed_at ?? task.created_at,
                finishedAt: task.completed_at ?? task.updated_at,
                evidenceFile: null,
                errorSummary: typeof error === "string" ? error : task.output_summary && task.status === "failed" ? task.output_summary : null,
                retryCount: Math.max(0, Number(task.attempt_count ?? 1) - 1),
                previousState: null,
              };
            });
            const cycles: CycleRecord[] = (eventResult.data ?? [])
              .filter((event: any) => ["cycle.decision", "mission.created", "mission.finalized", "mission.status_changed"].includes(event.event_type))
              .map((event: any) => ({
                id: String(event.id),
                taskId: event.payload?.logical_task_id ?? event.task_id ?? null,
                qaVerdict: event.payload?.qaVerdict ?? null,
                securityVerdict: event.payload?.securityVerdict ?? null,
                orchestratorDecision: event.payload?.result ?? event.payload?.status ?? event.level,
                createdAt: event.created_at,
                files: Array.isArray(event.payload?.files) ? event.payload.files : [],
              }));
            const summary = {
              totalExecutions: executions.length,
              passExecutions: executions.filter((item) => item.result === "PASS").length,
              failExecutions: executions.filter((item) => item.result === "FAIL").length,
              errorExecutions: executions.filter((item) => item.result === "ERROR").length,
              totalCycles: cycles.length,
              pendingSecurity: cycles.filter((item) => item.securityVerdict === "pending").length,
              pendingDecision: cycles.filter((item) => item.orchestratorDecision === "pending").length,
            };
            return Response.json({
              generated_at: new Date().toISOString(), source: "supabase",
              summary, executions, cycles,
            });
          }
        } catch (error) {
          console.error("Agency durable logs error", error);
          return new Response(JSON.stringify({ error: "No fue posible consultar los registros durables de Agency." }), {
            status: 502, headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const execFiles = await listJsonFiles(EXEC_DIR);
          const executions: ExecutionRecord[] = [];
          for (const file of execFiles) {
            const full = path.join(EXEC_DIR, file);
            const data = await safeReadJson<any>(full);
            if (!data || !data.id) continue;
            executions.push({
              id: data.id,
              taskId: data.taskId ?? null,
              specialist: data.specialist ?? null,
              result: data.result ?? null,
              exitCode: data.exitCode ?? null,
              durationMs: data.durationMs ?? null,
              startedAt: data.startedAt ?? null,
              finishedAt: data.finishedAt ?? null,
              evidenceFile: data.evidenceFile ?? null,
              errorSummary: data.errorSummary ?? null,
              retryCount: data.retryCount ?? null,
              previousState: data.previousState ?? null,
            });
          }
          executions.sort(
            (a, b) =>
              (b.finishedAt ? Date.parse(b.finishedAt) : 0) -
              (a.finishedAt ? Date.parse(a.finishedAt) : 0),
          );

          const cycleFiles = await listJsonFiles(CYCLE_DIR);
          const cycles: CycleRecord[] = [];
          for (const file of cycleFiles) {
            if (!file.startsWith("cycle-")) continue;
            const full = path.join(CYCLE_DIR, file);
            const data = await safeReadJson<any>(full);
            if (!data || !data.id) continue;
            cycles.push({
              id: data.id,
              taskId: data.taskId ?? null,
              qaVerdict: data.qaVerdict ?? null,
              securityVerdict: data.securityVerdict ?? null,
              orchestratorDecision: data.orchestratorDecision ?? null,
              createdAt: data.createdAt ?? null,
              files: data.files ?? [],
            });
          }
          cycles.sort(
            (a, b) =>
              (b.createdAt ? Date.parse(b.createdAt) : 0) -
              (a.createdAt ? Date.parse(a.createdAt) : 0),
          );

          const summary = {
            totalExecutions: executions.length,
            passExecutions: executions.filter((e) => e.result === "PASS").length,
            failExecutions: executions.filter((e) => e.result === "FAIL").length,
            errorExecutions: executions.filter((e) => e.result === "ERROR").length,
            totalCycles: cycles.length,
            pendingSecurity: cycles.filter((c) => c.securityVerdict === "pending").length,
            pendingDecision: cycles.filter((c) => c.orchestratorDecision === "pending").length,
          };

          return Response.json({
            generated_at: new Date().toISOString(),
            source: "local-logs",
            summary,
            executions,
            cycles,
          });
        } catch (error) {
          console.error("Agency logs error", error);
          return new Response(
            JSON.stringify({ error: "No fue posible leer los registros de la agencia." }),
            { status: 502, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
