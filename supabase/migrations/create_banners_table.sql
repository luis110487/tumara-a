-- Create banners table
CREATE TABLE banners (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title TEXT,
  image_url TEXT NOT NULL,
  link TEXT,
  position INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create RLS policies
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to read active banners
CREATE POLICY "Allow public to read active banners" ON banners
  FOR SELECT
  USING (is_active = true);

-- Allow admins to read all banners
CREATE POLICY "Allow admins to read banners" ON banners
  FOR SELECT
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Allow admins to insert banners
CREATE POLICY "Allow admins to insert banners" ON banners
  FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Allow admins to update banners
CREATE POLICY "Allow admins to update banners" ON banners
  FOR UPDATE
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Allow admins to delete banners
CREATE POLICY "Allow admins to delete banners" ON banners
  FOR DELETE
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Create indexes
CREATE INDEX idx_banners_is_active ON banners(is_active);
CREATE INDEX idx_banners_position ON banners(position);
