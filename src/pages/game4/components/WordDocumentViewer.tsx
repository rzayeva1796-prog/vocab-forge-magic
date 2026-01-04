import { useState, useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import mammoth from "mammoth";

interface WordDocumentViewerProps {
  blob: Blob;
}

export function WordDocumentViewer({ blob }: WordDocumentViewerProps) {
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function convertWordToHtml() {
      try {
        setIsLoading(true);
        setError(null);
        
        const arrayBuffer = await blob.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setHtmlContent(result.value);
      } catch (err) {
        console.error("Word conversion error:", err);
        setError("Word dosyası dönüştürülürken hata oluştu");
      } finally {
        setIsLoading(false);
      }
    }

    convertWordToHtml();
  }, [blob]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div 
      className="prose prose-sm max-w-none p-4 bg-white rounded-lg shadow-sm"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
