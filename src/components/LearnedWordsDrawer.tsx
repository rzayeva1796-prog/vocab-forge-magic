import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { GraduationCap, Trash2, FolderPlus, Package, ArrowLeft, X, Pencil, Check, Loader2 } from "lucide-react";
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
import { CollapsiblePackageList } from "./CollapsiblePackageList";

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
  const [selectedSubPackage, setSelectedSubPackage] = useState<string | null>(null);
  const [newPackageName, setNewPackageName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [packageWords, setPackageWords] = useState<Word[]>([]);
  const [loadingPackageWords, setLoadingPackageWords] = useState(false);
  const [editingWord, setEditingWord] = useState<{english: string; turkish: string} | null>(null);
  const [editEnglish, setEditEnglish] = useState("");
  const [editTurkish, setEditTurkish] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPackages();
  }, []);

  // Load words for selected package/sub-package (handles > 1000 words)
  useEffect(() => {
    if (selectedPackage === null) {
      setPackageWords(words);
    } else {
      loadPackageWords(selectedPackage, selectedSubPackage);
    }
  }, [selectedPackage, selectedSubPackage, words]);

  const loadPackageWords = async (packageId: string, subPackageId: string | null) => {
    setLoadingPackageWords(true);
    try {
      // Fetch all words for package without 1000 limit by paginating
      let allPackageWords: Word[] = [];
      let offset = 0;
      const limit = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from("learned_words")
          .select("english, turkish, frequency_group, package_id")
          .eq("package_id", packageId);

        // Filter by sub-package if selected
        if (subPackageId) {
          query = query.eq("sub_package_id", subPackageId);
        }

        const { data, error } = await query
          .range(offset, offset + limit - 1)
          .order("added_at", { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          allPackageWords = [...allPackageWords, ...data];
          offset += limit;
          hasMore = data.length === limit;
        } else {
          hasMore = false;
        }
      }

      setPackageWords(allPackageWords);
    } catch (error) {
      console.error("Error loading package words:", error);
    } finally {
      setLoadingPackageWords(false);
    }
  };

  const loadPackages = async () => {
    const { data: packagesData, error: packagesError } = await supabase
      .from("word_packages")
      .select("id, name");

    if (packagesError) {
      console.error("Error loading packages:", packagesError);
      return;
    }

    // Count words per package using exact count
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

  const handleEditWord = async () => {
    if (!editingWord || !editEnglish.trim() || !editTurkish.trim()) return;

    try {
      const { error } = await supabase
        .from("learned_words")
        .update({
          english: editEnglish.trim().toLowerCase(),
          turkish: editTurkish.trim().toLowerCase(),
        })
        .eq("english", editingWord.english)
        .eq("turkish", editingWord.turkish);

      if (error) throw error;

      toast({
        title: "Başarılı",
        description: "Kelime güncellendi",
      });

      setEditingWord(null);
      if (selectedPackage) {
        loadPackageWords(selectedPackage, selectedSubPackage);
      }
      onWordsAdded?.();
    } catch (error) {
      console.error("Error updating word:", error);
      toast({
        title: "Hata",
        description: "Kelime güncellenemedi",
        variant: "destructive",
      });
    }
  };

  const handleDeletePackage = async (packageId: string, packageName: string) => {
    try {
      // First, remove package_id from episodes (foreign key constraint)
      const { error: episodesError } = await supabase
        .from("episodes")
        .update({ package_id: null })
        .eq("package_id", packageId);

      if (episodesError) {
        console.error("Episodes update error:", episodesError);
      }

      // Then, remove package_id and package_name from words
      const { error: wordsError } = await supabase
        .from("learned_words")
        .update({ package_id: null, package_name: null })
        .eq("package_id", packageId);

      if (wordsError) {
        console.error("Words update error:", wordsError);
      }

      // Remove package_id from subsections
      const { error: subsectionsError } = await supabase
        .from("subsections")
        .update({ package_id: null })
        .eq("package_id", packageId);

      if (subsectionsError) {
        console.error("Subsections update error:", subsectionsError);
      }

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

      // Get existing words to check for duplicates (check both english and turkish)
      const { data: existingWords } = await supabase
        .from("learned_words")
        .select("english, turkish");

      // Create a set of existing word pairs (english|turkish)
      const existingPairs = new Set(
        (existingWords || []).map((w) => `${w.english.toLowerCase()}|${w.turkish.toLowerCase()}`)
      );

      console.log("Existing words count:", existingWords?.length);
      console.log("New words from Excel:", newWords.length);

      // Filter out words that already exist (same english AND turkish pair)
      const uniqueWords = newWords.filter((w) => {
        const pair = `${w.english.toLowerCase()}|${w.turkish.toLowerCase()}`;
        const exists = existingPairs.has(pair);
        if (exists) {
          console.log("Skipping existing word:", w.english, "-", w.turkish);
        }
        return !exists;
      });

      console.log("Unique words to insert:", uniqueWords.length);

      if (uniqueWords.length === 0) {
        toast({
          title: "Bilgi",
          description: "Tüm kelimeler zaten mevcut.",
        });
        setIsUploading(false);
        return;
      }

      // Create package first
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

      console.log("Package created:", packageData.id, packageData.name);

      // Insert ONLY unique words - never update existing ones
      let insertedCount = 0;
      let errorCount = 0;
      for (const w of uniqueWords) {
        const { error: insertError } = await supabase
          .from("learned_words")
          .insert({
            english: w.english,
            turkish: w.turkish,
            frequency_group: "1k",
            star_rating: 0,
            package_id: packageData.id,
            package_name: newPackageName.trim(),
          });

        if (insertError) {
          console.error("Insert error for word:", w.english, insertError.message);
          errorCount++;
        } else {
          insertedCount++;
        }
      }

      console.log("Inserted:", insertedCount, "Errors:", errorCount);

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
    if (selectedPackage === null) {
      return words;
    }
    return packageWords;
  };

  const getPackageWordCount = (packageId: string | null) => {
    if (packageId === null) {
      return words.length;
    }
    const pkg = packages.find(p => p.id === packageId);
    return pkg?.word_count || 0;
  };

  const handleSelectPackage = (packageId: string | null, subPackageId: string | null) => {
    setSelectedPackage(packageId);
    setSelectedSubPackage(subPackageId);
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
              setSelectedSubPackage(null);
            }}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Package className="w-5 h-5" />
          Kelime Paketleri
        </SheetTitle>
      </SheetHeader>

      <div className="mt-4 mb-4">
        <ScrollArea className="h-[200px] border rounded-md p-2">
          <CollapsiblePackageList
            packages={packages}
            selectedPackage={selectedPackage}
            selectedSubPackage={selectedSubPackage}
            onSelectPackage={handleSelectPackage}
            showAllOption={true}
            totalWords={words.length}
          />
        </ScrollArea>
        
        <div className="flex gap-2 mt-2">
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
      </div>

      <ScrollArea className="h-[calc(100vh-22rem)]">
        {loadingPackageWords ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : getFilteredWords().length === 0 ? (
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
                {editingWord?.english === word.english && editingWord?.turkish === word.turkish ? (
                  <div className="flex-1 space-y-2">
                    <Input
                      value={editEnglish}
                      onChange={(e) => setEditEnglish(e.target.value)}
                      placeholder="İngilizce"
                      className="h-8"
                    />
                    <Input
                      value={editTurkish}
                      onChange={(e) => setEditTurkish(e.target.value)}
                      placeholder="Türkçe"
                      className="h-8"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleEditWord}>
                        <Check className="w-3 h-3 mr-1" />
                        Kaydet
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingWord(null)}>
                        <X className="w-3 h-3 mr-1" />
                        İptal
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{word.english}</span>
                        <Badge variant="outline" className="text-xs">
                          {word.frequency_group}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">{word.turkish}</span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingWord({ english: word.english, turkish: word.turkish });
                          setEditEnglish(word.english);
                          setEditTurkish(word.turkish);
                        }}
                      >
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onRemove(word)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </>
                )}
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
