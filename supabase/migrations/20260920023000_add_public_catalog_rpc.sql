create or replace function public.get_public_catalog(p_slug text)
returns table (
  business_name text,
  business_logo_url text,
  business_description text,
  business_phone text,
  business_email text,
  product_id uuid,
  product_sku text,
  product_name text,
  product_category text,
  product_price numeric,
  product_image_url text,
  available_stock integer
)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select
    b.name,
    b.logo_url,
    b.public_description,
    b.public_contact_phone,
    b.public_contact_email,
    p.id,
    p.sku,
    p.name,
    p.category,
    p.price,
    null::text,
    greatest(0, p.stock - coalesce(p.reserved_stock, 0) - coalesce(p.blocked_stock, 0))
  from public.businesses b
  join public.products p on p.business_id = b.id
  where b.public_enabled = true
    and b.public_slug = p_slug
    and greatest(0, p.stock - coalesce(p.reserved_stock, 0) - coalesce(p.blocked_stock, 0)) > 0
  order by p.category nulls last, p.name;
$$;

revoke all on function public.get_public_catalog(text) from public;
grant execute on function public.get_public_catalog(text) to anon, authenticated;
