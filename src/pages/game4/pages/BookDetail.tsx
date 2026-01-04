import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Book as BookIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useBooks } from "@/pages/game4/hooks/useBooks";
import { toast } from "sonner";

export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { books, deleteBook } = useBooks();

  const book = books.find((b) => b.id === id);

  const handleDelete = async () => {
    if (!book) return;
    try {
      await deleteBook(book.id);
      toast.success("Kitap silindi");
      navigate("/game4");
    } catch (error) {
      toast.error("Kitap silinemedi");
    }
  };

  if (!book) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Kitap bulunamadı</p>
          <Button variant="outline" onClick={() => navigate("/game4")}>
            Ana Sayfaya Dön
          </Button>
        </div>
      </div>
    );
  }

  const handleRead = () => {
    navigate(`/game4/book/${book.id}/read`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/game4")}
            className="text-leather"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <h1 className="font-display text-lg font-semibold text-foreground truncate max-w-48">
            {book.title}
          </h1>

          <div className="flex items-center gap-1">
            {/* Delete Button */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Kitabı Sil</AlertDialogTitle>
                  <AlertDialogDescription>
                    "{book?.title}" kitabını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>İptal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                    Sil
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-4 pb-24 space-y-6 animate-fade-in">
        {/* Book Cover */}
        <div className="flex justify-center">
          <div className="w-48 h-64 rounded-xl shadow-book overflow-hidden bg-paper-dark">
            {book.coverUrl ? (
              <img
                src={book.coverUrl}
                alt={book.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-leather-light to-leather">
                <BookIcon className="w-16 h-16 text-primary-foreground/60" />
              </div>
            )}
          </div>
        </div>

        {/* Book Info */}
        <div className="text-center space-y-2">
          <h2 className="text-xl font-display font-semibold text-foreground">
            {book.title}
          </h2>
          {book.category && (
            <p className="text-sm text-muted-foreground">
              Kategori: {book.category}
            </p>
          )}
          {book.fileType && (
            <span className="inline-block bg-primary/10 text-primary text-xs px-2 py-1 rounded uppercase">
              {book.fileType}
            </span>
          )}
        </div>
      </main>

      {/* Bottom Read Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border">
        <Button
          onClick={handleRead}
          className="w-full h-14 text-lg font-display bg-leather hover:bg-leather-light"
        >
          <BookOpen className="w-5 h-5 mr-2" />
          Oku
        </Button>
      </div>
    </div>
  );
}
