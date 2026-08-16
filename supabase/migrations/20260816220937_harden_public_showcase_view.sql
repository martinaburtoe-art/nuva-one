revoke all on table public.businesses from anon;
grant select (id, name, industry, logo_url, created_at, comuna, public_slug, public_enabled, public_description, public_photos, public_social_links, public_contact_email, public_contact_phone) on table public.businesses to anon;

drop policy if exists "Public showcase businesses" on public.businesses;
create policy "Public showcase businesses"
on public.businesses
for select
to anon
using (public_enabled = true and plan = 'pro');

create or replace view public.businesses_public
with (security_invoker = true)
as
select
  id,
  name,
  industry,
  public_slug,
  public_description,
  logo_url,
  public_photos,
  public_social_links,
  public_contact_email,
  public_contact_phone,
  comuna,
  created_at
from public.businesses
where public_enabled = true
  and plan = 'pro';

grant select on public.businesses_public to anon;
revoke execute on function public.forum_sync_reply_count() from anon;
revoke execute on function public.increment_forum_topic_views(uuid) from anon;
