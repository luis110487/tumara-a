-- Optional hyperlink for the hero image
INSERT INTO public.site_texts (key, value) VALUES
  ('hero_image_link', '')
ON CONFLICT (key) DO NOTHING;
