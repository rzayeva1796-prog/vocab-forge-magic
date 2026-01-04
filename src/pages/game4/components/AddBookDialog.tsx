import { useState, useRef } from "react";
import { Plus, Image as ImageIcon, X, Loader2, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { FileType } from "@/pages/game4/types/book";
import { toast } from "@/hooks/use-toast";
import { 
  getPdfPageCount, 
  getWordPageCount, 
  getFileType
} from "@/pages/game4/lib/documentUtils";

interface BookInput {
  title: string;
  coverUrl?: string;
  coverFile?: File;
  fileType: FileType;
  documentFile?: File;
  category?: string;
}

interface AddBookDialogProps {
  onAddBook: (book: BookInput) => Promise<unknown>;
}

export function AddBookDialog({ onAddBook }: AddBookDialogProps) {
  const [open, setOpen] = useState(false);
  
  const [title, setTitle] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [category, setCategory] = useState("");
  
  // Document state
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<'pdf' | 'word' | null>(null);
  const [docPages, setDocPages] = useState(0);
  const [isProcessingDoc, setIsProcessingDoc] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Revoke old preview URL
    if (coverImage.startsWith("blob:")) {
      URL.revokeObjectURL(coverImage);
    }

    setCoverFile(file);
    setCoverImage(URL.createObjectURL(file));
  };

  const handleDocSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const fileType = getFileType(file);
    
    if (fileType === 'unknown') {
      toast({ 
        title: "Hata", 
        description: "Sadece PDF veya Word dosyası yükleyebilirsiniz", 
        variant: "destructive" 
      });
      return;
    }

    setIsProcessingDoc(true);
    try {
      setDocFile(file);
      setDocType(fileType);
      
      // Get page count based on file type
      let pageCount: number;
      
      if (fileType === 'pdf') {
        pageCount = await getPdfPageCount(file);
      } else {
        pageCount = await getWordPageCount(file);
      }
      
      setDocPages(pageCount);
      
      toast({ 
        title: `${fileType.toUpperCase()} Yüklendi`, 
        description: `${pageCount} sayfa bulundu` 
      });
    } catch (error) {
      console.error("Document processing error:", error);
      toast({ 
        title: "Hata", 
        description: "Dosya işlenirken hata oluştu", 
        variant: "destructive" 
      });
    } finally {
      setIsProcessingDoc(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: "Hata", description: "Kitap adı gerekli", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      await onAddBook({
        title: title.trim(),
        coverUrl: "",
        coverFile: coverFile || undefined,
        fileType: docFile ? (docType as FileType) : 'manual',
        documentFile: docFile || undefined,
        category: category.trim() || undefined,
      });

      resetForm();
      toast({ title: "Başarılı", description: "Kitap eklendi!" });
    } catch (error) {
      console.error("Book save error:", error);
      const msg = (error as any)?.message ? String((error as any).message).slice(0, 160) : "Kitap kaydedilirken hata oluştu";
      toast({ title: "Hata", description: msg, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    if (coverImage.startsWith("blob:")) {
      URL.revokeObjectURL(coverImage);
    }

    setTitle("");
    setCoverImage("");
    setCoverFile(null);
    setCategory("");
    setDocFile(null);
    setDocType(null);
    setDocPages(0);
    setOpen(false);
  };

  const removeCover = () => {
    if (coverImage.startsWith("blob:")) {
      URL.revokeObjectURL(coverImage);
    }

    setCoverImage("");
    setCoverFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeDoc = () => {
    setDocFile(null);
    setDocType(null);
    setDocPages(0);
    if (docInputRef.current) {
      docInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="hover:bg-secondary">
          <Plus className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Yeni Kitap Ekle</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Kitap bilgilerini girin
          </DialogDescription>
        </DialogHeader>
        
        
        <div className="space-y-4 pt-2">
          {/* Cover Image & Document - Side by Side */}
          <div className="grid grid-cols-2 gap-3">
            {/* Cover Image */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Kapak Resmi</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              {coverImage ? (
                <div className="relative w-full aspect-[3/4]">
                  <img
                    src={coverImage}
                    alt="Kapak"
                    className="w-full h-full object-cover rounded-lg shadow-md"
                  />
                  <button
                    onClick={removeCover}
                    className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full shadow-md"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-[3/4] border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-secondary/50 transition-colors"
                >
                  <ImageIcon className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Resim Seç</span>
                </button>
              )}
            </div>

            {/* Document Upload */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">PDF/Word Dosyası</Label>
              <input
                ref={docInputRef}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleDocSelect}
                className="hidden"
              />
              {docFile ? (
                <div className="relative w-full aspect-[3/4] bg-secondary rounded-lg flex flex-col items-center justify-center">
                  <FileText className="w-8 h-8 text-primary" />
                  <span className="text-xs text-muted-foreground mt-1 px-2 text-center truncate w-full">
                    {docFile.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {docPages} sayfa
                  </span>
                  <div className="absolute bottom-1 right-1 bg-primary/80 text-primary-foreground text-[10px] px-1.5 py-0.5 rounded uppercase">
                    {docType}
                  </div>
                  <button
                    onClick={removeDoc}
                    className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full shadow-md"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => docInputRef.current?.click()}
                  disabled={isProcessingDoc}
                  className="w-full aspect-[3/4] border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-secondary/50 transition-colors disabled:opacity-50"
                >
                  {isProcessingDoc ? (
                    <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                  ) : (
                    <>
                      <FileText className="w-5 h-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground text-center">Dosya Seç</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Book Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">Kitap Adı</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Kitap adını yazın..."
              className="bg-background"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-medium">Kategori (Opsiyonel)</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Örn: Roman, Bilim, Tarih..."
              className="bg-background"
            />
          </div>

          <Button 
            onClick={handleSubmit} 
            className="w-full"
            disabled={isProcessingDoc || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Kaydediliyor...
              </>
            ) : isProcessingDoc ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                İşleniyor...
              </>
            ) : (
              "Kaydet"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
