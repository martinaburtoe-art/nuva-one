create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  provider text not null,
  model text not null,
  input_tokens bigint not null default 0 check (input_tokens >= 0),
  output_tokens bigint not null default 0 check (output_tokens >= 0),
  total_tokens bigint not null default 0 check (total_tokens >= 0),
  estimated_cost_usd numeric(18,8) not null default 0 check (estimated_cost_usd >= 0),
  fallback_used boolean not null default false,
  attempts integer not null default 1 check (attempts >= 1),
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_usage_events_created_at on public.ai_usage_events (created_at desc);
create index if not exists idx_ai_usage_events_business_created_at on public.ai_usage_events (business_id, created_at desc);
create index if not exists idx_ai_usage_events_provider_created_at on public.ai_usage_events (provider, created_at desc);

alter table public.ai_usage_events enable row level security;
revoke all on public.ai_usage_events from anon, authenticated;
grant select, insert on public.ai_usage_events to service_role;

drop function if exists public.get_platform_ai_metrics();
create function public.get_platform_ai_metrics()
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  with totals as (
    select
      count(*) filter (where created_at >= now() - interval '24 hours') as events_24h,
      count(*) filter (where created_at >= now() - interval '30 days') as events_30d,
      coalesce(sum(input_tokens) filter (where created_at >= now() - interval '24 hours'), 0) as input_tokens_24h,
      coalesce(sum(output_tokens) filter (where created_at >= now() - interval '24 hours'), 0) as output_tokens_24h,
      coalesce(sum(total_tokens) filter (where created_at >= now() - interval '24 hours'), 0) as total_tokens_24h,
      coalesce(sum(estimated_cost_usd) filter (where created_at >= now() - interval '24 hours'), 0) as estimated_cost_usd_24h,
      coalesce(sum(estimated_cost_usd) filter (where created_at >= now() - interval '30 days'), 0) as estimated_cost_usd_30d,
      count(*) filter (where fallback_used and created_at >= now() - interval '24 hours') as fallbacks_24h,
      coalesce(avg(attempts) filter (where created_at >= now() - interval '24 hours'), 0) as avg_attempts_24h
    from public.ai_usage_events
  ),
  providers as (
    select coalesce(jsonb_object_agg(provider, provider_count), '{}'::jsonb) as providers_24h
    from (
      select provider, count(*) as provider_count
      from public.ai_usage_events
      where created_at >= now() - interval '24 hours'
      group by provider
    ) p
  )
  select jsonb_build_object(
    'events_24h', totals.events_24h,
    'events_30d', totals.events_30d,
    'input_tokens_24h', totals.input_tokens_24h,
    'output_tokens_24h', totals.output_tokens_24h,
    'total_tokens_24h', totals.total_tokens_24h,
    'estimated_cost_usd_24h', totals.estimated_cost_usd_24h,
    'estimated_cost_usd_30d', totals.estimated_cost_usd_30d,
    'fallbacks_24h', totals.fallbacks_24h,
    'avg_attempts_24h', totals.avg_attempts_24h,
    'providers_24h', providers.providers_24h
  )
  from totals cross join providers;
$$;

revoke all on function public.get_platform_ai_metrics() from public, anon, authenticated;
grant execute on function public.get_platform_ai_metrics() to service_role;
