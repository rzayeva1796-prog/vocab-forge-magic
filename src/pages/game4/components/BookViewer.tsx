import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import mammoth from 'mammoth';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// In-memory cache for current session
const memoryCache = new Map<string, { blobUrl: string; arrayBuffer: ArrayBuffer; type: string }>();

interface BookViewerProps {
  fileUrl: string;
  bookId?: string;
  onTextExtracted?: (text: string) => void;
}

type FileType = 'pdf' | 'docx' | 'text' | 'unknown';

const BookViewer: React.FC<BookViewerProps> = ({ fileUrl, bookId, onTextExtracted }) => {
  const [fileType, setFileType] = useState<FileType>('unknown');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState<string>('Yükleniyor...');
  const [error, setError] = useState<string | null>(null);
  const [cachedBlobUrl, setCachedBlobUrl] = useState<string | null>(null);
  
  // PDF state
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  
  // DOCX/Text state
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [textContent, setTextContent] = useState<string>('');

  const detectFileType = (url: string, contentType: string): FileType => {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('.pdf') || contentType.includes('pdf')) return 'pdf';
    if (lowerUrl.includes('.docx') || lowerUrl.includes('.doc') || contentType.includes('word') || contentType.includes('document')) return 'docx';
    if (lowerUrl.includes('.txt') || lowerUrl.includes('.md')) return 'text';
    return 'text';
  };

  const getFileExtension = (url: string, contentType: string): string => {
    if (url.includes('.pdf') || contentType.includes('pdf')) return 'pdf';
    if (url.includes('.docx') || contentType.includes('word')) return 'docx';
    if (url.includes('.doc')) return 'doc';
    if (url.includes('.txt')) return 'txt';
    return 'bin';
  };

  useEffect(() => {
    const loadFile = async () => {
      if (!fileUrl) return;
      
      setIsLoading(true);
      setError(null);
      const cacheKey = bookId || fileUrl;
      
      try {
        // 1. Check memory cache first (fastest)
        const memoryCached = memoryCache.get(cacheKey);
        if (memoryCached) {
          console.log('Using memory cache:', cacheKey);
          setCachedBlobUrl(memoryCached.blobUrl);
          const detectedType = detectFileType(fileUrl, memoryCached.type);
          setFileType(detectedType);
          
          if (detectedType === 'docx') await loadDocxFromBuffer(memoryCached.arrayBuffer);
          else if (detectedType === 'text') await loadTextFromBuffer(memoryCached.arrayBuffer);
          
          setIsLoading(false);
          return;
        }

        // 2. Check database cache (if bookId provided)
        if (bookId) {
          setLoadingStatus('Önbellek kontrol ediliyor...');
          const { data: cacheRecord } = await supabase
            .from('book_cache')
            .select('*')
            .eq('external_book_id', bookId)
            .maybeSingle();
          
          if (cacheRecord) {
            console.log('Found in DB cache:', cacheRecord.cached_path);
            setLoadingStatus('Önbellekten yükleniyor...');
            
            // Get public URL from storage
            const { data: urlData } = supabase.storage
              .from('cached-books')
              .getPublicUrl(cacheRecord.cached_path);
            
            if (urlData?.publicUrl) {
              // Download from our storage
              const response = await fetch(urlData.publicUrl);
              const arrayBuffer = await response.arrayBuffer();
              const contentType = response.headers.get('content-type') || '';
              
              const blob = new Blob([arrayBuffer], { type: contentType });
              const blobUrl = URL.createObjectURL(blob);
              
              // Store in memory cache
              memoryCache.set(cacheKey, { blobUrl, arrayBuffer, type: contentType });
              setCachedBlobUrl(blobUrl);
              
              const detectedType = detectFileType(fileUrl, cacheRecord.file_type || contentType);
              setFileType(detectedType);
              
              if (detectedType === 'docx') await loadDocxFromBuffer(arrayBuffer);
              else if (detectedType === 'text') await loadTextFromBuffer(arrayBuffer);
              
              setIsLoading(false);
              return;
            }
          }
        }
        
        // 3. Download from external URL
        setLoadingStatus('Kitap indiriliyor...');
        console.log('Downloading from external:', fileUrl);
        const response = await fetch(fileUrl);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type') || '';
        const arrayBuffer = await response.arrayBuffer();
        
        const blob = new Blob([arrayBuffer], { type: contentType });
        const blobUrl = URL.createObjectURL(blob);
        
        // Store in memory cache
        memoryCache.set(cacheKey, { blobUrl, arrayBuffer, type: contentType });
        setCachedBlobUrl(blobUrl);
        
        const detectedType = detectFileType(fileUrl, contentType);
        setFileType(detectedType);
        
        // 4. Save to database storage (if bookId provided)
        if (bookId) {
          setLoadingStatus('Önbelleğe kaydediliyor...');
          
          const ext = getFileExtension(fileUrl, contentType);
          const fileName = `${bookId}.${ext}`;
          
          try {
            // Upload to storage
            const { error: uploadError } = await supabase.storage
              .from('cached-books')
              .upload(fileName, blob, {
                contentType: contentType || 'application/octet-stream',
                upsert: true
              });
            
            if (!uploadError) {
              // Save cache record
              await supabase
                .from('book_cache')
                .upsert({
                  external_book_id: bookId,
                  original_url: fileUrl,
                  cached_path: fileName,
                  file_type: detectedType
                }, { onConflict: 'external_book_id' });
              
              console.log('Saved to cache:', fileName);
            } else {
              console.error('Upload error:', uploadError);
            }
          } catch (cacheError) {
            console.error('Cache save error:', cacheError);
            // Continue anyway - file is already loaded
          }
        }
        
        if (detectedType === 'docx') await loadDocxFromBuffer(arrayBuffer);
        else if (detectedType === 'text') await loadTextFromBuffer(arrayBuffer);
        
      } catch (err) {
        console.error('Error loading file:', err);
        setError('Dosya yüklenemedi');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadFile();
  }, [fileUrl, bookId]);

  const loadDocxFromBuffer = async (arrayBuffer: ArrayBuffer) => {
    try {
      const result = await mammoth.convertToHtml({ arrayBuffer });
      setHtmlContent(result.value);
      
      const textResult = await mammoth.extractRawText({ arrayBuffer });
      setTextContent(textResult.value);
      onTextExtracted?.(textResult.value);
    } catch (err) {
      console.error('Error loading DOCX:', err);
      setError('Word dosyası yüklenemedi');
    }
  };

  const loadTextFromBuffer = async (arrayBuffer: ArrayBuffer) => {
    try {
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(arrayBuffer);
      setTextContent(text);
      setHtmlContent(`<pre>${text}</pre>`);
      onTextExtracted?.(text);
    } catch (err) {
      console.error('Error loading text:', err);
      setError('Metin dosyası yüklenemedi');
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    setError('PDF yüklenemedi');
    setIsLoading(false);
  };

  const goToPrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages));
  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 2.0));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-destructive">
        <p>{error}</p>
      </div>
    );
  }

  if (isLoading && fileType !== 'pdf') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{loadingStatus}</p>
      </div>
    );
  }

  if (fileType === 'pdf') {
    return (
      <div className="flex flex-col h-full">
        {/* PDF Controls */}
        <div className="flex items-center justify-between p-2 border-b bg-muted/50">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToPrevPage} disabled={pageNumber <= 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm">
              Sayfa {pageNumber} / {numPages || '?'}
            </span>
            <Button variant="outline" size="sm" onClick={goToNextPage} disabled={pageNumber >= numPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={zoomOut} disabled={scale <= 0.5}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm">{Math.round(scale * 100)}%</span>
            <Button variant="outline" size="sm" onClick={zoomIn} disabled={scale >= 2.0}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* PDF Document */}
        <ScrollArea className="flex-1">
          <div className="flex justify-center p-4">
            <Document
              file={cachedBlobUrl || fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex flex-col items-center justify-center h-64 gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{loadingStatus}</p>
                </div>
              }
            >
              <Page 
                pageNumber={pageNumber} 
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>
          </div>
        </ScrollArea>
      </div>
    );
  }

  // DOCX or Text content
  return (
    <ScrollArea className="h-full">
      <div 
        className="p-4 prose prose-sm max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </ScrollArea>
  );
};

export default BookViewer;