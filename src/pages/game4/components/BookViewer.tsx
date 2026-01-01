import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Download } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import mammoth from 'mammoth';

interface BookViewerProps {
  fileUrl: string;
  bookId?: string;
  onTextExtracted?: (text: string) => void;
}

const BookViewer: React.FC<BookViewerProps> = ({ fileUrl, bookId, onTextExtracted }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [textContent, setTextContent] = useState<string>('');

  useEffect(() => {
    const loadFile = async () => {
      if (!fileUrl) return;
      
      setIsLoading(true);
      setError(null);
      setHtmlContent('');
      setTextContent('');
      
      try {
        const url = fileUrl.toLowerCase();
        
        // Check file type
        if (url.includes('.docx') || url.includes('.doc')) {
          // Word document - use mammoth
          const response = await fetch(fileUrl);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          
          // Convert to HTML for display
          const result = await mammoth.convertToHtml({ arrayBuffer });
          setHtmlContent(result.value);
          
          // Also extract plain text
          const textResult = await mammoth.extractRawText({ arrayBuffer });
          setTextContent(textResult.value);
          onTextExtracted?.(textResult.value);
          
        } else if (url.includes('.txt') || url.includes('.md')) {
          // Plain text file
          const response = await fetch(fileUrl);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const text = await response.text();
          setTextContent(text);
          onTextExtracted?.(text);
          
        } else if (url.includes('.pdf')) {
          // PDF - show download link
          setError('PDF dosyaları önizlenemez. Dosyayı indirmek için butona tıklayın.');
          
        } else {
          // Unknown format
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  if (error) {
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

  // HTML content (from docx)
  if (htmlContent) {
    return (
      <ScrollArea className="h-full">
        <div 
          className="p-4 prose prose-sm max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </ScrollArea>
    );
  }

  // Plain text content
  if (textContent) {
    return (
      <ScrollArea className="h-full">
        <div className="p-4 prose prose-sm max-w-none dark:prose-invert">
          <pre className="whitespace-pre-wrap font-sans">{textContent}</pre>
        </div>
      </ScrollArea>
    );
  }

  return null;
};

export default BookViewer;
