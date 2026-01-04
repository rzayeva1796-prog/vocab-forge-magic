import { useNavigate } from "react-router-dom";
import { BookOpen, ArrowLeft } from "lucide-react";
import { useBooks } from "@/pages/game4/hooks/useBooks";
import { BookCard } from "@/pages/game4/components/BookCard";
import { AddBookDialog } from "@/pages/game4/components/AddBookDialog";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();
  const { books, isLoading, addBook, deleteBook } = useBooks();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/fun")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <BookOpen className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-semibold text-foreground">
              Kitaplığım
            </h1>
          </div>
          <AddBookDialog onAddBook={addBook} />
        </div>
      </header>


      {/* Main Content */}
      <main className="p-4 pb-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : books.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <BookOpen className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-medium text-foreground mb-2">
              Henüz kitap yok
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Sağ üstteki + butonuna basarak ilk kitabınızı ekleyin
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 justify-items-center">
            {books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onClick={() => navigate(`/books/book/${book.id}`)}
                onDelete={deleteBook}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
