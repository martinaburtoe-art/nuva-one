create or replace function public.get_owner_operational_metrics(p_window_hours integer default 24)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with windowed as (
    select * from public.owner_operational_events
    where created_at >= now() - make_interval(hours => greatest(1, least(p_window_hours, 720)))
  ),
  errors as (
    select count(*)::int as total,
           count(*) filter (where event_type in ('client_error','unhandled_rejection','route_error','api_error'))::int as error_events,
           count(distinct error_fingerprint) filter (where error_fingerprint is not null)::int as distinct_errors
    from windowed
  ),
  vitals as (
    select round(avg(metric_value) filter (where metric_name = 'LCP')::numeric, 1) lcp_ms,
           round(avg(metric_value) filter (where metric_name = 'INP')::numeric, 1) inp_ms,
           round(avg(metric_value) filter (where metric_name = 'CLS')::numeric, 3) cls,
           round(avg(metric_value) filter (where metric_name = 'FCP')::numeric, 1) fcp_ms,
           round(avg(metric_value) filter (where metric_name = 'TTFB')::numeric, 1) ttfb_ms
    from windowed
  ),
  services as (
    select coalesce(jsonb_object_agg(service, jsonb_build_object('requests', requests, 'errors', errors, 'avg_duration_ms', avg_duration_ms)), '{}'::jsonb) data
    from (
      select service, count(*)::int requests,
             count(*) filter (where event_type = 'api_error' or coalesce(status_code, 200) >= 500)::int errors,
             round(avg(duration_ms) filter (where duration_ms is not null)::numeric, 1) avg_duration_ms
      from windowed where service is not null group by service
    ) q
  ),
  top_errors as (
    select coalesce(jsonb_agg(jsonb_build_object('fingerprint', error_fingerprint, 'route', route, 'service', service, 'count', occurrences) order by occurrences desc), '[]'::jsonb) data
    from (
      select error_fingerprint, max(route) route, max(service) service, count(*)::int occurrences
      from windowed
      where event_type in ('client_error','unhandled_rejection','route_error','api_error') and error_fingerprint is not null
      group by error_fingerprint
      order by occurrences desc
      limit 10
    ) q
  )
  select jsonb_build_object(
    'window_hours', greatest(1, least(p_window_hours, 720)),
    'events', (select total from errors),
    'error_events', (select error_events from errors),
    'distinct_errors', (select distinct_errors from errors),
    'vitals', (select row_to_json(vitals)::jsonb from vitals),
    'services', (select data from services),
    'top_errors', (select data from top_errors),
    'source_available', exists(select 1 from windowed),
    'generated_at', now()
  );
$$;

revoke all on function public.get_owner_operational_metrics(integer) from public, anon, authenticated;
grant execute on function public.get_owner_operational_metrics(integer) to service_role;
