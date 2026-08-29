import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { StudioExecutionCheckpoint, StudioExecutionResult, StudioExecutionStep, StudioStepStatus } from "@/lib/nuva-studio-execution.server";

const MAX_ERROR_LENGTH = 4000;

type StudioJobRow = {
  id: string;
  business_id: string;
  user_id: string;
  status: string;
  goal: string;
  plan: StudioExecutionStep[];
  checkpoint: StudioExecutionCheckpoint;
  result: StudioExecutionResult | null;
  idempotency_key: string;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  next_run_at: string | null;
  locked_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
};

type JobsClient = {
  from: (table: string) => any;
};

function jobs(supabase: SupabaseClient<Database>): JobsClient {
  return supabase as unknown as JobsClient;
}

function cleanError(error: unknown) {
  return (error instanceof Error ? error.message : String(error)).replaceAll("\0", "").slice(0, MAX_ERROR_LENGTH);
}

export async function createOrGetStudioJob(args: {
  supabase: SupabaseClient<Database>;
  businessId: string;
  userId: string;
  goal: string;
  plan: StudioExecutionStep[];
  checkpoint: StudioExecutionCheckpoint;
  idempotencyKey: string;
  maxAttempts?: number;
}) {
  const client = jobs(args.supabase);
  const existing = await client.from("nuva_studio_jobs").select("*").eq("business_id", args.businessId).eq("idempotency_key", args.idempotencyKey).maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return { job: existing.data as StudioJobRow, created: false };

  const payload = {
    business_id: args.businessId,
    user_id: args.userId,
    status: "queued",
    goal: args.goal.slice(0, 12000),
    plan: args.plan,
    checkpoint: args.checkpoint,
    idempotency_key: args.idempotencyKey.slice(0, 200),
    max_attempts: Math.min(Math.max(args.maxAttempts ?? 3, 1), 10),
  };
  const inserted = await client.from("nuva_studio_jobs").insert(payload).select("*").single();
  if (!inserted.error) return { job: inserted.data as StudioJobRow, created: true };

  // Another request can win the unique idempotency race. Read it back rather than duplicating work.
  const raced = await client.from("nuva_studio_jobs").select("*").eq("business_id", args.businessId).eq("idempotency_key", args.idempotencyKey).maybeSingle();
  if (raced.error || !raced.data) throw new Error(inserted.error.message);
  return { job: raced.data as StudioJobRow, created: false };
}

export async function updateStudioJobCheckpoint(args: {
  supabase: SupabaseClient<Database>;
  jobId: string;
  checkpoint: StudioExecutionCheckpoint;
  status?: string;
  result?: StudioExecutionResult | null;
  lastError?: unknown;
  nextRunAt?: string | null;
}) {
  const patch: Record<string, unknown> = { checkpoint: args.checkpoint };
  if (args.status) patch.status = args.status;
  if (args.result !== undefined) patch.result = args.result;
  if (args.lastError !== undefined) patch.last_error = cleanError(args.lastError);
  if (args.nextRunAt !== undefined) patch.next_run_at = args.nextRunAt;
  if (["completed", "partial", "blocked", "failed", "cancelled"].includes(args.status ?? "")) patch.completed_at = new Date().toISOString();
  const { error } = await jobs(args.supabase).from("nuva_studio_jobs").update(patch).eq("id", args.jobId);
  if (error) throw new Error(error.message);
}

export async function updateStudioJobStatus(args: { supabase: SupabaseClient<Database>; jobId: string; status: string; lastError?: unknown; nextRunAt?: string | null }) {
  const patch: Record<string, unknown> = { status: args.status };
  if (args.lastError !== undefined) patch.last_error = cleanError(args.lastError);
  if (args.nextRunAt !== undefined) patch.next_run_at = args.nextRunAt;
  if (args.status === "cancelled") patch.cancelled_at = new Date().toISOString();
  if (["completed", "partial", "blocked", "failed", "cancelled"].includes(args.status)) patch.completed_at = new Date().toISOString();
  const { error } = await jobs(args.supabase).from("nuva_studio_jobs").update(patch).eq("id", args.jobId);
  if (error) throw new Error(error.message);
}

export async function incrementStudioJobAttempt(args: { supabase: SupabaseClient<Database>; jobId: string }) {
  const client = jobs(args.supabase);
  const current = await client.from("nuva_studio_jobs").select("attempts,max_attempts").eq("id", args.jobId).single();
  if (current.error || !current.data) throw new Error(current.error?.message ?? "Job no encontrado");
  const attempts = Number(current.data.attempts ?? 0) + 1;
  if (attempts > Number(current.data.max_attempts ?? 3)) return { allowed: false, attempts };
  const updated = await client.from("nuva_studio_jobs").update({ attempts, status: "running", locked_at: new Date().toISOString() }).eq("id", args.jobId);
  if (updated.error) throw new Error(updated.error.message);
  return { allowed: true, attempts };
}

export async function upsertStudioJobStep(args: {
  supabase: SupabaseClient<Database>;
  jobId: string;
  step: StudioExecutionStep;
  status: StudioStepStatus;
  attempts: number;
  result?: unknown;
  error?: unknown;
}) {
  const row = {
    job_id: args.jobId,
    step: args.step.index,
    capability: args.step.capability,
    instruction: args.step.instruction,
    depends_on: args.step.dependsOn,
    status: args.status,
    attempts: args.attempts,
    result: args.result ?? null,
    error: args.error === undefined ? null : cleanError(args.error),
    started_at: args.status === "running" ? new Date().toISOString() : undefined,
    completed_at: ["completed", "failed", "blocked"].includes(args.status) ? new Date().toISOString() : undefined,
  };
  const { error } = await jobs(args.supabase).from("nuva_studio_job_steps").upsert(row, { onConflict: "job_id,step" });
  if (error) throw new Error(error.message);
}

export async function createStudioCallback(args: { supabase: SupabaseClient<Database>; jobId: string; step: number; callbackType: "video" | "media" | "generic"; tokenHash: string; expiresAt?: string }) {
  const { data, error } = await jobs(args.supabase).from("nuva_studio_job_callbacks").insert({
    job_id: args.jobId,
    step: args.step,
    callback_type: args.callbackType,
    token_hash: args.tokenHash,
    expires_at: args.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }).select("id").single();
  if (error) throw new Error(error.message);
  return data as { id: string };
}

export async function getStudioJob(args: { supabase: SupabaseClient<Database>; jobId: string }) {
  const { data, error } = await jobs(args.supabase).from("nuva_studio_jobs").select("*").eq("id", args.jobId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as StudioJobRow | null) ?? null;
}

export function exponentialBackoffMs(attempt: number) {
  return Math.min(60_000, 1_000 * 2 ** Math.max(0, attempt - 1));
}
