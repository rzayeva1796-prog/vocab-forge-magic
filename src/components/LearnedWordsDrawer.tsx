import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { GraduationCap, Trash2, FolderPlus, Package, ArrowLeft, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

interface Word {
  english: string;
  turkish: string;
  frequency_group: string;
  package_id?: string | null;
}

interface WordPackage {
  id: string;
  name: string;
  word_count: number;
}

interface LearnedWordsDrawerProps {
  words: Word[];
  onRemove: (word: Word) => void;
  onWordsAdded?: () => void;
}

type ViewMode = "main" | "packages" | "add-package";

export const LearnedWordsDrawer = ({ words, onRemove, onWordsAdded }: LearnedWordsDrawerProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("main");
  const [packages, setPackages] = useState<WordPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [newPackageName, setNewPackageName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    const { data: packagesData, error: packagesError } = await supabase
      .from("word_packages")
      .select("id, name");

    if (packagesError) {
      console.error("Error loading packages:", packagesError);
      return;
    }

    // Count words per package
    const packagesWithCount: WordPackage[] = await Promise.all(
      (packagesData || []).map(async (pkg) => {
        const { count } = await supabase
          .from("learned_words")
          .select("*", { count: "exact", head: true })
          .eq("package_id", pkg.id);

        return {
          id: pkg.id,
          name: pkg.name,
          word_count: count || 0,
        };
      })
    );

    setPackages(packagesWithCount);
  };

  const handleDeletePackage = async (packageId: string, packageName: string) => {
    try {
      // First, remove package_id from words (don't delete the words themselves)
      await supabase
        .from("learned_words")
        .update({ package_id: null })
        .eq("package_id", packageId);

      // Then delete the package
      const { error } = await supabase
        .from("word_packages")
        .delete()
        .eq("id", packageId);

      if (error) throw error;

      toast({
        title: "Başarılı",
        description: `"${packageName}" paketi silindi.`,
      });

      await loadPackages();
      onWordsAdded?.();
      setSelectedPackage("all");
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Hata",
        description: "Paket silinirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteOrphanWords = async () => {
    try {
      const { data: orphanWords, error: fetchError } = await supabase
        .from("learned_words")
        .select("id")
        .is("package_id", null);

      if (fetchError) throw fetchError;

      if (!orphanWords || orphanWords.length === 0) {
        toast({
          title: "Bilgi",
          description: "Paketsiz kelime bulunamadı.",
        });
        return;
      }

      const { error } = await supabase
        .from("learned_words")
        .delete()
        .is("package_id", null);

      if (error) throw error;

      toast({
        title: "Başarılı",
        description: `${orphanWords.length} paketsiz kelime silindi.`,
      });

      onWordsAdded?.();
    } catch (error) {
      console.error("Delete orphan words error:", error);
      toast({
        title: "Hata",
        description: "Kelimeler silinirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !newPackageName.trim()) {
      toast({
        title: "Hata",
        description: "Paket ismi ve dosya seçilmelidir.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Read Excel file
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

      // Extract words from Excel (A = English, B = Turkish)
      const newWords: { english: string; turkish: string }[] = [];
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row[0] && row[1]) {
          newWords.push({
            english: String(row[0]).trim().toLowerCase(),
            turkish: String(row[1]).trim().toLowerCase(),
          });
        }
      }

      if (newWords.length === 0) {
        toast({
          title: "Hata",
          description: "Excel dosyasında kelime bulunamadı.",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }

      // Get existing words to check for duplicates
      const { data: existingWords } = await supabase
        .from("learned_words")
        .select("english");

      const existingSet = new Set(
        (existingWords || []).map((w) => w.english.toLowerCase())
      );

      // Filter out duplicates
      const uniqueWords = newWords.filter(
        (w) => !existingSet.has(w.english.toLowerCase())
      );

      if (uniqueWords.length === 0) {
        toast({
          title: "Bilgi",
          description: "Tüm kelimeler zaten mevcut.",
        });
        setIsUploading(false);
        return;
      }

      // Create package
      const { data: packageData, error: packageError } = await supabase
        .from("word_packages")
        .insert({ name: newPackageName.trim() })
        .select()
        .single();

      if (packageError) {
        if (packageError.code === "23505") {
          toast({
            title: "Hata",
            description: "Bu isimde bir paket zaten var.",
            variant: "destructive",
          });
        } else {
          throw packageError;
        }
        setIsUploading(false);
        return;
      }

      // Insert unique words with package_id one by one to handle any remaining duplicates
      let insertedCount = 0;
      for (const w of uniqueWords) {
        const { error: insertError } = await supabase
          .from("learned_words")
          .upsert(
            {
              english: w.english,
              turkish: w.turkish,
              frequency_group: "1k",
              star_rating: 0,
              package_id: packageData.id,
            },
            { onConflict: "english,turkish", ignoreDuplicates: true }
          );

        if (!insertError) {
          insertedCount++;
        }
      }

      const skippedCount = newWords.length - insertedCount;

      toast({
        title: "Başarılı",
        description: `${insertedCount} kelime eklendi. (${skippedCount} tekrar atlandı)`,
      });

      // Reset state
      setNewPackageName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadPackages();
      onWordsAdded?.();
      setViewMode("packages");
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Hata",
        description: "Dosya yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getFilteredWords = () => {
    if (selectedPackage === null || selectedPackage === "all") {
      return words;
    }
    return words.filter((w) => w.package_id === selectedPackage);
  };

  const getPackageWordCount = (packageId: string | null) => {
    if (packageId === null || packageId === "all") {
      return words.length;
    }
    return words.filter((w) => w.package_id === packageId).length;
  };

  const renderMainView = () => (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5" />
          Learned Words ({words.length})
        </SheetTitle>
      </SheetHeader>

      <div className="flex gap-2 mt-4 mb-4">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            setSelectedPackage("all");
            setViewMode("packages");
          }}
        >
          <Package className="w-4 h-4 mr-2" />
          Kelime Paketleri
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setViewMode("add-package")}
        >
          <FolderPlus className="w-4 h-4 mr-2" />
          Paket Ekle
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-12rem)]">
        {words.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <GraduationCap className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No learned words yet!</p>
            <p className="text-sm mt-1">Start learning by adding words from your practice.</p>
          </div>
        ) : (
          <div className="space-y-1 pr-4">
            {words.map((word, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-md hover:bg-secondary/50 transition-colors group"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{word.english}</span>
                    <Badge variant="outline" className="text-xs">
                      {word.frequency_group}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">{word.turkish}</span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onRemove(word)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </>
  );

  const renderPackagesView = () => (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setViewMode("main");
              setSelectedPackage(null);
            }}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Package className="w-5 h-5" />
          Kelime Paketleri
        </SheetTitle>
      </SheetHeader>

      <div className="flex flex-wrap gap-2 mt-4 mb-4">
        <Button
          variant={selectedPackage === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedPackage("all")}
        >
          Tümü ({words.length})
        </Button>
        {packages.map((pkg) => (
          <div key={pkg.id} className="flex items-center gap-1">
            <Button
              variant={selectedPackage === pkg.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPackage(pkg.id)}
            >
              {pkg.name} ({getPackageWordCount(pkg.id)})
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <X className="w-3 h-3 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Paketi Sil</AlertDialogTitle>
                  <AlertDialogDescription>
                    "{pkg.name}" paketini silmek istediğinize emin misiniz? 
                    Kelimeler silinmeyecek, sadece paket bağlantısı kaldırılacak.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>İptal</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDeletePackage(pkg.id, pkg.name)}>
                    Sil
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive/10">
              <Trash2 className="w-3 h-3 mr-1" />
              Paketsiz Kelimeleri Sil
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Paketsiz Kelimeleri Sil</AlertDialogTitle>
              <AlertDialogDescription>
                Hiçbir pakete ait olmayan tüm kelimeler silinecek. Bu işlem geri alınamaz.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteOrphanWords}>
                Sil
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <ScrollArea className="h-[calc(100vh-14rem)]">
        {getFilteredWords().length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Bu pakette kelime yok.</p>
          </div>
        ) : (
          <div className="space-y-1 pr-4">
            {getFilteredWords().map((word, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-md hover:bg-secondary/50 transition-colors group"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{word.english}</span>
                    <Badge variant="outline" className="text-xs">
                      {word.frequency_group}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">{word.turkish}</span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onRemove(word)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </>
  );

  const renderAddPackageView = () => (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode("main")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <FolderPlus className="w-5 h-5" />
          Paket Ekle
        </SheetTitle>
      </SheetHeader>

      <div className="mt-6 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Paket İsmi</label>
          <Input
            placeholder="Paket ismini girin..."
            value={newPackageName}
            onChange={(e) => setNewPackageName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Excel Dosyası</label>
          <p className="text-xs text-muted-foreground">
            A sütunu: İngilizce, B sütunu: Türkçe
          </p>
          <div className="flex gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={isUploading || !newPackageName.trim()}
              className="flex-1"
            />
          </div>
        </div>

        {isUploading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Yükleniyor...</p>
          </div>
        )}
      </div>
    </>
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <GraduationCap className="w-4 h-4 mr-2" />
          Learned ({words.length})
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        {viewMode === "main" && renderMainView()}
        {viewMode === "packages" && renderPackagesView()}
        {viewMode === "add-package" && renderAddPackageView()}
      </SheetContent>
    </Sheet>
  );
};
