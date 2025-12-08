import { useState, useRef } from "react";
import { Lock, Star, Plus, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SubsectionCardProps {
  subsection: {
    id: string;
    section_id: string;
    package_id: string | null;
    icon_url: string | null;
    display_order: number;
    package_name?: string;
    word_count?: number;
    unlocked?: boolean;
    stars_progress?: { total: number; with3Stars: number };
  };
  index: number;
  isAdmin: boolean;
  availablePackages: { id: string; name: string }[];
  onUpdate: () => void;
}

export const SubsectionCard = ({
  subsection,
  index,
  isAdmin,
  availablePackages,
  onUpdate,
}: SubsectionCardProps) => {
  const navigate = useNavigate();
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [showIconDialog, setShowIconDialog] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string>(subsection.package_id || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const progress = subsection.stars_progress?.total
    ? (subsection.stars_progress.with3Stars / subsection.stars_progress.total) * 100
    : 0;

  const isLeft = index % 2 === 0;

  const handleClick = () => {
    if (isAdmin) {
      // Admin clicks icon to change it or select package
      if (!subsection.package_id) {
        setShowPackageDialog(true);
      } else {
        // Navigate to game selection with this package
        navigate(`/game-selection?package_id=${subsection.package_id}`);
      }
    } else {
      // User clicks to play
      if (subsection.package_id && subsection.unlocked) {
        navigate(`/game-selection?package_id=${subsection.package_id}`);
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

  return (
    <>
      <div
        className={cn(
          "relative flex items-center gap-4",
          isLeft ? "self-start ml-8" : "self-end mr-8"
        )}
      >
        {/* Connection line */}
        {index > 0 && (
          <div
            className={cn(
              "absolute top-0 w-0.5 h-8 bg-muted -translate-y-full",
              isLeft ? "left-1/2" : "right-1/2"
            )}
          />
        )}

        {/* Main circle button */}
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

          {/* Progress ring */}
          {(subsection.unlocked || isAdmin) && progress > 0 && (
            <svg className="absolute inset-0 -rotate-90 w-20 h-20" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="4"
                strokeDasharray={`${(progress / 100) * 226} 226`}
                className="transition-all duration-500"
              />
            </svg>
          )}

          {/* Star indicators */}
          {(subsection.unlocked || isAdmin) && subsection.package_id && (
            <div className="absolute -bottom-2 flex gap-0.5">
              {[1, 2, 3].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "w-4 h-4",
                    progress >= (star / 3) * 100
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground/30"
                  )}
                />
              ))}
            </div>
          )}
        </button>

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
          {(subsection.unlocked || isAdmin) && subsection.stars_progress && (
            <span className="text-xs text-primary">
              {subsection.stars_progress.with3Stars}/{subsection.stars_progress.total} ★
            </span>
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
    </>
  );
};
