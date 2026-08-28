-- Remap existing category icons (emoji) to the new professional SVG icon keys
UPDATE public.categories SET icon = 'snowflake' WHERE slug = 'aire-acondicionado';
UPDATE public.categories SET icon = 'bricks' WHERE slug = 'albaniles';
UPDATE public.categories SET icon = 'saw' WHERE slug = 'carpinteros';
UPDATE public.categories SET icon = 'key' WHERE slug = 'cerrajeros';
UPDATE public.categories SET icon = 'bolt' WHERE slug = 'electricistas';
UPDATE public.categories SET icon = 'broom' WHERE slug = 'limpieza';
UPDATE public.categories SET icon = 'car' WHERE slug = 'mecanicos';
UPDATE public.categories SET icon = 'paint' WHERE slug = 'pintores';
UPDATE public.categories SET icon = 'wrench' WHERE slug = 'plomeros';
UPDATE public.categories SET icon = 'computer' WHERE slug = 'tecnicos-informaticos';
