import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";
import { getStudioJob, updateStudioJobCheckpoint } from "@/lib/nuva-studio-jobs.server";
import { markStep } from "@/lib/nuva-studio-execution.server";
import { runStudioJob } from "@/lib/nuva-studio-job-runner.server";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const Route = createFileRoute("/api/studio-agent-callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const env = getServerSupabaseEnv();
        if (!env.url || !env.serviceRoleKey) return json({ error: "Callback server configuration is incomplete" }, 500);
        const url = new URL(request.url);
        const jobId = url.searchParams.get("jobId");
        const step = Number(url.searchParams.get("step"));
        const token = url.searchParams.get("token") ?? request.headers.get("x-nuva-callback-token") ?? "";
        if (!jobId || !Number.isInteger(step) || step < 0 || !token) return json({ error: "Invalid callback" }, 400);

        const admin = createClient<Database>(env.url, env.serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
        const tokenHash = await sha256(token);
        const callback = await (admin as any).from("nuva_studio_job_callbacks").select("id,job_id,step,callback_type,status,expires_at").eq("job_id", jobId).eq("step", step).eq("token_hash", tokenHash).maybeSingle();
        if (callback.error || !callback.data) return json({ error: "Callback not recognized" }, 401);
        if (callback.data.status !== "pending") return json({ ok: true, duplicate: true });
        if (new Date(callback.data.expires_at).getTime() <= Date.now()) {
          await (admin as any).from("nuva_studio_job_callbacks").update({ status: "expired" }).eq("id", callback.data.id).eq("status", "pending");
          return json({ error: "Callback expired" }, 410);
        }

        const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        const failed = payload.status === "failed" || payload.success === false || typeof payload.error === "string";
        const storagePath = typeof payload.storagePath === "string" ? payload.storagePath.slice(0, 2000) : undefined;
        const publicUrl = typeof payload.publicUrl === "string" ? payload.publicUrl.slice(0, 4000) : undefined;
        const mimeType = typeof payload.mimeType === "string" ? payload.mimeType.slice(0, 200) : undefined;
        const model = typeof payload.model === "string" ? payload.model.slice(0, 200) : undefined;
        const result = failed ? (typeof payload.error === "string" ? payload.error.slice(0, 4000) : "Video generation failed") : (publicUrl ?? storagePath ?? "media_completed");

        const claimed = await (admin as any).from("nuva_studio_job_callbacks").update({ status: "received", payload, received_at: new Date().toISOString() }).eq("id", callback.data.id).eq("status", "pending").select("id").maybeSingle();
        if (claimed.error || !claimed.data) return json({ ok: true, duplicate: true });

        const job = await getStudioJob({ supabase: admin, jobId });
        if (!job || job.status === "cancelled") return json({ ok: true, ignored: true });
        const planStep = job.plan.find((item) => item.index === step);
        if (!planStep) return json({ error: "Callback step does not belong to job" }, 422);

        let checkpoint = job.checkpoint;
        const current = checkpoint.steps.find((item) => item.step === step);
        const attempts = current?.attempts ?? 1;
        checkpoint = markStep(checkpoint, step, failed ? { status: "failed", attempts, error: result } : { status: "completed", attempts, result });

        if (!failed && storagePath) {
          const assetInsert = await (admin as any).from("ai_asset_library").insert({
            id: crypto.randomUUID(), business_id: job.business_id, user_id: job.user_id, job_id: job.id,
            asset_type: "video", title: `Nüva Studio · video · paso ${step + 1}`, storage_path: storagePath,
            public_url: publicUrl ?? null, metadata: { source: "nuva-studio-callback", capability: "video", step, model: model ?? null, mimeType: mimeType ?? null },
          });
          if (assetInsert.error) return json({ error: "Asset registration failed" }, 500);
        }

        await (admin as any).from("nuva_studio_job_steps").upsert({ job_id: job.id, step, capability: planStep.capability, instruction: planStep.instruction, depends_on: planStep.dependsOn, status: failed ? "failed" : "completed", attempts, result: payload, error: failed ? result : null, completed_at: new Date().toISOString() }, { onConflict: "job_id,step" });
        await updateStudioJobCheckpoint({ supabase: admin, jobId, checkpoint, status: failed ? "queued" : "queued", lastError: failed ? result : null, nextRunAt: new Date().toISOString() });

        if (failed) {
          checkpoint = markStep(checkpoint, step, { status: "pending", attempts, error: result });
          await updateStudioJobCheckpoint({ supabase: admin, jobId, checkpoint, status: "queued", lastError: result, nextRunAt: new Date(Date.now() + 2000).toISOString() });
          return json({ ok: true, resumed: false, retryScheduled: true, jobId });
        }

        const resumed = await runStudioJob({ supabase: admin, jobId, userId: job.user_id });
        return json({ ok: true, resumed: true, jobId, status: resumed?.status ?? "queued" });
      },
    },
  },
});
