-- Fix: audit_log was covered by the generic "Members access %s" FOR ALL
-- policy applied to every business-scoped table, which means any member
-- (including staff/viewer) could UPDATE or DELETE audit log rows -- 
-- defeating the entire purpose of an audit trail, since a malicious or
-- careless member could cover their own tracks.
--
-- Fix: members can INSERT (apps need to write audit events) and SELECT
-- (so the UI can display history), but never UPDATE or DELETE. Only
-- service_role (server-side, e.g. an Edge Function or admin tooling) can
-- modify or remove audit rows, which is already granted separately.

DROP POLICY IF EXISTS "Members access audit_log" ON public.audit_log;

CREATE POLICY "Members read audit_log" ON public.audit_log
  FOR SELECT
  USING (public.is_business_member(business_id, auth.uid()));

CREATE POLICY "Members insert audit_log" ON public.audit_log
  FOR INSERT
  WITH CHECK (public.is_business_member(business_id, auth.uid()));

-- Deliberately no UPDATE or DELETE policy for `authenticated` -- RLS denies
-- by default when no policy matches, so members can no longer alter or
-- erase audit history. service_role (used by trusted server code) still
-- has the table-level GRANT ALL from the original migration and bypasses
-- RLS entirely, so legitimate admin/cleanup tooling is unaffected.
