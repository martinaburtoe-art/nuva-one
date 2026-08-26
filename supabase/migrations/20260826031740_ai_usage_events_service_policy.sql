drop policy if exists ai_usage_events_service_role on public.ai_usage_events;
create policy ai_usage_events_service_role on public.ai_usage_events
  for all to service_role
  using (true)
  with check (true);
