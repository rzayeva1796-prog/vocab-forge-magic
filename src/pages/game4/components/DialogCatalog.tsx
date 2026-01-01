import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageCircle } from 'lucide-react';

interface DialogCatalogProps {
  onBack: () => void;
}

export function DialogCatalog({ onBack }: DialogCatalogProps) {
  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border p-3 flex-shrink-0">
        <div className="flex items-center justify-between max-w-4xl mx-auto gap-2">
          <button 
            onClick={onBack} 
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Geri
          </button>
          <h1 className="text-sm font-semibold">Dialog Kataloğu</h1>
          <div className="w-12" />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <MessageCircle className="w-16 h-16 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">
            Dialog kataloğu henüz yapılandırılmadı.
          </p>
          <Button variant="outline" onClick={onBack}>
            Geri Dön
          </Button>
        </div>
      </div>
    </div>
  );
}
