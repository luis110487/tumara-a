-- Editable site text snippets (section titles, etc.)
CREATE TABLE IF NOT EXISTS public.site_texts (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.site_texts (key, value) VALUES
  ('home_categories_title', 'Categorías populares'),
  ('home_professionals_title', 'Profesionales destacados'),
  ('home_how_it_works_title', 'Así de fácil')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.site_texts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS site_texts_public_read ON public.site_texts;
CREATE POLICY site_texts_public_read ON public.site_texts FOR SELECT USING (true);

DROP POLICY IF EXISTS site_texts_admin_write ON public.site_texts;
CREATE POLICY site_texts_admin_write ON public.site_texts FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
