-- Nüva Studio: lease fencing for concurrent workers.
-- A UUID lease token prevents a stale worker from overwriting a newer worker's state.
ALTER TABLE public.nuva_studio_jobs
  ADD COLUMN IF NOT EXISTS execution_lock_token uuid;

CREATE INDEX IF NOT EXISTS idx_nuva_studio_jobs_execution_lock
  ON public.nuva_studio_jobs (id, execution_lock_token);

COMMENT ON COLUMN public.nuva_studio_jobs.execution_lock_token IS
  'Fencing token for the active Studio worker lease; stale workers cannot mutate job state.';
