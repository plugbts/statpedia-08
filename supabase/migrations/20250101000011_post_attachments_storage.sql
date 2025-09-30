-- Post Attachments Storage Migration
-- This migration creates the storage bucket for post attachments

-- Create storage bucket for post attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-attachments',
  'post-attachments',
  true,
  10485760, -- 10MB limit
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'video/mp4',
    'video/quicktime'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for post-attachments bucket
CREATE POLICY "Users can view all post attachments" ON storage.objects
  FOR SELECT USING (bucket_id = 'post-attachments');

CREATE POLICY "Users can upload their own post attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'post-attachments' AND
    auth.uid()::text = (storage.foldername(name))[2]
  );

CREATE POLICY "Users can delete their own post attachments" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'post-attachments' AND
    auth.uid()::text = (storage.foldername(name))[2]
  );
