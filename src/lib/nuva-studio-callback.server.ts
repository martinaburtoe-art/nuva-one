import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";
import { getStudioJob, recordStudioAudit, updateStudioJobCheckpoint } from "@/lib/nuva-studio-jobs.server";
import { markStep } from "@/lib/nuva-studio-execution.server";
import { runStudioJob } from "@/lib/nuva-studio-job-runner.server";

async function sha256(value: string) { const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(""); }

export async function processStudioCallback(args: { request: Request; jobId: string; step: number; token: string }) {
  const env = getServerSupabaseEnv();
  if (!env.url || !env.serviceRoleKey) return { status: 500, body: { error: "Callback server configuration is incomplete" } };
  if (!args.jobId || !Number.isInteger(args.step) || args.step < 0 || !args.token) return { status: 400, body: { error: "Invalid callback" } };

  const admin = createClient<Database>(env.url, env.serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const tokenHash = await sha256(args.token);
  const callback = await (admin as any).from("nuva_studio_job_callbacks").select("id,job_id,step,callback_type,status,expires_at").eq("job_id", args.jobId).eq("step", args.step).eq("token_hash", tokenHash).maybeSingle();
  if (callback.error || !callback.data) return { status: 401, body: { error: "Callback not recognized" } };
  if (callback.data.status !== "pending") return { status: 200, body: { ok: true, duplicate: true } };
  if (new Date(callback.data.expires_at).getTime() <= Date.now()) { await (admin as any).from("nuva_studio_job_callbacks").update({ status: "expired" }).eq("id", callback.data.id).eq("status", "pending"); return { status: 410, body: { error: "Callback expired" } }; }

  const payload = (await args.request.json().catch(() => ({}))) as Record<string, unknown>;
  const failed = payload.status === "failed" || payload.success === false || typeof payload.error === "string";
  const storagePath = typeof payload.storagePath === "string" ? payload.storagePath.slice(0, 2000) : undefined;
  const publicUrl = typeof payload.publicUrl === "string" ? payload.publicUrl.slice(0, 4000) : undefined;
  const mimeType = typeof payload.mimeType === "string" ? payload.mimeType.slice(0, 200) : undefined;
  const model = typeof payload.model === "string" ? payload.model.slice(0, 200) : undefined;
  const result = failed ? (typeof payload.error === "string" ? payload.error.slice(0, 4000) : "Video generation failed") : (publicUrl ?? storagePath ?? "media_completed");

  const claimed = await (admin as any).from("nuva_studio_job_callbacks").update({ status: "received", payload, received_at: new Date().toISOString() }).eq("id", callback.data.id).eq("status", "pending").select("id").maybeSingle();
  if (claimed.error || !claimed.data) return { status: 200, body: { ok: true, duplicate: true } };

  const job = await getStudioJob({ supabase: admin, jobId: args.jobId });
  if (!job || job.status === "cancelled") return { status: 200, body: { ok: true, ignored: true } };
  const planStep = job.plan.find((item) => item.index === args.step);
  if (!planStep) return { status: 422, body: { error: "Callback step does not belong to job" } };
  if (!failed && storagePath && !storagePath.startsWith(`${job.business_id}/studio/`)) return { status: 422, body: { error: "Asset path is outside the job tenant prefix" } };

  let checkpoint = job.checkpoint;
  const current = checkpoint.steps.find((item) => item.step === args.step);
  const attempts = current?.attempts ?? 1;
  checkpoint = markStep(checkpoint, args.step, failed ? { status: "pending", attempts, error: result } : { status: "completed", attempts, result });

  if (!failed && storagePath) {
    const assetInsert = await (admin as any).from("ai_asset_library").insert({ id: crypto.randomUUID(), business_id: job.business_id, user_id: job.user_id, job_id: job.id, asset_type: "video", title: `Nüva Studio · video · paso ${args.step + 1}`, storage_path: storagePath, public_url: publicUrl ?? null, metadata: { source: "nuva-studio-callback", capability: "video", step: args.step, model: model ?? null, mimeType: mimeType ?? null } });
    if (assetInsert.error) return { status: 500, body: { error: "Asset registration failed" } };
  }

  const stepUpdate = await (admin as any).from("nuva_studio_job_steps").upsert({ job_id: job.id, step: args.step, capability: planStep.capability, instruction: planStep.instruction, depends_on: planStep.dependsOn, status: failed ? "pending" : "completed", attempts, result: payload, error: failed ? result : null, completed_at: failed ? null : new Date().toISOString() }, { onConflict: "job_id,step" });
  if (stepUpdate.error) return { status: 500, body: { error: "Step checkpoint failed" } };
  await updateStudioJobCheckpoint({ supabase: admin, jobId: args.jobId, checkpoint, status: "queued", lastError: failed ? result : null, nextRunAt: new Date().toISOString() });
  await recordStudioAudit({ supabase: admin, businessId: job.business_id, userId: job.user_id, jobId: job.id, action: "studio.job.callback.received", metadata: { step: args.step, failed } });

  const resumed = await runStudioJob({ supabase: admin, jobId: args.jobId, userId: job.user_id });
  return { status: 200, body: { ok: true, resumed: true, jobId: args.jobId, status: resumed?.status ?? "queued" } };
}
