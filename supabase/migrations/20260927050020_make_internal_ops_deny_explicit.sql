-- Internal operational telemetry tables are service-only.
-- Explicit client-deny policies document and preserve that contract.

begin;

create policy "Client access denied" on public.ops_anomalies
  for all to anon, authenticated using (false) with check (false);
create policy "Client access denied" on public.ops_findings
  for all to anon, authenticated using (false) with check (false);
create policy "Client access denied" on public.ops_llm_usage
  for all to anon, authenticated using (false) with check (false);
create policy "Client access denied" on public.ops_metrics_hourly
  for all to anon, authenticated using (false) with check (false);

commit;
