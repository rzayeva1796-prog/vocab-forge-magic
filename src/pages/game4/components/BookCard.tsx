import { Book as BookIcon, FileText, Download, Check, Loader2, Trash2 } from "lucide-react";
import { Book } from "@/pages/game4/types/book";
import { useState, useEffect } from "react";
import { isBookDownloaded, downloadBookFromUrl, saveBookLocally } from "@/pages/game4/lib/localBookStorage";
import { toast } from "sonner";

interface BookCardProps {
  book: Book;
  onClick: () => void;
  onDelete?: (bookId: string) => Promise<void>;
}

export function BookCard({ book, onClick, onDelete }: BookCardProps) {
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (book.fileUrl) {
      isBookDownloaded(book.id).then(setIsDownloaded);
    }
  }, [book.id, book.fileUrl]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!book.fileUrl || isDownloaded || isDownloading) return;

    setIsDownloading(true);
    try {
      const blob = await downloadBookFromUrl(book.fileUrl);
      await saveBookLocally(book.id, blob, book.title);
      setIsDownloaded(true);
      toast.success("Kitap indirildi!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("İndirme başarısız oldu");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!onDelete || isDeleting) return;

    if (!window.confirm("Bu kitabı silmek istediğinizden emin misiniz?")) return;

    setIsDeleting(true);
    try {
      await onDelete(book.id);
      toast.success("Kitap silindi!");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Silme başarısız oldu");
    } finally {
      setIsDeleting(false);
    }
  };

  const getBadgeText = () => {
    if (book.fileType === 'pdf') return 'PDF';
    if (book.fileType === 'word') return 'WORD';
    return null;
  };

  const badge = getBadgeText();
  const hasDocument = book.fileUrl && book.fileType !== 'manual';

  return (
    <div className="group flex flex-col items-center gap-3 animate-fade-in">
      {/* Book Cover */}
      <button
        onClick={onClick}
        className="relative w-32 h-44 rounded-lg shadow-lg overflow-hidden bg-muted transition-transform duration-300 group-hover:scale-105 group-active:scale-100"
      >
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/40 to-primary">
            {book.fileType !== 'manual' ? (
              <FileText className="w-12 h-12 text-primary-foreground/60" />
            ) : (
              <BookIcon className="w-12 h-12 text-primary-foreground/60" />
            )}
          </div>
        )}
        
        {/* Document Type Badge */}
        {badge && (
          <div className="absolute top-1 right-1 bg-primary/80 text-primary-foreground text-[10px] px-1.5 py-0.5 rounded">
            {badge}
          </div>
        )}
      </button>

      {/* Book Info */}
      <div className="text-center space-y-1">
        <h3 className="text-sm font-medium text-foreground line-clamp-1 max-w-32">
          {book.title}
        </h3>
        {book.category && (
          <p className="text-xs text-muted-foreground">
            {book.category}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Download Button */}
        {hasDocument && (
          <button
            onClick={handleDownload}
            disabled={isDownloaded || isDownloading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              isDownloaded
                ? "bg-green-500/20 text-green-600"
                : "bg-primary/10 text-primary hover:bg-primary/20"
            }`}
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>İndiriliyor...</span>
              </>
            ) : isDownloaded ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>İndirildi</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>İndir</span>
              </>
            )}
          </button>
        )}

        {/* Delete Button */}
        {onDelete && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-full text-xs font-medium transition-colors bg-destructive/10 text-destructive hover:bg-destructive/20"
          >
            {isDeleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
