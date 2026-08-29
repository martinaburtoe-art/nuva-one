create index if not exists nuva_studio_jobs_user_id_idx on public.nuva_studio_jobs (user_id);
create index if not exists nuva_studio_job_callbacks_job_step_idx on public.nuva_studio_job_callbacks (job_id, step);

drop policy if exists nuva_studio_jobs_member_select on public.nuva_studio_jobs;
create policy nuva_studio_jobs_member_select on public.nuva_studio_jobs for select to authenticated using ((select private.is_business_member(business_id, (select auth.uid()))));
drop policy if exists nuva_studio_jobs_member_insert on public.nuva_studio_jobs;
create policy nuva_studio_jobs_member_insert on public.nuva_studio_jobs for insert to authenticated with check ((select private.is_business_member(business_id, (select auth.uid()))) and user_id = (select auth.uid()));
drop policy if exists nuva_studio_jobs_member_update on public.nuva_studio_jobs;
create policy nuva_studio_jobs_member_update on public.nuva_studio_jobs for update to authenticated using ((select private.is_business_member(business_id, (select auth.uid())))) with check ((select private.is_business_member(business_id, (select auth.uid()))));
drop policy if exists nuva_studio_job_steps_member_select on public.nuva_studio_job_steps;
create policy nuva_studio_job_steps_member_select on public.nuva_studio_job_steps for select to authenticated using (exists (select 1 from public.nuva_studio_jobs j where j.id = job_id and (select private.is_business_member(j.business_id, (select auth.uid())))));
drop policy if exists nuva_studio_job_callbacks_member_select on public.nuva_studio_job_callbacks;
create policy nuva_studio_job_callbacks_member_select on public.nuva_studio_job_callbacks for select to authenticated using (exists (select 1 from public.nuva_studio_jobs j where j.id = job_id and (select private.is_business_member(j.business_id, (select auth.uid())))));
drop policy if exists nuva_studio_job_callbacks_member_insert on public.nuva_studio_job_callbacks;
create policy nuva_studio_job_callbacks_member_insert on public.nuva_studio_job_callbacks for insert to authenticated with check (exists (select 1 from public.nuva_studio_jobs j where j.id = job_id and (select private.is_business_member(j.business_id, (select auth.uid())))));

revoke execute on function public.nuva_studio_jobs_set_updated_at() from public, anon, authenticated;
revoke execute on function public.nuva_studio_job_steps_set_updated_at() from public, anon, authenticated;
