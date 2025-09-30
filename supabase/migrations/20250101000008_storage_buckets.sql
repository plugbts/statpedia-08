-- Storage Buckets Migration
-- This migration creates storage buckets for user banners

-- Create user-banners storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-banners',
  'user-banners',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Create storage policies for user-banners bucket
CREATE POLICY "Users can upload their own banners" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'user-banners' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view all banners" ON storage.objects
FOR SELECT USING (bucket_id = 'user-banners');

CREATE POLICY "Users can update their own banners" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'user-banners' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own banners" ON storage.objects
FOR DELETE USING (
  bucket_id = 'user-banners' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
