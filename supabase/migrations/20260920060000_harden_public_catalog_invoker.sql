-- Keep the public catalog Data API surface safe without SECURITY DEFINER.
-- Anonymous users may read only businesses explicitly enabled for public showcase
-- and products belonging to those businesses.
drop policy if exists "Anonymous public catalog products" on public.products;

create policy "Anonymous public catalog products"
  on public.products
  for select
  to anon
  using (
    exists (
      select 1
      from public.businesses b
      where b.id = products.business_id
        and b.public_enabled = true
    )
  );

alter function public.get_public_catalog(text)
  security invoker
  set search_path = '';

grant execute on function public.get_public_catalog(text) to anon;
revoke execute on function public.get_public_catalog(text) from authenticated;
