import { createClient } from "@supabase/supabase-js";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";
import { getStudioJob, recordStudioAudit, updateStudioJobCheckpoint } from "@/lib/nuva-studio-jobs.server";
import { markStep } from "@/lib/nuva-studio-execution.server";
import { runStudioJob } from "@/lib/nuva-studio-job-runner.server";

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function processStudioCallback(args: { request: Request; jobId: string; step: number; token: string }) {
  const env = getServerSupabaseEnv();
  if (!env.url || !env.serviceRoleKey) return { status: 500, body: { error: "Callback server configuration is incomplete" } };
  if (!args.jobId || !Number.isInteger(args.step) || args.step < 0 || !args.token) return { status: 400, body: { error: "Invalid callback" } };
  const admin = createClient(env.url, env.serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const tokenHash = await sha256(args.token);
  const callback = await admin.from("nuva_studio_job_callbacks").select("id,job_id,step,callback_type,status,expires_at").eq("job_id", args.jobId).eq("step", args.step).eq("token_hash", tokenHash).maybeSingle();
  if (callback.error || !callback.data) return { status: 401, body: { error: "Callback not recognized" } };
  if (callback.data.status !== "pending") return { status: 200, body: { ok: true, duplicate: true } };
  if (new Date(String(callback.data.expires_at)).getTime() <= Date.now()) {
    await admin.from("nuva_studio_job_callbacks").update({ status: "expired" }).eq("id", callback.data.id).eq("status", "pending");
    return { status: 410, body: { error: "Callback expired" } };
  }
  const parsedPayload: unknown = await args.request.json().catch(() => ({}));
  const payload: Record<string, unknown> = parsedPayload && typeof parsedPayload === "object" && !Array.isArray(parsedPayload) ? parsedPayload as Record<string, unknown> : {};
  const failed = payload.status === "failed" || payload.success === false || typeof payload.error === "string";
  const storagePath = typeof payload.storagePath === "string" ? payload.storagePath.slice(0, 2000) : undefined;
  const publicUrl = typeof payload.publicUrl === "string" ? payload.publicUrl.slice(0, 4000) : undefined;
  const mimeType = typeof payload.mimeType === "string" ? payload.mimeType.slice(0, 200) : undefined;
  const model = typeof payload.model === "string" ? payload.model.slice(0, 200) : undefined;
  const result = failed ? (typeof payload.error === "string" ? payload.error.slice(0, 4000) : "Video generation failed") : (publicUrl ?? storagePath ?? "media_completed");
  const job = await getStudioJob({ supabase: admin, jobId: args.jobId });
  if (!job || job.status === "cancelled") return { status: 200, body: { ok: true, ignored: true } };
  const planStep = job.plan.find((item) => item.index === args.step);
  if (!planStep) return { status: 422, body: { error: "Callback step does not belong to job" } };
  if (!failed && storagePath && !storagePath.startsWith(`${job.business_id}/studio/`)) return { status: 422, body: { error: "Asset path is outside the job tenant prefix" } };
  const claimed = await admin.from("nuva_studio_job_callbacks").update({ status: "received", payload, received_at: new Date().toISOString() }).eq("id", callback.data.id).eq("status", "pending").select("id").maybeSingle();
  if (claimed.error || !claimed.data) return { status: 200, body: { ok: true, duplicate: true } };
  const releaseClaim = async () => { await admin.from("nuva_studio_job_callbacks").update({ status: "pending", payload: null, received_at: null }).eq("id", callback.data.id).eq("status", "received"); };
  let checkpoint = job.checkpoint;
  const current = checkpoint.steps.find((item) => item.step === args.step);
  const attempts = current?.attempts ?? 1;
  checkpoint = markStep(checkpoint, args.step, failed ? { status: "pending", attempts, error: result } : { status: "completed", attempts, result });
  if (!failed && storagePath) {
    const assetInsert = await admin.from("ai_asset_library").upsert({ id: callback.data.id, business_id: job.business_id, user_id: job.user_id, job_id: job.id, asset_type: "video", title: `Nüva Studio · video · paso ${args.step + 1}`, storage_path: storagePath, public_url: publicUrl ?? null, metadata: { source: "nuva-studio-callback", capability: "video", step: args.step, model: model ?? null, mimeType: mimeType ?? null } }, { onConflict: "id" });
    if (assetInsert.error) { await releaseClaim(); return { status: 500, body: { error: "Asset registration failed" } }; }
  }
  const stepUpdate = await admin.from("nuva_studio_job_steps").upsert({ job_id: job.id, step: args.step, capability: planStep.capability, instruction: planStep.instruction, depends_on: planStep.dependsOn, status: failed ? "pending" : "completed", attempts, result: payload, error: failed ? result : null, completed_at: failed ? null : new Date().toISOString() }, { onConflict: "job_id,step" });
  if (stepUpdate.error) { await releaseClaim(); return { status: 500, body: { error: "Step checkpoint failed" } }; }
  try { await updateStudioJobCheckpoint({ supabase: admin, jobId: args.jobId, checkpoint, status: "queued", lastError: failed ? result : null, nextRunAt: new Date().toISOString() }); }
  catch { await releaseClaim(); return { status: 500, body: { error: "Job checkpoint failed" } }; }
  await recordStudioAudit({ supabase: admin, businessId: job.business_id, userId: job.user_id, jobId: job.id, action: "studio.job.callback.received", metadata: { step: args.step, failed } });
  const resumed = await runStudioJob({ supabase: admin, jobId: args.jobId, userId: job.user_id });

  const cycle = await admin.from("nuva_studio_campaign_cycles").select("id,campaign_id,cycle_number").eq("studio_job_id", args.jobId).maybeSingle();
  if (!cycle.error && cycle.data && ["completed", "partial", "failed", "dead_letter", "cancelled"].includes(String(resumed?.status))) {
    const cycleStatus = resumed.status === "completed" ? "completed" : resumed.status === "partial" ? "partial" : resumed.status === "cancelled" ? "cancelled" : "failed";
    await admin.from("nuva_studio_campaign_cycles").update({ status: cycleStatus, completed_at: new Date().toISOString(), learnings: { jobStatus: resumed.status, completedSteps: resumed.result?.completed?.length ?? 0, media: resumed.result?.media ?? [] } }).eq("id", cycle.data.id).eq("status", "running");
    const campaign = await admin.from("nuva_studio_campaigns").select("id,cadence_hours,max_cycles,cycles_completed,status").eq("id", cycle.data.campaign_id).maybeSingle();
    if (!campaign.error && campaign.data && campaign.data.status === "active") {
      const nextCycles = Math.max(Number(campaign.data.cycles_completed ?? 0), Number(cycle.data.cycle_number));
      const finished = Number(campaign.data.max_cycles ?? 0) > 0 && nextCycles >= Number(campaign.data.max_cycles);
      await admin.from("nuva_studio_campaigns").update({ cycles_completed: nextCycles, last_run_at: new Date().toISOString(), next_run_at: new Date(Date.now() + Number(campaign.data.cadence_hours ?? 24) * 60 * 60 * 1000).toISOString(), status: finished ? "completed" : "active", updated_at: new Date().toISOString() }).eq("id", campaign.data.id).eq("status", "active");
    }
  }
  return { status: 200, body: { ok: true, resumed: true, jobId: args.jobId, status: resumed?.status ?? "queued" } };
}
