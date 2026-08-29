import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { AiCapability } from "@/lib/ai-gateway/types";
import { executeStudioMedia } from "@/lib/nuva-studio-media-executor.server";
import { getRunnableSteps, markStep, resumeExecution, type StudioExecutionResult } from "@/lib/nuva-studio-execution.server";
import { exponentialBackoffMs, getStudioJob, getStudioJobByIdempotency, incrementStudioJobAttempt, recordStudioAudit, updateStudioJobCheckpoint, upsertStudioJobStep, createOrGetStudioJob, withStudioJobLease } from "@/lib/nuva-studio-jobs.server";
import { planNuvaStudioTask, runNuvaStudioTask } from "@/lib/nuva-studio.server";

const TOOL_BY_CAPABILITY: Partial<Record<AiCapability, string>> = { chat: "agent.chat", research: "studio.research", marketing: "studio.marketing", copywriting: "studio.copywriting", brand: "studio.brand", strategy: "studio.strategy", document: "studio.document", automation: "studio.automation" };
const MEDIA_CAPABILITIES = new Set<AiCapability>(["image", "image_edit", "video", "voice"]);
function jsonResult(result: unknown) { return JSON.parse(JSON.stringify(result)) as StudioExecutionResult; }

export async function createStudioPlanAndJob(args: { supabase: SupabaseClient<Database>; businessId: string; userId: string; prompt: string; maxSteps: number; idempotencyKey: string }) {
  const existing = await getStudioJobByIdempotency({ supabase: args.supabase, businessId: args.businessId, idempotencyKey: args.idempotencyKey });
  if (existing) return { plan: { goal: existing.goal, steps: existing.plan }, job: existing, created: false };
  const plan = await planNuvaStudioTask({ businessId: args.businessId, prompt: args.prompt, supabase: args.supabase });
  const steps = plan.steps.slice(0, Math.min(Math.max(args.maxSteps, 1), 6)).map((step, index) => ({ ...step, index }));
  const { validateStudioPlan, createExecutionCheckpoint } = await import("@/lib/nuva-studio-execution.server");
  const validationErrors = validateStudioPlan(steps);
  if (validationErrors.length) throw Object.assign(new Error("El plan generado no pasó la validación de seguridad."), { code: "PLAN_INVALID", validationErrors, plan: { ...plan, steps } });
  const checkpoint = createExecutionCheckpoint(crypto.randomUUID(), steps);
  return { plan: { ...plan, steps }, ...(await createOrGetStudioJob({ supabase: args.supabase, businessId: args.businessId, userId: args.userId, goal: plan.goal, plan: steps, checkpoint, idempotencyKey: args.idempotencyKey })) };
}

export async function runStudioJob(args: { supabase: SupabaseClient<Database>; jobId: string; userId: string }) {
  const job = await getStudioJob({ supabase: args.supabase, jobId: args.jobId });
  if (!job) throw Object.assign(new Error("Job no encontrado"), { code: "NOT_FOUND" });
  if (job.user_id !== args.userId) throw Object.assign(new Error("No tienes acceso a este job"), { code: "FORBIDDEN" });
  if (["completed", "cancelled", "dead_letter"].includes(job.status)) return job;
  if (job.next_run_at && new Date(job.next_run_at).getTime() > Date.now()) return job;

  const claim = await incrementStudioJobAttempt({ supabase: args.supabase, jobId: args.jobId });
  if (!claim.allowed) {
    if (claim.busy) return job;
    await updateStudioJobCheckpoint({ supabase: args.supabase, jobId: args.jobId, checkpoint: job.checkpoint, status: "dead_letter", lastError: "Se agotó el máximo de intentos del job." });
    await recordStudioAudit({ supabase: args.supabase, businessId: job.business_id, userId: args.userId, jobId: job.id, action: "studio.job.dead_letter" });
    return await getStudioJob({ supabase: args.supabase, jobId: args.jobId });
  }
  if (!claim.lockToken) throw Object.assign(new Error("No se pudo obtener el lease del job"), { code: "LEASE_NOT_ACQUIRED" });
  const lockToken = claim.lockToken;

  await recordStudioAudit({ supabase: args.supabase, businessId: job.business_id, userId: args.userId, jobId: job.id, action: "studio.job.started", metadata: { attempt: claim.attempts } });
  let checkpoint = resumeExecution(job.checkpoint);
  await updateStudioJobCheckpoint({ supabase: args.supabase, jobId: args.jobId, checkpoint, status: "running", lastError: null, lockToken });
  const outputs = checkpoint.steps.filter((step) => step.status === "completed" && step.result).map((step) => ({ step: step.step, capability: step.capability, result: step.result as string }));
  const outputByStep = new Map(outputs.map((output) => [output.step, output.result]));
  const plan = job.plan;

  try {
    for (const step of getRunnableSteps(plan, checkpoint)) {
      const current = checkpoint.steps.find((item) => item.step === step.index);
      const attempts = (current?.attempts ?? 0) + 1;
      checkpoint = markStep(checkpoint, step.index, { status: "running", attempts, error: undefined });
      await upsertStudioJobStep({ supabase: args.supabase, jobId: args.jobId, step, status: "running", attempts });
      await updateStudioJobCheckpoint({ supabase: args.supabase, jobId: args.jobId, checkpoint, status: "running", lockToken });
      const dependencies = step.dependsOn.map((dependency) => outputByStep.get(dependency)).filter(Boolean).join("\n\n");
      const prompt = [`Objetivo: ${job.goal}`, `Paso ${step.index + 1}: ${step.instruction}`, dependencies ? `Resultados de pasos anteriores:\n${dependencies}` : "", "Produce un entregable concreto y utilizable. No inventes datos empresariales."].filter(Boolean).join("\n\n");

      if (MEDIA_CAPABILITIES.has(step.capability)) {
        const result = await withStudioJobLease({ supabase: args.supabase, jobId: args.jobId, lockToken, task: () => executeStudioMedia({ businessId: job.business_id, userId: args.userId, jobId: args.jobId, step: step.index, capability: step.capability as "image" | "image_edit" | "video" | "voice", prompt, supabase: args.supabase }) });
        if (result.status === "completed") { const output = result.signedUrl ?? result.storagePath ?? result.status; outputByStep.set(step.index, output); checkpoint = markStep(checkpoint, step.index, { status: "completed", attempts, result: output }); await upsertStudioJobStep({ supabase: args.supabase, jobId: args.jobId, step, status: "completed", attempts, result }); await updateStudioJobCheckpoint({ supabase: args.supabase, jobId: args.jobId, checkpoint, status: "running", lockToken }); continue; }
        if (result.status === "queued") { checkpoint = markStep(checkpoint, step.index, { status: "queued", attempts, result: JSON.stringify(result) }); await upsertStudioJobStep({ supabase: args.supabase, jobId: args.jobId, step, status: "queued", attempts, result }); await updateStudioJobCheckpoint({ supabase: args.supabase, jobId: args.jobId, checkpoint, status: "waiting", lockToken }); await recordStudioAudit({ supabase: args.supabase, businessId: job.business_id, userId: args.userId, jobId: job.id, action: "studio.job.waiting_callback", metadata: { step: step.index, callbackId: result.callbackId } }); return await getStudioJob({ supabase: args.supabase, jobId: args.jobId }); }
        checkpoint = markStep(checkpoint, step.index, { status: result.status, attempts, error: result.error }); await upsertStudioJobStep({ supabase: args.supabase, jobId: args.jobId, step, status: result.status, attempts, error: result.error, result }); await updateStudioJobCheckpoint({ supabase: args.supabase, jobId: args.jobId, checkpoint, status: result.status === "blocked" ? "blocked" : "failed", lastError: result.error, lockToken }); return await getStudioJob({ supabase: args.supabase, jobId: args.jobId });
      }

      const toolId = TOOL_BY_CAPABILITY[step.capability];
      if (!toolId) throw new Error(`Herramienta no registrada: ${step.capability}`);
      const { data: tool, error: toolError } = await args.supabase.from("ai_tool_registry").select("id,cost_units,enabled").eq("id", toolId).eq("enabled", true).maybeSingle();
      if (toolError || !tool) throw new Error(toolError?.message ?? `Herramienta no disponible: ${step.capability}`);
      const { error: reservationError } = await args.supabase.rpc("reserve_ai_tool_quota" as never, { p_business_id: job.business_id, p_tool_id: toolId, p_units: tool.cost_units } as never);
      if (reservationError) throw new Error("Se alcanzó el límite de uso de una de las herramientas del plan.");
      try {
        const task = await withStudioJobLease({ supabase: args.supabase, jobId: args.jobId, lockToken, task: () => runNuvaStudioTask({ businessId: job.business_id, capability: step.capability, prompt, supabase: args.supabase }) });
        outputByStep.set(step.index, task.text); checkpoint = markStep(checkpoint, step.index, { status: "completed", attempts, result: task.text }); await upsertStudioJobStep({ supabase: args.supabase, jobId: args.jobId, step, status: "completed", attempts, result: { text: task.text } }); await updateStudioJobCheckpoint({ supabase: args.supabase, jobId: args.jobId, checkpoint, status: "running", lockToken });
      } catch (error) { await args.supabase.rpc("release_ai_tool_quota" as never, { p_business_id: job.business_id, p_tool_id: toolId, p_units: tool.cost_units } as never); throw error; }
    }

    const completed = checkpoint.steps.filter((step) => step.status === "completed").map((step) => ({ step: step.step, capability: step.capability, result: step.result ?? "" }));
    const media = checkpoint.steps.filter((step) => ["queued", "blocked", "failed"].includes(step.status)).map((step) => ({ step: step.step, capability: step.capability as "image" | "image_edit" | "video" | "voice", status: step.status === "queued" ? "ready" : "blocked", input: plan.find((item) => item.index === step.step)?.instruction ?? "", reason: step.error }));
    const result = jsonResult({ status: media.length ? "partial" : "completed", completed, media });
    await updateStudioJobCheckpoint({ supabase: args.supabase, jobId: args.jobId, checkpoint, status: result.status, result, nextRunAt: null, lockToken });
    await recordStudioAudit({ supabase: args.supabase, businessId: job.business_id, userId: args.userId, jobId: job.id, action: media.length ? "studio.job.partial" : "studio.job.completed", metadata: { completedSteps: completed.length } });
    return await getStudioJob({ supabase: args.supabase, jobId: args.jobId });
  } catch (error) {
    if (error instanceof Error && error.message === "Studio job lease lost; stale worker fenced") {
      await recordStudioAudit({ supabase: args.supabase, businessId: job.business_id, userId: args.userId, jobId: job.id, action: "studio.job.stale_worker_fenced", metadata: { attempt: claim.attempts } });
      return await getStudioJob({ supabase: args.supabase, jobId: args.jobId });
    }
    const nextAttempt = claim.attempts;
    const retryAt = new Date(Date.now() + exponentialBackoffMs(nextAttempt)).toISOString();
    checkpoint = { ...checkpoint, status: "failed", updatedAt: new Date().toISOString() };
    const nextStatus = nextAttempt < job.max_attempts ? "queued" : "dead_letter";
    await updateStudioJobCheckpoint({ supabase: args.supabase, jobId: args.jobId, checkpoint, status: nextStatus, lastError: error, nextRunAt: nextStatus === "queued" ? retryAt : null, lockToken });
    await recordStudioAudit({ supabase: args.supabase, businessId: job.business_id, userId: args.userId, jobId: job.id, action: nextStatus === "queued" ? "studio.job.retry_scheduled" : "studio.job.dead_letter", metadata: { attempt: nextAttempt, retryAt } });
    return await getStudioJob({ supabase: args.supabase, jobId: args.jobId });
  }
}
