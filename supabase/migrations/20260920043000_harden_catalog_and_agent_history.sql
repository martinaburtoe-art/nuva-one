-- Harden public catalog RPC and deny-by-default agent history access.
-- The catalog intentionally remains callable by anon for the public storefront.

revoke execute on function public.get_public_catalog(text) from public, authenticated;
grant execute on function public.get_public_catalog(text) to anon;

do $$
begin
  if to_regclass('public.agentes_historial') is not null then
    execute 'alter table public.agentes_historial enable row level security';
  end if;
end
$$;

-- No policies are created intentionally when the table exists: this history
-- table is not part of the current client workflow, so access remains denied.
