import { createClient } from '@supabase/supabase-js';

const EXTERNAL_SUPABASE_URL = 'https://qwqkrsvbmabodvmfktvj.supabase.co';
const EXTERNAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3cWtyc3ZibWFib2R2bWZrdHZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1NjQ1NDYsImV4cCI6MjA4MDE0MDU0Nn0.JnGHMS4cWo6qdUW0K6RdSOaOQnou5K4BdWsZqEQpLKU';

export const externalSupabase = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY);

export interface ExternalPackage {
  id: string;
  name: string;
  created_at: string;
}

export interface ExternalWord {
  id: string;
  package_id: string;
  english: string;
  turkish: string;
  image_url: string | null;
  word_index: number;
}

export interface ExternalBook {
  id: string;
  title: string;
  file_url: string | null;
  cover_url?: string;
  category?: string;
  display_order: number;
  created_at: string;
}

// Kitap dosyası yükleme ve güncelleme fonksiyonu
export async function uploadBookFile(bookId: string, file: File): Promise<string> {
  const fileName = `${Date.now()}-${file.name}`;
  
  // 1. Dosyayı storage'a yükle
  const { error: uploadError } = await externalSupabase.storage
    .from('book-files')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  // 2. Public URL al
  const { data: urlData } = externalSupabase.storage
    .from('book-files')
    .getPublicUrl(fileName);

  // 3. Kitabın file_url'ini güncelle
  const { error: updateError } = await externalSupabase
    .from('books')
    .update({ file_url: urlData.publicUrl })
    .eq('id', bookId);

  if (updateError) throw updateError;

  return urlData.publicUrl;
}

// Yeni kitap ekleme fonksiyonu
export async function addBookWithFile(file: File, title: string, category?: string): Promise<void> {
  const fileName = `${Date.now()}-${file.name}`;
  
  // 1. Dosyayı storage'a yükle
  const { error: uploadError } = await externalSupabase.storage
    .from('book-files')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  // 2. Public URL al
  const { data: urlData } = externalSupabase.storage
    .from('book-files')
    .getPublicUrl(fileName);

  // 3. Mevcut en yüksek display_order'ı bul
  const { data: maxOrderData } = await externalSupabase
    .from('books')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1);

  const nextOrder = (maxOrderData?.[0]?.display_order ?? 0) + 1;

  // 4. Kitabı veritabanına ekle
  const { error: insertError } = await externalSupabase
    .from('books')
    .insert({
      title,
      file_url: urlData.publicUrl,
      category,
      display_order: nextOrder
    });

  if (insertError) throw insertError;
}
