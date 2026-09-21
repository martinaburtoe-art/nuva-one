create table if not exists public.owner_operational_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('client_error','unhandled_rejection','route_error','api_error','web_vital','health_probe')),
  route text,
  service text,
  status_code integer,
  duration_ms integer,
  metric_name text,
  metric_value numeric,
  error_fingerprint text,
  environment text not null default 'production',
  created_at timestamptz not null default now()
);

create index if not exists owner_operational_events_created_at_idx on public.owner_operational_events (created_at desc);
create index if not exists owner_operational_events_type_created_at_idx on public.owner_operational_events (event_type, created_at desc);
create index if not exists owner_operational_events_route_created_at_idx on public.owner_operational_events (route, created_at desc);

alter table public.owner_operational_events enable row level security;
revoke all on public.owner_operational_events from anon, authenticated;
grant all on public.owner_operational_events to service_role;

comment on table public.owner_operational_events is 'Operational telemetry for platform health. Must not contain personal data, request bodies, tokens, cookies, emails, names, IPs or user identifiers.';

create or replace function public.get_owner_operational_metrics(p_window_hours integer default 24)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with windowed as (
    select *
    from public.owner_operational_events
    where created_at >= now() - make_interval(hours => greatest(1, least(p_window_hours, 720)))
  ),
  errors as (
    select count(*)::int as total,
           count(*) filter (where event_type in ('client_error','unhandled_rejection','route_error','api_error'))::int as error_events,
           count(distinct error_fingerprint) filter (where error_fingerprint is not null)::int as distinct_errors
    from windowed
  ),
  vitals as (
    select
      round(avg(metric_value) filter (where metric_name = 'LCP')::numeric, 1) as lcp_ms,
      round(avg(metric_value) filter (where metric_name = 'INP')::numeric, 1) as inp_ms,
      round(avg(metric_value) filter (where metric_name = 'CLS')::numeric, 3) as cls,
      round(avg(metric_value) filter (where metric_name = 'FCP')::numeric, 1) as fcp_ms,
      round(avg(metric_value) filter (where metric_name = 'TTFB')::numeric, 1) as ttfb_ms
    from windowed
  ),
  services as (
    select coalesce(jsonb_object_agg(service, jsonb_build_object(
      'requests', requests,
      'errors', errors,
      'avg_duration_ms', avg_duration_ms
    )), '{}'::jsonb) as data
    from (
      select service,
             count(*)::int requests,
             count(*) filter (where event_type = 'api_error' or coalesce(status_code, 200) >= 500)::int errors,
             round(avg(duration_ms) filter (where duration_ms is not null)::numeric, 1) avg_duration_ms
      from windowed
      where service is not null
      group by service
    ) q
  )
  select jsonb_build_object(
    'window_hours', greatest(1, least(p_window_hours, 720)),
    'events', (select total from errors),
    'error_events', (select error_events from errors),
    'distinct_errors', (select distinct_errors from errors),
    'vitals', (select row_to_json(vitals)::jsonb from vitals),
    'services', (select data from services),
    'source_available', exists(select 1 from windowed),
    'generated_at', now()
  );
$$;

revoke all on function public.get_owner_operational_metrics(integer) from public, anon, authenticated;
grant execute on function public.get_owner_operational_metrics(integer) to service_role;

create or replace function public.purge_owner_operational_telemetry(p_retention_days integer default 30)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare deleted_count integer;
begin
  delete from public.owner_operational_events
  where created_at < now() - make_interval(days => greatest(1, least(p_retention_days, 90)));
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_owner_operational_telemetry(integer) from public, anon, authenticated;
grant execute on function public.purge_owner_operational_telemetry(integer) to service_role;
