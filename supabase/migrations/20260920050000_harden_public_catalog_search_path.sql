-- Harden the intentionally public catalog RPC against search_path manipulation.
-- The function remains SECURITY DEFINER because the public storefront must work
-- without exposing tenant tables directly to the anon role.
alter function public.get_public_catalog(text)
  set search_path = '';
