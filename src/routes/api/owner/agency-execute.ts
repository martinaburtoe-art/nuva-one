import { createFileRoute } from "@tanstack/react-router";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";
import { execFile } from "node:child_process";
import { join } from "node:path";

const REPO_ROOT = process.cwd();

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

export const Route = createFileRoute("/api/owner/agency-execute")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await owner(request);
        if (!auth.ok) {
          return new Response(JSON.stringify({ error: "AGENCY_ACCESS_DENIED" }), {
            status: auth.status,
            headers: { "Content-Type": "application/json" },
          });
        }

        let body: { task?: string; dryRun?: boolean };
        try {
          body = (await request.json()) ?? {};
        } catch {
          body = {};
        }

        const args: string[] = [];
        if (body.task) args.push(`--task=${body.task}`);
        if (body.dryRun === true) args.push("--dry-run=true");

        return new Promise((resolve) => {
          const child = execFile(
            "node",
            [join(REPO_ROOT, "scripts", "agency-task-executor.mjs"), ...args],
            { cwd: REPO_ROOT, encoding: "utf8", timeout: 120_000 },
            (error, stdout, stderr) => {
              if (error) {
                resolve(
                  new Response(
                    JSON.stringify({
                      error: "Ejecución fallida",
                      detail: error.message,
                      stderr: stderr?.slice(0, 2000),
                      stdout: stdout?.slice(0, 2000),
                    }),
                    { status: 502, headers: { "Content-Type": "application/json" } },
                  ),
                );
                return;
              }
              resolve(
                Response.json({
                  ok: true,
                  startedAt: new Date().toISOString(),
                  args,
                  stdout: stdout?.slice(0, 5000) ?? "",
                  stderr: stderr?.slice(0, 2000) ?? "",
                }),
              );
            },
          );

          // Timeout de seguridad: si el proceso no termina en 120s, se aborta.
          setTimeout(() => {
            try {
              child.kill();
            } catch {
              // Ignorar si ya terminó
            }
          }, 120_000);
        });
      },
    },
  },
});
