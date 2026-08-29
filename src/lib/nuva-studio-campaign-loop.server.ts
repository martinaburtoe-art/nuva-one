import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createStudioPlanAndJob, runStudioJob } from "@/lib/nuva-studio-job-runner.server";
import { evaluateStudioCampaignCycle } from "@/lib/nuva-studio-campaign-evaluator.server";

type Campaign = { id: string; business_id: string; user_id: string; name: string; goal: string; status: string; cadence_hours: number; max_cycles: number; cycles_completed: number; next_run_at: string; last_run_at: string | null };
type CampaignCycle = { id: string; campaign_id: string; cycle_number: number; studio_job_id: string | null; objective: string; status: string; learnings: Record<string, unknown>; metrics: Record<string, unknown>; execution_attempts?: number };
function db(supabase: SupabaseClient<Database>) { return supabase as unknown as { from: (table: string) => any }; }

export async function createStudioCampaign(args: { supabase: SupabaseClient<Database>; businessId: string; userId: string; name: string; goal: string; cadenceHours?: number; maxCycles?: number }) {
  const cadenceHours = Math.min(Math.max(args.cadenceHours ?? 24, 1), 720);
  const maxCycles = Math.min(Math.max(args.maxCycles ?? 0, 0), 1000);
  const { data, error } = await db(args.supabase).from("nuva_studio_campaigns").insert({ business_id: args.businessId, user_id: args.userId, name: args.name.trim().slice(0, 200), goal: args.goal.trim().slice(0, 12000), cadence_hours: cadenceHours, max_cycles: maxCycles, next_run_at: new Date().toISOString() }).select("*").single();
  if (error) throw new Error(error.message);
  return data as Campaign;
}

async function previousCycleGuidance(supabase: SupabaseClient<Database>, campaignId: string, cycleNumber: number) {
  if (cycleNumber <= 1) return null;
  const { data: evaluation } = await db(supabase)
    .from("nuva_studio_campaign_evaluations")
    .select("decision, confidence, recommended_changes, missing_metrics, evidence")
    .eq("campaign_id", campaignId)
    .eq("cycle_id", db(supabase).from ? (await db(supabase).from("nuva_studio_campaign_cycles").select("id").eq("campaign_id", campaignId).eq("cycle_number", cycleNumber - 1).maybeSingle()).data?.id : null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return evaluation ?? null;
}

export async function runDueStudioCampaign(args: { supabase: SupabaseClient<Database>; campaign: Campaign }) {
  if (args.campaign.status !== "active") return { skipped: true, reason: "inactive" };
  if (args.campaign.max_cycles > 0 && args.campaign.cycles_completed >= args.campaign.max_cycles) { await db(args.supabase).from("nuva_studio_campaigns").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", args.campaign.id).eq("status", "active"); return { skipped: true, reason: "cycle_limit" }; }

  const cycleNumber = args.campaign.cycles_completed + 1;
  const existing = await db(args.supabase).from("nuva_studio_campaign_cycles").select("*").eq("campaign_id", args.campaign.id).eq("cycle_number", cycleNumber).maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  let cycle = existing.data as CampaignCycle | null;
  const guidance = !cycle ? await previousCycleGuidance(args.supabase, args.campaign.id, cycleNumber) : null;
  const objective = cycle?.objective ?? [`Campaña: ${args.campaign.name}`, `Objetivo permanente: ${args.campaign.goal}`, `Ciclo autónomo #${cycleNumber}.`, "Investiga el contexto disponible, produce activos/entregables útiles y deja resultados reutilizables para el siguiente ciclo.", guidance ? `Decisión basada en evidencia del ciclo anterior: ${guidance.decision} (confianza ${guidance.confidence}). Recomendaciones: ${JSON.stringify(guidance.recommended_changes ?? [])}. Métricas faltantes: ${JSON.stringify(guidance.missing_metrics ?? [])}. Usa esta información como señal de optimización; no la conviertas en hechos no observados.` : "No existe evaluación previa. Establece una línea base y no inventes métricas.", "No inventes métricas. Si faltan métricas de rendimiento, identifica explícitamente qué dato debe recopilarse antes de optimizar."].join("\n\n");

  if (!cycle) {
    const inserted = await db(args.supabase).from("nuva_studio_campaign_cycles").insert({ campaign_id: args.campaign.id, cycle_number: cycleNumber, objective, status: "running", started_at: new Date().toISOString() }).select("*").single();
    if (inserted.error) {
      const raced = await db(args.supabase).from("nuva_studio_campaign_cycles").select("*").eq("campaign_id", args.campaign.id).eq("cycle_number", cycleNumber).maybeSingle();
      if (raced.error || !raced.data) throw new Error(inserted.error.message);
      cycle = raced.data as CampaignCycle;
    } else cycle = inserted.data as CampaignCycle;
  }

  try {
    const job = cycle.studio_job_id ? await db(args.supabase).from("nuva_studio_jobs").select("*").eq("id", cycle.studio_job_id).maybeSingle() : { data: null, error: null };
    if (job.error) throw new Error(job.error.message);
    let plannedJob = job.data;
    const attempt = (cycle.execution_attempts ?? 0) + 1;
    if (!plannedJob) {
      const planned = await createStudioPlanAndJob({ supabase: args.supabase, businessId: args.campaign.business_id, userId: args.campaign.user_id, prompt: objective, maxSteps: 6, idempotencyKey: `campaign:${args.campaign.id}:cycle:${cycleNumber}:attempt:${attempt}` });
      plannedJob = planned.job;
      await db(args.supabase).from("nuva_studio_campaign_cycles").update({ studio_job_id: plannedJob.id, execution_attempts: attempt }).eq("id", cycle.id).is("studio_job_id", null);
    }
    const terminalBeforeRun = ["completed", "partial", "failed", "dead_letter", "cancelled"].includes(String(plannedJob.status));
    const jobResult = terminalBeforeRun ? plannedJob : await runStudioJob({ supabase: args.supabase, jobId: plannedJob.id, userId: args.campaign.user_id });
    const terminal = ["completed", "partial", "failed", "dead_letter", "cancelled"].includes(jobResult.status);
    const successfulCycle = jobResult.status === "completed" || jobResult.status === "partial";
    let evaluation = null;
    if (terminal) {
      evaluation = await evaluateStudioCampaignCycle({ supabase: args.supabase, businessId: args.campaign.business_id, campaignId: args.campaign.id, cycleId: cycle.id, cycleNumber, jobStatus: jobResult.status });
    }
    const nextRunAt = new Date(Date.now() + (evaluation?.decision === "retry" ? 60 : args.campaign.cadence_hours) * 60 * 60 * 1000).toISOString();
    const cycleStatus = jobResult.status === "completed" ? "completed" : jobResult.status === "partial" ? "partial" : jobResult.status === "cancelled" ? "cancelled" : jobResult.status === "failed" || jobResult.status === "dead_letter" ? "failed" : "running";
    const learnings = { jobStatus: jobResult.status, completedSteps: jobResult.result?.completed?.length ?? 0, media: jobResult.result?.media ?? [], evaluation: evaluation ? { decision: evaluation.decision, confidence: evaluation.confidence, evidence: evaluation.evidence, missingMetrics: evaluation.missing_metrics, recommendedChanges: evaluation.recommended_changes } : null };
    await db(args.supabase).from("nuva_studio_campaign_cycles").update({ status: cycleStatus, completed_at: terminal ? new Date().toISOString() : null, learnings, ...(jobResult.status === "failed" || jobResult.status === "dead_letter" ? { studio_job_id: null } : {}) }).eq("id", cycle.id);
    await db(args.supabase).from("nuva_studio_campaigns").update({ cycles_completed: successfulCycle ? cycleNumber : args.campaign.cycles_completed, last_run_at: successfulCycle ? new Date().toISOString() : args.campaign.last_run_at, next_run_at: terminal ? nextRunAt : new Date(Date.now() + 60 * 60 * 1000).toISOString(), updated_at: new Date().toISOString(), status: successfulCycle && args.campaign.max_cycles > 0 && cycleNumber >= args.campaign.max_cycles ? "completed" : "active" }).eq("id", args.campaign.id).eq("cycles_completed", args.campaign.cycles_completed);
    return { skipped: false, campaignId: args.campaign.id, cycleId: cycle.id, jobId: plannedJob.id, status: jobResult.status, evaluation: evaluation ? { decision: evaluation.decision, confidence: evaluation.confidence } : null };
  } catch (error) {
    await db(args.supabase).from("nuva_studio_campaign_cycles").update({ status: "failed", completed_at: new Date().toISOString(), studio_job_id: null, learnings: { error: error instanceof Error ? error.message.slice(0, 4000) : String(error).slice(0, 4000) } }).eq("id", cycle.id);
    await db(args.supabase).from("nuva_studio_campaigns").update({ next_run_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), updated_at: new Date().toISOString() }).eq("id", args.campaign.id);
    throw error;
  }
}

export async function runDueStudioCampaigns(args: { supabase: SupabaseClient<Database>; limit?: number }) {
  const now = new Date().toISOString(); const limit = Math.min(Math.max(args.limit ?? 3, 1), 10);
  const { data, error } = await db(args.supabase).from("nuva_studio_campaigns").select("*").eq("status", "active").lte("next_run_at", now).order("next_run_at", { ascending: true }).limit(limit);
  if (error) throw new Error(error.message);
  const results: unknown[] = [];
  for (const campaign of (data ?? []) as Campaign[]) { try { results.push(await runDueStudioCampaign({ supabase: args.supabase, campaign })); } catch (error) { results.push({ campaignId: campaign.id, error: error instanceof Error ? error.message : String(error) }); } }
  return results;
}
