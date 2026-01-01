import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2, Download } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BookViewerProps {
  fileUrl: string;
  bookId?: string;
  onTextExtracted?: (text: string) => void;
}

const BookViewer: React.FC<BookViewerProps> = ({ fileUrl, bookId, onTextExtracted }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string>('');

  useEffect(() => {
    const loadFile = async () => {
      if (!fileUrl) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Check if it's a text file
        const url = fileUrl.toLowerCase();
        const isTextFile = url.includes('.txt') || url.includes('.md');
        
        if (isTextFile) {
          const response = await fetch(fileUrl);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const text = await response.text();
          setTextContent(text);
          onTextExtracted?.(text);
        } else {
          // For PDF and other files, show a download link
          setTextContent('');
          setError('Bu dosya türü önizlenemez. Dosyayı indirmek için butona tıklayın.');
        }
      } catch (err) {
        console.error('Error loading file:', err);
        setError('Dosya yüklenemedi');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadFile();
  }, [fileUrl, bookId, onTextExtracted]);

  if (error && !textContent) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" asChild>
          <a href={fileUrl} target="_blank" rel="noopener noreferrer" download>
            <Download className="w-4 h-4 mr-2" />
            Dosyayı İndir
          </a>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  // Text content
  return (
    <ScrollArea className="h-full">
      <div className="p-4 prose prose-sm max-w-none dark:prose-invert">
        <pre className="whitespace-pre-wrap font-sans">{textContent}</pre>
      </div>
    </ScrollArea>
  );
};

export default BookViewer;
