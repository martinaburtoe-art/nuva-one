-- Public business profiles and the business network are free for every Nüva One account.
-- Keep row-level authorization for owners/admins while allowing public showcase reads.
drop policy if exists "Public showcase businesses" on public.businesses;
create policy "Public showcase businesses" on public.businesses
for select
to anon, authenticated
using (public_enabled = true);

-- The authenticated owner/admin already passes the existing UPDATE RLS policy.
-- Restore column-level UPDATE privileges for the public-profile fields that were
-- intentionally omitted by earlier sensitive-column hardening.
grant update (
  public_enabled,
  public_slug,
  public_description,
  public_photos,
  public_social_links,
  public_contact_email,
  public_contact_phone
) on table public.businesses to authenticated;
