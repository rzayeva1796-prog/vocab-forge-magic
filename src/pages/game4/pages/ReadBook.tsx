import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, FileText, AlertCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBooks } from "@/pages/game4/hooks/useBooks";
import { useState, useEffect, useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { getLocalBook, isBookDownloaded, downloadBookFromUrl, saveBookLocally } from "@/pages/game4/lib/localBookStorage";
import { toast } from "sonner";
import { WordDocumentViewer } from "@/pages/game4/components/WordDocumentViewer";

// Set worker source with CDN fallback
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

export default function ReadBook() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { books, isLoading } = useBooks();
  
  const book = books.find((b) => b.id === id);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pageWidth, setPageWidth] = useState<number>(window.innerWidth - 32);
  const [localBlob, setLocalBlob] = useState<Blob | null>(null);
  const [localBlobUrl, setLocalBlobUrl] = useState<string | null>(null);
  const [isDownloaded, setIsDownloaded] = useState<boolean | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCheckingLocal, setIsCheckingLocal] = useState(true);

  // Check if book is downloaded locally - run once when book id changes
  useEffect(() => {
    let isMounted = true;
    
    async function checkLocalBook() {
      if (!book?.id) {
        setIsCheckingLocal(false);
        return;
      }
      
      setIsCheckingLocal(true);
      
      try {
        const blob = await getLocalBook(book.id);
        
        if (!isMounted) return;
        
        if (blob) {
          setLocalBlob(blob);
          const url = URL.createObjectURL(blob);
          setLocalBlobUrl(url);
          setIsDownloaded(true);
        } else {
          setIsDownloaded(false);
        }
      } catch (error) {
        console.error("Error checking local book:", error);
        if (isMounted) {
          setIsDownloaded(false);
        }
      } finally {
        if (isMounted) {
          setIsCheckingLocal(false);
        }
      }
    }
    
    checkLocalBook();
    
    return () => {
      isMounted = false;
      if (localBlobUrl) {
        URL.revokeObjectURL(localBlobUrl);
      }
    };
  }, [book?.id]);

  useEffect(() => {
    const handleResize = () => {
      setPageWidth(Math.min(window.innerWidth - 32, 800));
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPdfError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error("PDF load error:", error);
    setPdfError("PDF yüklenirken hata oluştu");
  };

  const goToPrevPage = () => {
    const newPage = Math.max(1, pageNumber - 1);
    setPageNumber(newPage);
  };

  const goToNextPage = () => {
    const newPage = Math.min(numPages, pageNumber + 1);
    setPageNumber(newPage);
  };

  const handleDownload = async () => {
    if (!book?.fileUrl || isDownloading) return;
    
    setIsDownloading(true);
    try {
      const blob = await downloadBookFromUrl(book.fileUrl);
      await saveBookLocally(book.id, blob, book.title);
      setLocalBlob(blob);
      const url = URL.createObjectURL(blob);
      setLocalBlobUrl(url);
      setIsDownloaded(true);
      toast.success("Kitap indirildi!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("İndirme başarısız oldu");
    } finally {
      setIsDownloading(false);
    }
  };

  // Memoize the file source to prevent re-renders
  const pdfFileSource = useMemo(() => {
    return localBlobUrl || undefined;
  }, [localBlobUrl]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Kitap bulunamadı</p>
          <Button variant="outline" onClick={() => navigate("/books")}>
            Ana Sayfaya Dön
          </Button>
        </div>
      </div>
    );
  }

  // If no file URL, show message
  if (!book.fileUrl) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/books")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold text-foreground truncate">
              {book.title}
            </h1>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
          <FileText className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Bu kitap için dosya yüklenmemiş</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate("/books")}
          >
            Geri Dön
          </Button>
        </div>
      </div>
    );
  }

  // Still checking local storage
  if (isCheckingLocal) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not downloaded yet - show download prompt
  if (!isDownloaded) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/books")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold text-foreground truncate">
              {book.title}
            </h1>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
          <Download className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">Bu kitap henüz indirilmedi</p>
          <p className="text-sm text-muted-foreground mb-4">Okumak için önce indirmeniz gerekiyor</p>
          <Button onClick={handleDownload} disabled={isDownloading}>
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                İndiriliyor...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Kitabı İndir
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Word document viewer
  if (book.fileType === "word" && localBlob) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/books")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold text-foreground truncate">
              {book.title}
            </h1>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4">
          <WordDocumentViewer blob={localBlob} />
        </main>
      </div>
    );
  }

  // PDF Viewer
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/books")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-sm font-semibold text-foreground truncate max-w-40">
              {book.title}
            </h1>
          </div>
          <span className="text-sm text-muted-foreground">
            {pageNumber} / {numPages || "?"}
          </span>
        </div>
      </header>

      {/* PDF Viewer */}
      <main className="flex-1 overflow-auto p-4">
        {pdfError ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <AlertCircle className="w-12 h-12 text-destructive mb-4" />
            <p className="text-destructive">{pdfError}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setPdfError(null)}
            >
              Tekrar Dene
            </Button>
          </div>
        ) : pdfFileSource ? (
          <div className="flex justify-center">
            <Document
              file={pdfFileSource}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                width={pageWidth}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                loading={
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                }
              />
            </Document>
          </div>
        ) : null}
      </main>

      {/* Navigation Footer */}
      <footer className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center gap-2">
            <span className="text-lg font-display font-semibold">
              {pageNumber}
            </span>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">{numPages || "?"}</span>
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
