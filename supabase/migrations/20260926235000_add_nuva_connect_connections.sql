create table if not exists public.nuva_integration_connections (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  provider text not null,
  status text not null default 'disconnected' check (status in ('disconnected','pending','connected','error','revoked')),
  auth_mode text not null check (auth_mode in ('oauth','api_key','webhook','adapter')),
  external_account_id text,
  secret_ref text,
  scopes text[] not null default '{}',
  sync_cursor text,
  last_synced_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, provider)
);

create index if not exists idx_nuva_integration_connections_business
  on public.nuva_integration_connections (business_id);

alter table public.nuva_integration_connections enable row level security;

create policy "Members see integration connections"
  on public.nuva_integration_connections for select to authenticated
  using (private.is_business_member(business_id, (select auth.uid())));

create policy "Owner/admin manage integration connections"
  on public.nuva_integration_connections for all to authenticated
  using (private.has_business_role(business_id, (select auth.uid()), array['owner'::member_role, 'admin'::member_role]))
  with check (private.has_business_role(business_id, (select auth.uid()), array['owner'::member_role, 'admin'::member_role]));

revoke all on public.nuva_integration_connections from anon;
grant select, insert, update, delete on public.nuva_integration_connections to authenticated;

create or replace function public.set_nuva_integration_connection_updated_at()
returns trigger language plpgsql security invoker set search_path = public
as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;

drop trigger if exists trg_nuva_integration_connection_updated_at on public.nuva_integration_connections;
create trigger trg_nuva_integration_connection_updated_at
before update on public.nuva_integration_connections
for each row execute function public.set_nuva_integration_connection_updated_at();

revoke execute on function public.set_nuva_integration_connection_updated_at() from public;
grant execute on function public.set_nuva_integration_connection_updated_at() to authenticated;
