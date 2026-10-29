import { createFileRoute } from "@tanstack/react-router";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "../../..");

const EXEC_DIR = path.join(REPO_ROOT, "logs", "executions");
const CYCLE_DIR = path.join(REPO_ROOT, "logs", "cycles");

type ExecutionRecord = {
  id: string;
  taskId: string;
  specialist: string;
  result: "PASS" | "FAIL" | "ERROR";
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
  taskId: string;
  qaVerdict: string | null;
  securityVerdict: string | null;
  orchestratorDecision: string | null;
  createdAt: string | null;
  files: string[];
};

function safeReadJson<T>(filePath: string): Promise<T | null> {
  try {
    return fs.readFile(filePath, "utf8").then((raw) => JSON.parse(raw) as T);
  } catch {
    return Promise.resolve(null);
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

async function owner(request: Request) {
  const { url, anonKey, ok } = getServerSupabaseEnv();
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!ok || !bearer) return { ok: false as const, status: 401 };
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${bearer}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await db.auth.getUser(bearer);
  return data.user?.app_metadata?.platform_role === "owner"
    ? { ok: true as const, userId: data.user.id }
    : { ok: false as const, status: 403 };
}

export const Route = createFileRoute("/api/owner/agency-logs")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await owner(request);
        if (!auth.ok) {
          return new Response(JSON.stringify({ error: "AGENCY_ACCESS_DENIED" }), {
            status: auth.status,
            headers: { "Content-Type": "application/json" },
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
