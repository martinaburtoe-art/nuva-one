import type { SupabaseClient } from "@supabase/supabase-js";
import type { StudioExecutionCheckpoint, StudioExecutionResult, StudioExecutionStep, StudioStepStatus } from "@/lib/nuva-studio-execution.server";

const MAX_ERROR_LENGTH = 4000;
const LOCK_TTL_MS = 5 * 60 * 1000;
const LOCK_HEARTBEAT_MS = 60 * 1000;
type StudioJobRow = { id: string; business_id: string; user_id: string; status: string; goal: string; plan: StudioExecutionStep[]; checkpoint: StudioExecutionCheckpoint; result: StudioExecutionResult | null; idempotency_key: string; attempts: number; max_attempts: number; last_error: string | null; next_run_at: string | null; locked_at: string | null; execution_lock_token: string | null; completed_at: string | null; cancelled_at: string | null };
function jobs(supabase: SupabaseClient) { return supabase; }
function cleanError(error: unknown) { return (error instanceof Error ? error.message : String(error)).replaceAll("\0", "").slice(0, MAX_ERROR_LENGTH); }

export async function recordStudioAudit(args: { supabase: SupabaseClient; businessId: string; userId: string; jobId: string; action: string; metadata?: Record<string, unknown> }) { try { await jobs(args.supabase).from("audit_log").insert({ business_id: args.businessId, user_id: args.userId, action: args.action, entity: "nuva_studio_job", entity_id: args.jobId, metadata: args.metadata ?? {} }); } catch { /* audit is best-effort */ } }
export async function getStudioJobByIdempotency(args: { supabase: SupabaseClient; businessId: string; idempotencyKey: string }) { const { data, error } = await jobs(args.supabase).from("nuva_studio_jobs").select("*").eq("business_id", args.businessId).eq("idempotency_key", args.idempotencyKey).maybeSingle(); if (error) throw new Error(error.message); return (data as StudioJobRow | null) ?? null; }
export async function createOrGetStudioJob(args: { supabase: SupabaseClient; businessId: string; userId: string; goal: string; plan: StudioExecutionStep[]; checkpoint: StudioExecutionCheckpoint; idempotencyKey: string; maxAttempts?: number }) { const client = jobs(args.supabase); const existing = await getStudioJobByIdempotency({ supabase: args.supabase, businessId: args.businessId, idempotencyKey: args.idempotencyKey }); if (existing) return { job: existing, created: false }; const inserted = await client.from("nuva_studio_jobs").insert({ business_id: args.businessId, user_id: args.userId, status: "queued", goal: args.goal.slice(0, 12000), plan: args.plan, checkpoint: args.checkpoint, idempotency_key: args.idempotencyKey.slice(0, 200), max_attempts: Math.min(Math.max(args.maxAttempts ?? 3, 1), 10) }).select("*").single(); if (!inserted.error) return { job: inserted.data as StudioJobRow, created: true }; const raced = await getStudioJobByIdempotency({ supabase: args.supabase, businessId: args.businessId, idempotencyKey: args.idempotencyKey }); if (!raced) throw new Error(inserted.error.message); return { job: raced, created: false }; }

export async function renewStudioJobLease(args: { supabase: SupabaseClient; jobId: string; lockToken: string }) { const { data, error } = await jobs(args.supabase).from("nuva_studio_jobs").update({ locked_at: new Date().toISOString() }).eq("id", args.jobId).eq("execution_lock_token", args.lockToken).eq("status", "running").select("id").maybeSingle(); if (error) throw new Error(error.message); if (!data) throw Object.assign(new Error("Studio job lease lost; stale worker fenced"), { code: "LEASE_LOST" }); }

export async function withStudioJobLease<T>(args: { supabase: SupabaseClient; jobId: string; lockToken: string; task: () => Promise<T> }): Promise<T> { await renewStudioJobLease({ supabase: args.supabase, jobId: args.jobId, lockToken: args.lockToken }); const heartbeat = setInterval(() => { void renewStudioJobLease({ supabase: args.supabase, jobId: args.jobId, lockToken: args.lockToken }).catch(() => { /* task result handles the authoritative lease check */ }); }, LOCK_HEARTBEAT_MS); try { return await args.task(); } finally { clearInterval(heartbeat); } }

export async function updateStudioJobCheckpoint(args: { supabase: SupabaseClient; jobId: string; checkpoint: StudioExecutionCheckpoint; status?: string; result?: StudioExecutionResult | null; lastError?: unknown; nextRunAt?: string | null; lockToken?: string }) {
  const patch: Record<string, unknown> = { checkpoint: args.checkpoint };
  if (args.status) patch.status = args.status;
  if (args.result !== undefined) patch.result = args.result;
  if (args.lastError !== undefined) patch.last_error = args.lastError === null ? null : cleanError(args.lastError);
  if (args.nextRunAt !== undefined) patch.next_run_at = args.nextRunAt;
  if (["completed", "partial", "blocked", "failed", "cancelled", "dead_letter"].includes(args.status ?? "")) { patch.completed_at = new Date().toISOString(); patch.locked_at = null; patch.execution_lock_token = null; }
  if (["queued", "waiting"].includes(args.status ?? "")) { patch.locked_at = null; patch.execution_lock_token = null; }
  let query = jobs(args.supabase).from("nuva_studio_jobs").update(patch).eq("id", args.jobId);
  if (args.lockToken) query = query.eq("execution_lock_token", args.lockToken);
  const { data, error } = await query.select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (args.lockToken && !data) throw Object.assign(new Error("Studio job lease lost; stale worker fenced"), { code: "LEASE_LOST" });
}

export async function updateStudioJobStatus(args: { supabase: SupabaseClient; jobId: string; status: string; lastError?: unknown; nextRunAt?: string | null }) { const patch: Record<string, unknown> = { status: args.status, locked_at: null, execution_lock_token: null }; if (args.lastError !== undefined) patch.last_error = args.lastError === null ? null : cleanError(args.lastError); if (args.nextRunAt !== undefined) patch.next_run_at = args.nextRunAt; if (args.status === "cancelled") patch.cancelled_at = new Date().toISOString(); if (["completed", "partial", "blocked", "failed", "cancelled", "dead_letter"].includes(args.status)) patch.completed_at = new Date().toISOString(); const { error } = await jobs(args.supabase).from("nuva_studio_jobs").update(patch).eq("id", args.jobId); if (error) throw new Error(error.message); }

export async function incrementStudioJobAttempt(args: { supabase: SupabaseClient; jobId: string }) {
  const client = jobs(args.supabase);
  const current = await client.from("nuva_studio_jobs").select("attempts,max_attempts,locked_at,status").eq("id", args.jobId).single();
  if (current.error || !current.data) throw new Error(current.error?.message ?? "Job no encontrado");
  const currentStatus = String(current.data.status);
  if (["completed", "partial", "blocked", "cancelled", "dead_letter"].includes(currentStatus)) return { allowed: false, attempts: Number(current.data.attempts ?? 0), busy: false, lockToken: null };
  const lockedAt = current.data.locked_at ? new Date(current.data.locked_at).getTime() : 0;
  if (lockedAt && Date.now() - lockedAt < LOCK_TTL_MS) return { allowed: false, attempts: Number(current.data.attempts ?? 0), busy: true, lockToken: null };
  const attempts = Number(current.data.attempts ?? 0) + 1;
  if (attempts > Number(current.data.max_attempts ?? 3)) return { allowed: false, attempts, busy: false, lockToken: null };
  const staleBefore = new Date(Date.now() - LOCK_TTL_MS).toISOString();
  const lockToken = crypto.randomUUID();
  const claim = await client.from("nuva_studio_jobs").update({ attempts, status: "running", locked_at: new Date().toISOString(), execution_lock_token: lockToken, next_run_at: null }).eq("id", args.jobId).or(`locked_at.is.null,locked_at.lt.${staleBefore}`).select("id,execution_lock_token").maybeSingle();
  if (claim.error) throw new Error(claim.error.message);
  if (!claim.data) return { allowed: false, attempts: attempts - 1, busy: true, lockToken: null };
  return { allowed: true, attempts, busy: false, lockToken };
}

export async function upsertStudioJobStep(args: { supabase: SupabaseClient; jobId: string; step: StudioExecutionStep; status: StudioStepStatus; attempts: number; result?: unknown; error?: unknown }) { const now = new Date().toISOString(); const row = { job_id: args.jobId, step: args.step.index, capability: args.step.capability, instruction: args.step.instruction, depends_on: args.step.dependsOn, status: args.status, attempts: args.attempts, result: args.result ?? null, error: args.error === undefined ? null : cleanError(args.error), started_at: args.status === "running" ? now : undefined, completed_at: ["completed", "failed", "blocked"].includes(args.status) ? now : undefined }; const { error } = await jobs(args.supabase).from("nuva_studio_job_steps").upsert(row, { onConflict: "job_id,step" }); if (error) throw new Error(error.message); }
export async function createStudioCallback(args: { supabase: SupabaseClient; jobId: string; step: number; callbackType: "video" | "media" | "generic"; tokenHash: string; expiresAt?: string }) { const { data, error } = await jobs(args.supabase).from("nuva_studio_job_callbacks").insert({ job_id: args.jobId, step: args.step, callback_type: args.callbackType, token_hash: args.tokenHash, expires_at: args.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }).select("id").single(); if (error) throw new Error(error.message); return data as { id: string }; }
export async function getStudioJob(args: { supabase: SupabaseClient; jobId: string }) { const { data, error } = await jobs(args.supabase).from("nuva_studio_jobs").select("*").eq("id", args.jobId).maybeSingle(); if (error) throw new Error(error.message); return (data as StudioJobRow | null) ?? null; }
export function exponentialBackoffMs(attempt: number) { return Math.min(60_000, 1_000 * 2 ** Math.max(0, attempt - 1)); }
