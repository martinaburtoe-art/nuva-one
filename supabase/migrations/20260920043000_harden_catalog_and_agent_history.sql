-- Harden public catalog RPC and deny-by-default agent history access.
-- The catalog intentionally remains callable by anon for the public storefront.

revoke execute on function public.get_public_catalog(text) from public, authenticated;
grant execute on function public.get_public_catalog(text) to anon;

alter table public.agentes_historial enable row level security;

-- No policies are created intentionally: this history table is not part of the
-- current client workflow, so authenticated/anonymous access remains denied.
