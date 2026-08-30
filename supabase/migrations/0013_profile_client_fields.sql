-- Add city and address to profiles (avatar_url already existed, unused until now)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text;
