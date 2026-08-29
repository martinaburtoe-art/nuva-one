import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { runStudioJob } from "@/lib/nuva-studio-job-runner.server";
import { runDueStudioCampaigns } from "@/lib/nuva-studio-campaign-loop.server";

const BATCH_SIZE = 3;
const STALE_LOCK_MS = 5 * 60 * 1000;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

export const Route = createFileRoute("/api/cron/nuva-studio-worker")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
        const now = new Date().toISOString();
        const staleBefore = new Date(Date.now() - STALE_LOCK_MS).toISOString();
        const [{ data: queued, error: queuedError }, { data: staleRunning, error: staleError }] = await Promise.all([
          supabaseAdmin.from("nuva_studio_jobs").select("id,user_id,status,next_run_at").eq("status", "queued").or(`next_run_at.is.null,next_run_at.lte.${now}`).order("next_run_at", { ascending: true, nullsFirst: true }).limit(BATCH_SIZE),
          supabaseAdmin.from("nuva_studio_jobs").select("id,user_id,status,locked_at").eq("status", "running").lt("locked_at", staleBefore).order("locked_at", { ascending: true }).limit(BATCH_SIZE),
        ]);
        if (queuedError) { console.error("studio_worker_queue_query_failed", queuedError); return Response.json({ ok: false, error: "No se pudo leer la cola de Studio" }, { status: 500, headers: { "Cache-Control": "no-store" } }); }
        if (staleError) { console.error("studio_worker_stale_query_failed", staleError); return Response.json({ ok: false, error: "No se pudieron recuperar jobs interrumpidos" }, { status: 500, headers: { "Cache-Control": "no-store" } }); }
        const jobs = [...(queued ?? []), ...(staleRunning ?? [])].slice(0, BATCH_SIZE);
        const results: Array<{ jobId: string; status: string | null; error?: string }> = [];
        for (const job of jobs) {
          try { const result = await runStudioJob({ supabase: supabaseAdmin, jobId: job.id, userId: job.user_id }); results.push({ jobId: job.id, status: result?.status ?? null }); }
          catch (error) { const message = error instanceof Error ? error.message : String(error); console.error("studio_worker_job_failed", { jobId: job.id, error: message }); results.push({ jobId: job.id, status: null, error: message.slice(0, 500) }); }
        }
        let campaigns: unknown[] = [];
        try { campaigns = await runDueStudioCampaigns({ supabase: supabaseAdmin, limit: BATCH_SIZE }); }
        catch (error) { console.error("studio_campaign_worker_failed", error); campaigns = [{ error: error instanceof Error ? error.message : String(error) }]; }
        return Response.json({ ok: true, claimed: jobs.length, results, campaigns }, { headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});
