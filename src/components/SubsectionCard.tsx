import { useState, useRef, useEffect } from "react";
import { Lock, Star, Plus, Minus, ImageIcon, Trash2, Image, GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { WordsPreviewModal } from "./WordsPreviewModal";

// Available games list - using internal routes
const AVAILABLE_GAMES = [
  { id: "flash", name: "Flash", route: "/flashcard", mode: "normal" },
  { id: "flash-hard", name: "Flash Hard", route: "/flashcard", mode: "hard" },
  { id: "eslestirme", name: "Eşleştirme", route: "/game2", mode: "normal" },
  { id: "tetris", name: "Tetris", route: "/game3", mode: "normal" },
  { id: "tetris-hard", name: "Tetris Hard", route: "/game3", mode: "hard" },
];

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
  background_url?: string | null;
  additional_package_ids?: string[];
  selected_game?: string | null;
  sentence_package?: string | null;
  sentence_round?: number | null;
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
  const location = useLocation();
  const { user } = useAuth();
  
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [showIconDialog, setShowIconDialog] = useState(false);
  const [showBackgroundDialog, setShowBackgroundDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showWordsPreview, setShowWordsPreview] = useState(false);
  const [showAdminEditDialog, setShowAdminEditDialog] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string>(subsection.package_id || "");
  const [selectedGame, setSelectedGame] = useState<string>((subsection as any).selected_game || "");
  const [sentencePackage, setSentencePackage] = useState<string>(subsection.sentence_package || "");
  const [sentenceRound, setSentenceRound] = useState<string>(subsection.sentence_round?.toString() || "");
  const [additionalPackages, setAdditionalPackages] = useState<string[]>(
    ((subsection as any).additional_package_ids as string[]) || []
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const [editName, setEditName] = useState((subsection as any).name || subsection.package_name || "");
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  
  // Key for forcing modal re-render when returning from game
  const [modalKey, setModalKey] = useState(0);

  // Reset modal key when location changes (returning from game)
  useEffect(() => {
    setModalKey(prev => prev + 1);
  }, [location.pathname]);

  const starRating = subsection.min_star_rating ?? 0;
  const isLeft = index % 2 === 0;

  // Pointer handlers for drag reordering (works on both mouse and touch)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isAdmin) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragStartX(e.clientX);
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isAdmin || dragStartX === null || !isDragging) return;
    const offset = e.clientX - dragStartX;
    setDragOffset(offset);
  };

  const handlePointerUp = async (e: React.PointerEvent) => {
    if (!isAdmin || !isDragging) {
      console.log("Pointer up ignored:", { isAdmin, isDragging });
      return;
    }
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    
    console.log("Pointer up - dragOffset:", dragOffset);
    
    // Calculate target position based on drag offset
    const sectionSubs = allSubsections
      .filter(s => s.section_id === subsection.section_id)
      .sort((a, b) => a.display_order - b.display_order);
    
    const currentIdx = sectionSubs.findIndex(s => s.id === subsection.id);
    
    // Calculate how many positions to move based on drag distance (120px per position)
    const positionsToMove = Math.round(dragOffset / 120);
    
    console.log("Position calculation:", { currentIdx, positionsToMove, dragOffset });
    
    if (positionsToMove !== 0) {
      const targetIdx = Math.max(0, Math.min(sectionSubs.length - 1, currentIdx + positionsToMove));
      
      console.log("Target index:", { targetIdx, willMove: targetIdx !== currentIdx });
      
      if (targetIdx !== currentIdx) {
        await moveSubsectionToPosition(subsection, currentIdx, targetIdx, sectionSubs);
      }
    } else {
      console.log("positionsToMove is 0, not moving");
    }
    
    setDragStartX(null);
    setDragOffset(0);
    setIsDragging(false);
  };

  // Move subsection to a specific position
  const moveSubsectionToPosition = async (
    sub: Subsection, 
    fromIdx: number, 
    toIdx: number, 
    subs: Subsection[]
  ) => {
    console.log("Moving subsection:", { fromIdx, toIdx, subsId: sub.id, subs: subs.map(s => ({ id: s.id, order: s.display_order })) });
    
    try {
      // Reorder the array
      const newOrder = [...subs];
      const [movedItem] = newOrder.splice(fromIdx, 1);
      newOrder.splice(toIdx, 0, movedItem);
      
      console.log("New order:", newOrder.map((s, idx) => ({ id: s.id, newOrder: idx })));
      
      // Update all display_order values sequentially to avoid conflicts
      for (let i = 0; i < newOrder.length; i++) {
        const { error } = await supabase
          .from("subsections")
          .update({ display_order: i })
          .eq("id", newOrder[i].id);
        
        if (error) {
          console.error("Error updating subsection order:", error);
          throw error;
        }
      }
      
      toast.success("Sıralama güncellendi");
      onUpdate();
    } catch (error) {
      console.error("Error moving subsection:", error);
      toast.error("Sıralama güncellenemedi");
    }
  };

  const handleClick = () => {
    const additionalIds = subsection.additional_package_ids || [];
    const additionalParam = additionalIds.length > 0 
      ? `&additional_package_ids=${additionalIds.join(',')}` 
      : '';

    // Sentence game params
    const sentenceParams = subsection.sentence_package 
      ? `&sentence_package=${subsection.sentence_package}${subsection.sentence_round ? `&sentence_round=${subsection.sentence_round}` : ''}`
      : '';

    // Check if there's a pre-selected game for this subsection
    const selectedGameId = subsection.selected_game;

    console.log("[SubsectionCard] click", {
      subsectionId: subsection.id,
      isAdmin,
      unlocked: subsection.unlocked,
      package_id: subsection.package_id,
      selected_game: selectedGameId,
      sentence_package: subsection.sentence_package,
      sentence_round: subsection.sentence_round,
      additional_package_ids: subsection.additional_package_ids,
      userId: user?.id,
    });

    const navigateToGame = () => {
      if (selectedGameId) {
        const game = AVAILABLE_GAMES.find(g => g.id === selectedGameId);
        if (game) {
          let route = `${game.route}?package_id=${subsection.package_id}${additionalParam}`;
          if (game.mode === "hard") {
            route += "&mode=hard";
          }
          if (subsection.sentence_package) {
            route += `&sentence_package=${subsection.sentence_package}`;
            if (subsection.sentence_round) {
              route += `&sentence_round=${subsection.sentence_round}`;
            }
          }
          navigate(route);
          return;
        }
      }
      // Default: go to game selection
      navigate(`/game?package_id=${subsection.package_id}${additionalParam}${sentenceParams}`);
    };

    if (isAdmin) {
      if (!subsection.package_id) {
        setShowPackageDialog(true);
      } else {
        navigateToGame();
      }
    } else {
      if (subsection.package_id && subsection.unlocked) {
        navigateToGame();
      }
    }
  };
  
  const handleSaveAdminEdit = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("subsections")
        .update({ 
          name: editName.trim() || null,
          selected_game: selectedGame || null,
          sentence_package: sentencePackage || null,
          sentence_round: sentenceRound ? parseInt(sentenceRound) : null
        })
        .eq("id", subsection.id);

      if (error) throw error;
      toast.success("Ayarlar kaydedildi");
      setShowAdminEditDialog(false);
      onUpdate();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Ayarlar kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAdmin) {
      setShowIconDialog(true);
    }
  };

  const addAdditionalPackage = () => {
    setAdditionalPackages(prev => [...prev, ""]);
  };

  const removeAdditionalPackage = (idx: number) => {
    setAdditionalPackages(prev => prev.filter((_, i) => i !== idx));
  };

  const updateAdditionalPackage = (idx: number, value: string) => {
    setAdditionalPackages(prev => prev.map((p, i) => i === idx ? value : p));
  };

  const handleSavePackage = async () => {
    if (!selectedPackage) return;
    setSaving(true);
    try {
      // Filter out empty additional packages
      const validAdditionalPackages = additionalPackages.filter(p => p && p !== selectedPackage);
      
      const { error } = await supabase
        .from("subsections")
        .update({ 
          package_id: selectedPackage,
          additional_package_ids: validAdditionalPackages
        })
        .eq("id", subsection.id);

      if (error) throw error;
      toast.success("Paketler atandı");
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
      const fileExt = file.name.split(".").pop();
      const fileName = `subsection-${subsection.id}-${Date.now()}.${fileExt}`;
      const filePath = `subsection-icons/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

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

  const handleBackgroundChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBackground(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `subsection-bg-${subsection.id}-${Date.now()}.${fileExt}`;
      const filePath = `subsection-backgrounds/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("subsections")
        .update({ background_url: urlData.publicUrl })
        .eq("id", subsection.id);

      if (updateError) throw updateError;

      toast.success("Arka plan güncellendi");
      setShowBackgroundDialog(false);
      onUpdate();
    } catch (error) {
      console.error("Error uploading background:", error);
      toast.error("Arka plan yüklenemedi");
    } finally {
      setUploadingBackground(false);
    }
  };

  const handleRemoveBackground = async () => {
    setUploadingBackground(true);
    try {
      const { error } = await supabase
        .from("subsections")
        .update({ background_url: null })
        .eq("id", subsection.id);

      if (error) throw error;

      toast.success("Arka plan kaldırıldı");
      setShowBackgroundDialog(false);
      onUpdate();
    } catch (error) {
      console.error("Error removing background:", error);
      toast.error("Arka plan kaldırılamadı");
    } finally {
      setUploadingBackground(false);
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
        ref={cardRef}
        className={cn(
          "relative flex items-center gap-3 transition-all duration-200",
          isLeft ? "self-center -translate-x-12" : "self-center translate-x-12"
        )}
        style={{
          transform: isDragging 
            ? `translateX(${dragOffset}px) ${isLeft ? 'translateX(-3rem)' : 'translateX(3rem)'}` 
            : undefined,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {/* Drag Handle for Admin */}
        {isAdmin && (
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={cn(
              "absolute -top-3 left-1/2 cursor-grab active:cursor-grabbing z-20 rounded-full p-2 shadow-md select-none",
              isDragging ? "bg-primary scale-125" : "bg-muted/90 hover:bg-muted border border-border"
            )}
            style={{
              transform: isDragging 
                ? `translateX(calc(-50% + ${dragOffset}px)) scale(1.25)` 
                : 'translateX(-50%)',
              transition: isDragging ? 'none' : 'transform 0.2s, background-color 0.2s',
            }}
            title="Sürükle-bırak ile taşı"
          >
            <GripHorizontal className={cn("w-5 h-5", isDragging ? "text-primary-foreground" : "text-muted-foreground")} />
          </div>
        )}
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
            {(subsection as any).name || subsection.package_name || "Paket seç"}
          </span>
          {subsection.word_count !== undefined && (
            <span className="text-xs text-muted-foreground">
              {subsection.word_count} kelime
            </span>
          )}

          {/* Admin buttons */}
          {isAdmin && subsection.package_id && (
            <div className="flex gap-1 mt-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditName((subsection as any).name || subsection.package_name || "");
                  setSelectedGame(subsection.selected_game || "");
                  setSentencePackage(subsection.sentence_package || "");
                  setSentenceRound(subsection.sentence_round?.toString() || "");
                  setShowAdminEditDialog(true);
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteDialog(true);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Package Selection Dialog */}
      <Dialog open={showPackageDialog} onOpenChange={setShowPackageDialog}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Paket Seç</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Primary package */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Ana Paket</label>
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
            </div>

            {/* Additional packages */}
            {additionalPackages.map((pkgId, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Ek Paket {idx + 1}</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive"
                    onClick={() => removeAdditionalPackage(idx)}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                </div>
                <Select value={pkgId} onValueChange={(val) => updateAdditionalPackage(idx, val)}>
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
              </div>
            ))}

            {/* Add more package button */}
            <Button
              variant="outline"
              size="sm"
              onClick={addAdditionalPackage}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Paket Ekle
            </Button>

            <Button onClick={handleSavePackage} disabled={!selectedPackage || saving} className="w-full">
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>


      {/* Background Image Dialog */}
      <Dialog open={showBackgroundDialog} onOpenChange={setShowBackgroundDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alt Bölüm Arka Planı</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <input
              ref={backgroundInputRef}
              type="file"
              accept="image/*"
              onChange={handleBackgroundChange}
              className="hidden"
            />
            <Button
              onClick={() => backgroundInputRef.current?.click()}
              disabled={uploadingBackground}
              className="w-full"
            >
              {uploadingBackground ? "Yükleniyor..." : "Fotoğraf Yükle"}
            </Button>
            {subsection.background_url && (
              <Button
                variant="destructive"
                onClick={handleRemoveBackground}
                disabled={uploadingBackground}
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Arka Planı Kaldır
              </Button>
            )}
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

      {/* Admin Edit Dialog - Combined settings */}
      <Dialog open={showAdminEditDialog} onOpenChange={setShowAdminEditDialog}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Alt Bölüm Ayarları</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Subsection Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Alt Bölüm İsmi</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Alt bölüm ismi"
                className="w-full p-2 border rounded-md bg-background"
              />
            </div>

            {/* Game Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Oyun Seç</label>
              <Select value={selectedGame || "__none__"} onValueChange={(val) => setSelectedGame(val === "__none__" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Oyun seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Seçim yok (Tur ekranı)</SelectItem>
                  {AVAILABLE_GAMES.map((game) => (
                    <SelectItem key={game.id} value={game.id}>
                      {game.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sentence Package */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Cümle Paketi (örn: 1.1)</label>
              <input
                type="text"
                value={sentencePackage}
                onChange={(e) => setSentencePackage(e.target.value)}
                placeholder="Bölüm numarası (örn: 1.1, 2.3)"
                className="w-full p-2 border rounded-md bg-background"
              />
            </div>

            {/* Sentence Round */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Cümle Turu</label>
              <Select value={sentenceRound || "__none__"} onValueChange={(val) => setSentenceRound(val === "__none__" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tur seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Seçim yok</SelectItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((round) => (
                    <SelectItem key={round} value={round.toString()}>
                      {round}. Tur
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSaveAdminEdit} disabled={saving} className="w-full">
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Words Preview Modal - key forces re-render when returning from game */}
      {subsection.package_id && (
        <WordsPreviewModal
          key={`${subsection.id}-${modalKey}`}
          open={showWordsPreview}
          onOpenChange={setShowWordsPreview}
          packageId={subsection.package_id}
          packageName={subsection.package_name || "Kelimeler"}
          subsectionId={subsection.id}
          onActivate={onUpdate}
          additionalPackageIds={subsection.additional_package_ids || []}
        />
      )}
    </>
  );
};