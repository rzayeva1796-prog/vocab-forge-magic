-- Create storage bucket for book files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('book-files', 'book-files', true)
ON CONFLICT (id) DO NOTHING;

-- Create books table
CREATE TABLE public.books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  file_url TEXT,
  file_type TEXT, -- 'pdf', 'word', 'docx'
  cover_url TEXT,
  category TEXT DEFAULT 'Kitap',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Anyone can read books
CREATE POLICY "Anyone can read books" 
ON public.books FOR SELECT 
USING (true);

-- Admins can manage books
CREATE POLICY "Admins can insert books" 
ON public.books FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update books" 
ON public.books FOR UPDATE 
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete books" 
ON public.books FOR DELETE 
USING (is_admin(auth.uid()));

-- Storage policies for book-files bucket
CREATE POLICY "Anyone can view book files"
ON storage.objects FOR SELECT
USING (bucket_id = 'book-files');

CREATE POLICY "Admins can upload book files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'book-files' AND is_admin(auth.uid()));

CREATE POLICY "Admins can update book files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'book-files' AND is_admin(auth.uid()));

CREATE POLICY "Admins can delete book files"
ON storage.objects FOR DELETE
USING (bucket_id = 'book-files' AND is_admin(auth.uid()));