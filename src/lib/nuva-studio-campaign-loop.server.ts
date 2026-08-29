import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createStudioPlanAndJob, runStudioJob } from "@/lib/nuva-studio-job-runner.server";

type Campaign = { id: string; business_id: string; user_id: string; name: string; goal: string; status: string; cadence_hours: number; max_cycles: number; cycles_completed: number; next_run_at: string; last_run_at: string | null };

type CampaignCycle = { id: string; campaign_id: string; cycle_number: number; studio_job_id: string | null; objective: string; status: string; learnings: Record<string, unknown>; metrics: Record<string, unknown> };

function db(supabase: SupabaseClient<Database>) { return supabase as unknown as { from: (table: string) => any }; }

export async function createStudioCampaign(args: { supabase: SupabaseClient<Database>; businessId: string; userId: string; name: string; goal: string; cadenceHours?: number; maxCycles?: number }) {
  const cadenceHours = Math.min(Math.max(args.cadenceHours ?? 24, 1), 720);
  const maxCycles = Math.min(Math.max(args.maxCycles ?? 0, 0), 1000);
  const { data, error } = await db(args.supabase).from("nuva_studio_campaigns").insert({ business_id: args.businessId, user_id: args.userId, name: args.name.trim().slice(0, 200), goal: args.goal.trim().slice(0, 12000), cadence_hours: cadenceHours, max_cycles: maxCycles, next_run_at: new Date().toISOString() }).select("*").single();
  if (error) throw new Error(error.message);
  return data as Campaign;
}

export async function runDueStudioCampaign(args: { supabase: SupabaseClient<Database>; campaign: Campaign }) {
  if (args.campaign.status !== "active") return { skipped: true, reason: "inactive" };
  if (args.campaign.max_cycles > 0 && args.campaign.cycles_completed >= args.campaign.max_cycles) {
    await db(args.supabase).from("nuva_studio_campaigns").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", args.campaign.id).eq("status", "active");
    return { skipped: true, reason: "cycle_limit" };
  }

  const cycleNumber = args.campaign.cycles_completed + 1;
  const objective = [
    `Campaña: ${args.campaign.name}`,
    `Objetivo permanente: ${args.campaign.goal}`,
    `Ciclo autónomo #${cycleNumber}.`,
    "Investiga el contexto disponible, produce activos/entregables útiles y deja resultados reutilizables para el siguiente ciclo.",
    "No inventes métricas. Si faltan métricas de rendimiento, identifica explícitamente qué dato debe recopilarse antes de optimizar."
  ].join("\n\n");

  const cycleInsert = await db(args.supabase).from("nuva_studio_campaign_cycles").insert({ campaign_id: args.campaign.id, cycle_number: cycleNumber, objective, status: "running", started_at: new Date().toISOString() }).select("*").single();
  if (cycleInsert.error) {
    if (String(cycleInsert.error.message).includes("duplicate key")) return { skipped: true, reason: "already_claimed" };
    throw new Error(cycleInsert.error.message);
  }
  const cycle = cycleInsert.data as CampaignCycle;
  const idempotencyKey = `campaign:${args.campaign.id}:cycle:${cycleNumber}`;
  try {
    const planned = await createStudioPlanAndJob({ supabase: args.supabase, businessId: args.campaign.business_id, userId: args.campaign.user_id, prompt: objective, maxSteps: 6, idempotencyKey });
    await db(args.supabase).from("nuva_studio_campaign_cycles").update({ studio_job_id: planned.job.id }).eq("id", cycle.id);
    const job = planned.job.status === "completed" || planned.job.status === "partial" || planned.job.status === "dead_letter" ? planned.job : await runStudioJob({ supabase: args.supabase, jobId: planned.job.id, userId: args.campaign.user_id });
    const terminal = ["completed", "partial", "failed", "dead_letter", "cancelled"].includes(job.status);
    const nextRunAt = new Date(Date.now() + args.campaign.cadence_hours * 60 * 60 * 1000).toISOString();
    await db(args.supabase).from("nuva_studio_campaigns").update({ cycles_completed: terminal ? cycleNumber : args.campaign.cycles_completed, last_run_at: new Date().toISOString(), next_run_at: nextRunAt, updated_at: new Date().toISOString(), status: terminal && args.campaign.max_cycles > 0 && cycleNumber >= args.campaign.max_cycles ? "completed" : "active" }).eq("id", args.campaign.id).eq("cycles_completed", args.campaign.cycles_completed);
    const cycleStatus = job.status === "completed" ? "completed" : job.status === "partial" ? "partial" : job.status === "cancelled" ? "cancelled" : job.status === "dead_letter" ? "failed" : "running";
    await db(args.supabase).from("nuva_studio_campaign_cycles").update({ status: cycleStatus, completed_at: terminal ? new Date().toISOString() : null, learnings: { jobStatus: job.status, completedSteps: job.result?.completed?.length ?? 0, media: job.result?.media ?? [] } }).eq("id", cycle.id);
    return { skipped: false, campaignId: args.campaign.id, cycleId: cycle.id, jobId: planned.job.id, status: job.status };
  } catch (error) {
    await db(args.supabase).from("nuva_studio_campaign_cycles").update({ status: "failed", completed_at: new Date().toISOString(), learnings: { error: error instanceof Error ? error.message.slice(0, 4000) : String(error).slice(0, 4000) } }).eq("id", cycle.id);
    await db(args.supabase).from("nuva_studio_campaigns").update({ next_run_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), updated_at: new Date().toISOString() }).eq("id", args.campaign.id);
    throw error;
  }
}

export async function runDueStudioCampaigns(args: { supabase: SupabaseClient<Database>; limit?: number }) {
  const now = new Date().toISOString();
  const limit = Math.min(Math.max(args.limit ?? 3, 1), 10);
  const { data, error } = await db(args.supabase).from("nuva_studio_campaigns").select("*").eq("status", "active").lte("next_run_at", now).order("next_run_at", { ascending: true }).limit(limit);
  if (error) throw new Error(error.message);
  const results: unknown[] = [];
  for (const campaign of (data ?? []) as Campaign[]) {
    try { results.push(await runDueStudioCampaign({ supabase: args.supabase, campaign })); } catch (error) { results.push({ campaignId: campaign.id, error: error instanceof Error ? error.message : String(error) }); }
  }
  return results;
}
