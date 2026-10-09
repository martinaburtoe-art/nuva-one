-- Add covering indexes for agency foreign keys flagged by Supabase advisors.
-- These indexes support joins/deletes and are intentionally scoped to the flagged FK columns.
create index if not exists agency_approvals_mission_id_idx
  on public.agency_approvals (mission_id);

create index if not exists agency_approvals_task_id_idx
  on public.agency_approvals (task_id);

create index if not exists agency_artifacts_mission_id_idx
  on public.agency_artifacts (mission_id);

create index if not exists agency_tasks_parent_task_id_idx
  on public.agency_tasks (parent_task_id);
