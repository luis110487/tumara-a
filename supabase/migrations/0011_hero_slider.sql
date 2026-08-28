-- Convert hero image into a slider of up to 3 images
INSERT INTO public.site_texts (key, value) VALUES
  ('hero_image_url_2', ''),
  ('hero_image_url_3', ''),
  ('hero_image_link_2', ''),
  ('hero_image_link_3', '')
ON CONFLICT (key) DO NOTHING;
