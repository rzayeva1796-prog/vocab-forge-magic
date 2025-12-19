-- Storage bucket oluştur
INSERT INTO storage.buckets (id, name, public)
VALUES ('book-documents', 'book-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Public okuma politikası
CREATE POLICY "Public read access for book-documents" ON storage.objects
FOR SELECT USING (bucket_id = 'book-documents');

-- Public yazma politikası
CREATE POLICY "Public upload access for book-documents" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'book-documents');

-- Public güncelleme politikası
CREATE POLICY "Public update access for book-documents" ON storage.objects
FOR UPDATE USING (bucket_id = 'book-documents');

-- Public silme politikası
CREATE POLICY "Public delete access for book-documents" ON storage.objects
FOR DELETE USING (bucket_id = 'book-documents');