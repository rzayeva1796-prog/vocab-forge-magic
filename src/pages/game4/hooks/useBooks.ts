import { useState, useEffect } from "react";
import { Book, FileType } from "@/pages/game4/types/book";
import { supabase } from "@/pages/game4/lib/supabase";

interface BookInput {
  title: string;
  coverUrl?: string;
  coverFile?: File;
  fileType: FileType;
  documentFile?: File;
  category?: string;
}

export function useBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBooks = async () => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;

      const mappedBooks: Book[] = (data || []).map((b) => ({
        id: b.id,
        title: b.title,
        coverUrl: b.cover_url || '',
        fileUrl: b.file_url || undefined,
        fileType: (b.file_type || 'pdf') as FileType,
        category: b.category || undefined,
        displayOrder: b.display_order || undefined,
        createdAt: new Date(b.created_at),
        updatedAt: b.updated_at ? new Date(b.updated_at) : undefined,
      }));

      setBooks(mappedBooks);
    } catch (error) {
      console.error("Error fetching books:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const addBook = async (book: BookInput): Promise<Book | null> => {
    try {
      let fileUrl: string | null = null;
      let coverUrl: string | null = null;

      // Upload cover image if provided
      if (book.coverFile) {
        const coverExt = book.coverFile.name.split('.').pop();
        const coverName = `covers/${Date.now()}.${coverExt}`;

        const { error: coverUploadError } = await supabase.storage
          .from('book-documents')
          .upload(coverName, book.coverFile);

        if (coverUploadError) {
          console.error("Cover upload error:", coverUploadError);
        } else {
          const { data: coverUrlData } = supabase.storage
            .from('book-documents')
            .getPublicUrl(coverName);
          coverUrl = coverUrlData.publicUrl;
        }
      } else if (book.coverUrl && /^https?:\/\//.test(book.coverUrl)) {
        coverUrl = book.coverUrl;
      }

      // Upload document file to storage if provided
      if (book.documentFile) {
        const fileExt = book.documentFile.name.split('.').pop();
        const fileName = `docs/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('book-documents')
          .upload(fileName, book.documentFile);

        if (uploadError) {
          console.error("Upload error:", uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from('book-documents')
            .getPublicUrl(fileName);
          fileUrl = urlData.publicUrl;
        }
      }

      const { data, error } = await supabase
        .from('books')
        .insert({
          title: book.title,
          cover_url: coverUrl,
          file_type: book.fileType,
          file_url: fileUrl,
          category: book.category || null,
        })
        .select()
        .single();

      if (error) {
        console.error("Insert error:", error);
        throw error;
      }

      const newBook: Book = {
        id: data.id,
        title: data.title,
        coverUrl: data.cover_url || '',
        fileUrl: data.file_url || undefined,
        fileType: (data.file_type || 'pdf') as FileType,
        category: data.category || undefined,
        displayOrder: data.display_order || undefined,
        createdAt: new Date(data.created_at),
        updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
      };

      setBooks((prev) => [newBook, ...prev]);
      return newBook;
    } catch (error) {
      console.error("Error adding book:", error);
      throw error;
    }
  };

  const updateBook = async (id: string, updates: Partial<Book>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.coverUrl !== undefined) dbUpdates.cover_url = updates.coverUrl;
      if (updates.fileType !== undefined) dbUpdates.file_type = updates.fileType;
      if (updates.fileUrl !== undefined) dbUpdates.file_url = updates.fileUrl;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.displayOrder !== undefined) dbUpdates.display_order = updates.displayOrder;

      const { error } = await supabase
        .from('books')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      setBooks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
      );
    } catch (error) {
      console.error("Error updating book:", error);
      throw error;
    }
  };

  const deleteBook = async (id: string) => {
    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setBooks((prev) => prev.filter((b) => b.id !== id));
    } catch (error) {
      console.error("Error deleting book:", error);
      throw error;
    }
  };

  return { books, isLoading, addBook, updateBook, deleteBook, refetch: fetchBooks };
}
