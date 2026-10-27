-- Equipo ML/Anomalías, Guardián de Seguridad y Cost Governor.
create table if not exists public.ops_findings (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  severity text not null check (severity in ('low','medium','high','critical')),
  title text not null check (char_length(title) <= 300),
  details jsonb not null default '{}'::jsonb,
  fingerprint text not null,
  status text not null default 'open' check (status in ('open','acknowledged','resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create unique index if not exists ops_findings_one_open_per_fingerprint on public.ops_findings (fingerprint) where status = 'open';

create table if not exists public.ops_metrics_hourly (
  id bigint generated always as identity primary key,
  metric text not null,
  bucket timestamptz not null,
  avg_value numeric not null,
  sample_count integer not null default 1,
  unique (metric, bucket)
);
create index if not exists ops_metrics_hourly_metric_bucket_idx on public.ops_metrics_hourly (metric, bucket desc);

create table if not exists public.ops_anomalies (
  id uuid primary key default gen_random_uuid(),
  metric text not null,
  observed numeric not null,
  expected numeric not null,
  stddev numeric not null,
  deviations numeric not null,
  severity text not null check (severity in ('info','warning','critical')),
  fingerprint text not null,
  status text not null default 'open' check (status in ('open','resolved')),
  window_bucket timestamptz not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create unique index if not exists ops_anomalies_one_open_per_fingerprint on public.ops_anomalies (fingerprint) where status = 'open';

create table if not exists public.ops_llm_usage (
  id bigint generated always as identity primary key,
  agent text not null,
  provider text not null,
  model text not null,
  est_tokens integer,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.ops_findings enable row level security;
alter table public.ops_metrics_hourly enable row level security;
alter table public.ops_anomalies enable row level security;
alter table public.ops_llm_usage enable row level security;

revoke all on table public.ops_findings, public.ops_metrics_hourly, public.ops_anomalies, public.ops_llm_usage from public, anon, authenticated;
grant select, insert, update on table public.ops_findings, public.ops_metrics_hourly, public.ops_anomalies, public.ops_llm_usage to service_role;

-- Promedio incremental por hora: evita hacer aritmética de concurrencia en el cliente.
create or replace function public.ops_record_metric(p_metric text, p_value numeric)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.ops_metrics_hourly (metric, bucket, avg_value, sample_count)
  values (p_metric, date_trunc('hour', now()), p_value, 1)
  on conflict (metric, bucket) do update
    set avg_value = (public.ops_metrics_hourly.avg_value * public.ops_metrics_hourly.sample_count + excluded.avg_value)
                     / (public.ops_metrics_hourly.sample_count + 1),
        sample_count = public.ops_metrics_hourly.sample_count + 1;
$$;
revoke all on function public.ops_record_metric(text, numeric) from public, anon, authenticated;
grant execute on function public.ops_record_metric(text, numeric) to service_role;

-- Detección por z-score sobre 14 días de historial horario (>=72 muestras), excluyendo el bucket actual.
create or replace function public.ops_detect_anomalies(p_min_history integer default 72)
returns table(metric text, observed numeric, expected numeric, stddev numeric, deviations numeric, window_bucket timestamptz)
language sql
security definer
set search_path = public
as $$
  with current_bucket as (
    select date_trunc('hour', now()) as bucket
  ),
  history as (
    select h.metric, h.avg_value
    from public.ops_metrics_hourly h, current_bucket c
    where h.bucket < c.bucket
      and h.bucket >= c.bucket - interval '14 days'
  ),
  stats as (
    select metric, avg(avg_value) as mean, stddev_pop(avg_value) as sd, count(*) as n
    from history
    group by metric
    having count(*) >= p_min_history
  ),
  current as (
    select h.metric, h.avg_value as observed
    from public.ops_metrics_hourly h, current_bucket c
    where h.bucket = c.bucket
  )
  select cur.metric, cur.observed, s.mean, s.sd,
         case when s.sd > 0 then abs(cur.observed - s.mean) / s.sd else 0 end as deviations,
         (select bucket from current_bucket)
  from current cur
  join stats s on s.metric = cur.metric
  where s.sd > 0 and abs(cur.observed - s.mean) / s.sd >= 3;
$$;
revoke all on function public.ops_detect_anomalies(integer) from public, anon, authenticated;
grant execute on function public.ops_detect_anomalies(integer) to service_role;
