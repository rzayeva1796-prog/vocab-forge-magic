import { useState, useRef } from "react";
import { Lock, Star, Plus, Minus, ImageIcon, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
interface Subsection {
  id: string;
  section_id: string;
  package_id: string | null;
  icon_url: string | null;
  display_order: number;
  package_name?: string;
  word_count?: number;
  unlocked?: boolean;
  min_star_rating?: number;
}

interface SubsectionCardProps {
  subsection: Subsection;
  index: number;
  isAdmin: boolean;
  availablePackages: { id: string; name: string }[];
  onUpdate: () => void;
  onDelete?: (id: string) => void;
  onReorder?: (draggedId: string, targetId: string) => void;
  allSubsections?: Subsection[];
}

export const SubsectionCard = ({
  subsection,
  index,
  isAdmin,
  availablePackages,
  onUpdate,
  onDelete,
  onReorder,
  allSubsections = [],
}: SubsectionCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isDragOver, setIsDragOver] = useState(false);
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [showIconDialog, setShowIconDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string>(subsection.package_id || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [adjustingStars, setAdjustingStars] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const starRating = subsection.min_star_rating ?? 0;
  const isLeft = index % 2 === 0;

  const handleClick = () => {
    if (isAdmin) {
      // Admin clicks icon to change it or select package
      if (!subsection.package_id) {
        setShowPackageDialog(true);
      } else {
        // Navigate to game selection with this package
        navigate(`/game?package_id=${subsection.package_id}`);
      }
    } else {
      // User clicks to play
      if (subsection.package_id && subsection.unlocked) {
        navigate(`/game?package_id=${subsection.package_id}`);
      }
    }
  };

  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAdmin) {
      setShowIconDialog(true);
    }
  };

  const handleSavePackage = async () => {
    if (!selectedPackage) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("subsections")
        .update({ package_id: selectedPackage })
        .eq("id", subsection.id);

      if (error) throw error;
      toast.success("Paket atandı");
      setShowPackageDialog(false);
      onUpdate();
    } catch (error) {
      console.error("Error saving package:", error);
      toast.error("Paket atanamadı");
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Upload to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `subsection-${subsection.id}-${Date.now()}.${fileExt}`;
      const filePath = `subsection-icons/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Update subsection with icon URL
      const { error: updateError } = await supabase
        .from("subsections")
        .update({ icon_url: urlData.publicUrl })
        .eq("id", subsection.id);

      if (updateError) throw updateError;

      toast.success("Simge güncellendi");
      setShowIconDialog(false);
      onUpdate();
    } catch (error) {
      console.error("Error uploading icon:", error);
      toast.error("Simge yüklenemedi");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("subsections")
        .delete()
        .eq("id", subsection.id);

      if (error) throw error;
      toast.success("Alt bölüm silindi");
      setShowDeleteDialog(false);
      onDelete?.(subsection.id);
    } catch (error) {
      console.error("Error deleting subsection:", error);
      toast.error("Alt bölüm silinemedi");
    } finally {
      setDeleting(false);
    }
  };

  const handleAdjustStars = async (delta: number) => {
    if (!user || !subsection.package_id) return;
    
    setAdjustingStars(true);
    try {
      // Get all words in this package
      const { data: words } = await supabase
        .from("learned_words")
        .select("id")
        .eq("package_id", subsection.package_id);

      if (!words || words.length === 0) {
        toast.error("Bu pakette kelime yok");
        return;
      }

      const wordIds = words.map(w => w.id);

      // Get existing progress for these words
      const { data: existingProgress } = await supabase
        .from("user_word_progress")
        .select("word_id, star_rating")
        .eq("user_id", user.id)
        .in("word_id", wordIds);

      const existingMap: Record<string, number> = {};
      (existingProgress || []).forEach(p => {
        existingMap[p.word_id] = p.star_rating;
      });

      // Prepare upsert data
      const upsertData = wordIds.map(wordId => {
        const currentRating = existingMap[wordId] ?? 0;
        const newRating = Math.max(0, Math.min(5, currentRating + delta));
        return {
          user_id: user.id,
          word_id: wordId,
          star_rating: newRating,
        };
      });

      // Upsert all progress
      const { error } = await supabase
        .from("user_word_progress")
        .upsert(upsertData, { onConflict: "user_id,word_id" });

      if (error) throw error;

      toast.success(delta > 0 ? "Yıldızlar artırıldı" : "Yıldızlar azaltıldı");
      onUpdate();
    } catch (error) {
      console.error("Error adjusting stars:", error);
      toast.error("Yıldızlar güncellenemedi");
    } finally {
      setAdjustingStars(false);
    }
  };

  // Render 5 stars based on min_star_rating
  const renderStars = () => {
    return (
      <div className="flex gap-0.5 mt-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "w-3 h-3",
              star <= starRating
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30"
            )}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <div
        className={cn(
          "relative flex items-center gap-3 transition-all duration-200",
          isLeft ? "self-center -translate-x-12" : "self-center translate-x-12",
          isAdmin && "cursor-grab active:cursor-grabbing",
          isDragOver && "scale-110 ring-2 ring-primary"
        )}
        draggable={isAdmin}
        onDragStart={(e) => {
          if (isAdmin) {
            e.dataTransfer.setData("subsection-id", subsection.id);
            e.dataTransfer.setData("subsection-order", String(subsection.display_order));
            e.dataTransfer.setData("section-id", subsection.section_id);
            e.dataTransfer.effectAllowed = "move";
          }
        }}
        onDragOver={(e) => {
          if (isAdmin) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setIsDragOver(true);
          }
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDragEnd={() => setIsDragOver(false)}
        onDrop={async (e) => {
          if (!isAdmin) return;
          e.preventDefault();
          setIsDragOver(false);
          
          const draggedId = e.dataTransfer.getData("subsection-id");
          const draggedOrder = parseInt(e.dataTransfer.getData("subsection-order"));
          const draggedSectionId = e.dataTransfer.getData("section-id");
          
          // Only allow reorder within same section
          if (draggedId && draggedId !== subsection.id && draggedSectionId === subsection.section_id) {
            try {
              const targetOrder = subsection.display_order;
              
              // Update local state immediately
              onReorder?.(draggedId, subsection.id);
              
              // Update database in background
              await Promise.all([
                supabase
                  .from("subsections")
                  .update({ display_order: targetOrder })
                  .eq("id", draggedId),
                supabase
                  .from("subsections")
                  .update({ display_order: draggedOrder })
                  .eq("id", subsection.id)
              ]);
              
              toast.success("Sıralama güncellendi");
            } catch (error) {
              console.error("Error reordering:", error);
              toast.error("Sıralama güncellenemedi");
              onUpdate(); // Reload on error
            }
          }
        }}
      >

        {/* Main circle button */}
        <div className="flex flex-col items-center">
          <button
            disabled={!isAdmin && (!subsection.package_id || !subsection.unlocked)}
            onClick={handleClick}
            className={cn(
              "relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300",
              subsection.unlocked || isAdmin
                ? "bg-muted hover:bg-muted/80 cursor-pointer shadow-lg hover:scale-105"
                : "bg-muted/50 cursor-not-allowed opacity-60"
            )}
          >
            {subsection.icon_url ? (
              <div className="relative w-full h-full">
                <img
                  src={subsection.icon_url}
                  alt="icon"
                  className="w-full h-full rounded-full object-cover"
                />
                {isAdmin && (
                  <button
                    onClick={handleIconClick}
                    className="absolute inset-0 bg-black/50 rounded-full opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    <ImageIcon className="w-6 h-6 text-white" />
                  </button>
                )}
              </div>
            ) : !subsection.package_id ? (
              <Plus className="w-8 h-8 text-muted-foreground" />
            ) : !subsection.unlocked && !isAdmin ? (
              <Lock className="w-8 h-8 text-muted-foreground" />
            ) : (
              <div
                className="w-full h-full rounded-full bg-primary/20 flex items-center justify-center"
                onClick={isAdmin ? handleIconClick : undefined}
              >
                {isAdmin && <ImageIcon className="w-6 h-6 text-primary" />}
              </div>
            )}
          </button>

          {/* 5-star rating display under the icon */}
          {subsection.package_id && (subsection.unlocked || isAdmin) && renderStars()}
        </div>

        {/* Package name and info */}
        <div className={cn("flex flex-col", isLeft ? "items-start" : "items-end")}>
          <span
            className={cn(
              "font-semibold text-sm",
              subsection.unlocked || isAdmin ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {subsection.package_name || "Paket seç"}
          </span>
          {subsection.word_count !== undefined && (
            <span className="text-xs text-muted-foreground">
              {subsection.word_count} kelime
            </span>
          )}
          
          {/* Admin star adjustment buttons */}
          {isAdmin && subsection.package_id && (
            <div className="flex gap-1 mt-1">
              <Button
                variant="outline"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAdjustStars(-1);
                }}
                disabled={adjustingStars}
              >
                <Minus className="w-3 h-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAdjustStars(1);
                }}
                disabled={adjustingStars}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          )}
          
          {/* Admin delete button */}
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-destructive hover:text-destructive hover:bg-destructive/10 mt-1"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteDialog(true);
              }}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Sil
            </Button>
          )}
        </div>
      </div>

      {/* Package Selection Dialog */}
      <Dialog open={showPackageDialog} onOpenChange={setShowPackageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Paket Seç</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedPackage} onValueChange={setSelectedPackage}>
              <SelectTrigger>
                <SelectValue placeholder="Bir paket seçin" />
              </SelectTrigger>
              <SelectContent>
                {availablePackages.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    {pkg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSavePackage} disabled={!selectedPackage || saving} className="w-full">
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Icon Upload Dialog */}
      <Dialog open={showIconDialog} onOpenChange={setShowIconDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Simge Yükle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full"
            >
              {uploading ? "Yükleniyor..." : "Telefondan Resim Seç"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alt Bölümü Sil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              "{subsection.package_name || "Bu alt bölüm"}" silinecek. Emin misiniz?
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                className="flex-1"
              >
                İptal
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1"
              >
                {deleting ? "Siliniyor..." : "Sil"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
