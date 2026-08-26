-- Editable hero image
INSERT INTO public.site_texts (key, value) VALUES
  ('hero_image_url', '/hero-professionals.webp')
ON CONFLICT (key) DO NOTHING;

-- Storage bucket for site-wide editable images (hero, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read site-assets" ON storage.objects;
CREATE POLICY "Public read site-assets" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'site-assets');

DROP POLICY IF EXISTS "Admins upload site-assets" ON storage.objects;
CREATE POLICY "Admins upload site-assets" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'site-assets' AND public.is_admin());

DROP POLICY IF EXISTS "Admins update site-assets" ON storage.objects;
CREATE POLICY "Admins update site-assets" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'site-assets' AND public.is_admin());
