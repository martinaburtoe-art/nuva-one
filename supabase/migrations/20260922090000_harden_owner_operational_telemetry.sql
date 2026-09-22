-- Owner operations telemetry is deliberately identifier-free.
-- Deployment retry marker: schema remains unchanged.
-- No user_id, business_id, session_id, IP, cookie, token or request body is stored.

create table if not exists public.owner_operational_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('client_error','unhandled_rejection','route_error','api_error','web_vital')),
  route text,
  service text,
  status_code integer check (status_code between 100 and 599),
  duration_ms integer check (duration_ms >= 0 and duration_ms <= 120000),
  metric_name text check (metric_name is null or metric_name in ('LCP','INP','CLS','FCP','TTFB')),
  metric_value numeric check (metric_value is null or metric_value >= 0),
  error_fingerprint text,
  environment text not null default 'production',
  created_at timestamptz not null default now()
);

alter table public.owner_operational_events enable row level security;

revoke all on public.owner_operational_events from anon, authenticated;
grant select, insert, update, delete, truncate on public.owner_operational_events to service_role;

create policy owner_operational_events_deny_anon on public.owner_operational_events
  for all to anon using (false) with check (false);
create policy owner_operational_events_deny_authenticated on public.owner_operational_events
  for all to authenticated using (false) with check (false);

create index if not exists owner_operational_events_created_at_idx
  on public.owner_operational_events (created_at desc);

create index if not exists owner_operational_events_error_idx
  on public.owner_operational_events (event_type, error_fingerprint, created_at desc)
  where event_type in ('client_error','unhandled_rejection','route_error','api_error');

create or replace function public.get_owner_operational_metrics(p_window_hours integer default 24)
returns jsonb
language sql
security definer
set search_path = ''
as $function$
  with bounds as (
    select
      greatest(1, least(p_window_hours, 720)) as hours,
      now() as current_at
  ),
  windowed as (
    select e.*
    from public.owner_operational_events e, bounds b
    where e.created_at >= b.current_at - make_interval(hours => b.hours)
  ),
  errors as (
    select
      count(*)::int as total,
      count(*) filter (
        where event_type in ('client_error','unhandled_rejection','route_error','api_error')
      )::int as error_events,
      count(distinct error_fingerprint) filter (
        where error_fingerprint is not null
      )::int as distinct_errors
    from windowed
  ),
  one_hour as (
    select
      count(*) filter (where event_type in ('client_error','unhandled_rejection','route_error','api_error'))::numeric as errors,
      count(*) filter (where event_type in ('client_error','unhandled_rejection','route_error','api_error','web_vital'))::numeric as total
    from public.owner_operational_events
    where created_at >= now() - interval '1 hour'
  ),
  five_minutes as (
    select
      count(*) filter (where event_type in ('client_error','unhandled_rejection','route_error','api_error'))::numeric as errors,
      count(*) filter (where event_type in ('client_error','unhandled_rejection','route_error','api_error','web_vital'))::numeric as total
    from public.owner_operational_events
    where created_at >= now() - interval '5 minutes'
  ),
  performance as (
    select
      percentile_cont(0.50) within group (order by duration_ms)::numeric as latency_p50_ms,
      percentile_cont(0.95) within group (order by duration_ms)::numeric as latency_p95_ms,
      percentile_cont(0.99) within group (order by duration_ms)::numeric as latency_p99_ms
    from windowed
    where duration_ms is not null
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
      select
        service,
        count(*)::int as requests,
        count(*) filter (
          where event_type = 'api_error' or coalesce(status_code, 200) >= 500
        )::int as errors,
        round(avg(duration_ms) filter (where duration_ms is not null)::numeric, 1) as avg_duration_ms
      from windowed
      where service is not null
      group by service
    ) q
  ),
  top_errors as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'fingerprint', error_fingerprint,
      'route', route,
      'service', service,
      'count', occurrences
    ) order by occurrences desc), '[]'::jsonb) as data
    from (
      select
        error_fingerprint,
        max(route) as route,
        max(service) as service,
        count(*)::int as occurrences
      from windowed
      where event_type in ('client_error','unhandled_rejection','route_error','api_error')
        and error_fingerprint is not null
      group by error_fingerprint
      order by occurrences desc
      limit 10
    ) q
  )
  select jsonb_build_object(
    'window_hours', (select hours from bounds),
    'events', (select total from errors),
    'error_events', (select error_events from errors),
    'distinct_errors', (select distinct_errors from errors),
    'error_rate_5m', case when (select total from five_minutes) = 0 then 0
      else round(((select errors from five_minutes) / (select total from five_minutes) * 100)::numeric, 2) end,
    'error_rate_1h', case when (select total from one_hour) = 0 then 0
      else round(((select errors from one_hour) / (select total from one_hour) * 100)::numeric, 2) end,
    'latency_p50_ms', (select latency_p50_ms from performance),
    'latency_p95_ms', (select latency_p95_ms from performance),
    'latency_p99_ms', (select latency_p99_ms from performance),
    'vitals', (select row_to_json(vitals)::jsonb from vitals),
    'services', (select data from services),
    'top_errors', (select data from top_errors),
    'source_available', exists(select 1 from windowed),
    'generated_at', now()
  );
$function$;

revoke all on function public.get_owner_operational_metrics(integer) from public, anon, authenticated;
grant execute on function public.get_owner_operational_metrics(integer) to service_role;
