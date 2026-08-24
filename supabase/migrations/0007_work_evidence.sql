-- Add evidence/portfolio photo columns to professionals
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS evidence_url_1 text;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS evidence_url_2 text;

-- Storage bucket for work evidence photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence', 'evidence', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read evidence" ON storage.objects;
CREATE POLICY "Public read evidence" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'evidence');

DROP POLICY IF EXISTS "Users upload own evidence" ON storage.objects;
CREATE POLICY "Users upload own evidence" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'evidence');

DROP POLICY IF EXISTS "Users update own evidence" ON storage.objects;
CREATE POLICY "Users update own evidence" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'evidence');
