INSERT INTO storage.buckets (id, name, public)
VALUES ('nuva-studio-assets', 'nuva-studio-assets', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Studio members can upload assets" ON storage.objects;
CREATE POLICY "Studio members can upload assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'nuva-studio-assets'
    AND private.is_business_member(split_part(name, '/', 1)::uuid, auth.uid())
  );

DROP POLICY IF EXISTS "Studio members can read assets" ON storage.objects;
CREATE POLICY "Studio members can read assets"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'nuva-studio-assets'
    AND private.is_business_member(split_part(name, '/', 1)::uuid, auth.uid())
  );

DROP POLICY IF EXISTS "Studio members can delete assets" ON storage.objects;
CREATE POLICY "Studio members can delete assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'nuva-studio-assets'
    AND private.is_business_member(split_part(name, '/', 1)::uuid, auth.uid())
  );
