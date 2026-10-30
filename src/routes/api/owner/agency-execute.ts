import { createFileRoute } from "@tanstack/react-router";
import { authorizeAgencyOwner } from "@/lib/agency/owner-auth.server";
import { execFile } from "node:child_process";
import { join } from "node:path";

const REPO_ROOT = process.cwd();

export const Route = createFileRoute("/api/owner/agency-execute")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authorizeAgencyOwner(request);
        if (!auth.ok) {
          return new Response(JSON.stringify({ error: auth.error }), {
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

        if (body.task !== undefined && (typeof body.task !== "string" || !/^T-\\d{1,4}$/.test(body.task))) {
          return Response.json({ error: "INVALID_TASK_ID" }, { status: 400 });
        }
        if (body.dryRun !== undefined && typeof body.dryRun !== "boolean") {
          return Response.json({ error: "INVALID_DRY_RUN_FLAG" }, { status: 400 });
        }
        const args: string[] = [];
        if (body.task) args.push(`--task=${body.task}`);
        if (body.dryRun === true) args.push("--dry-run=true");

        return new Promise((resolve) => {
          execFile(
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

        });
      },
    },
  },
});
