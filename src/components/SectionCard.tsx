import { useState, useRef } from "react";
import { ChevronDown, ChevronUp, Pencil, Check, X, Star, Lock, ImageIcon, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SectionCardProps {
  section: {
    id: string;
    name: string;
    display_order: number;
    min_star_rating?: number;
    background_url?: string | null;
    content_background_url?: string | null;
  };
  isAdmin: boolean;
  isExpanded: boolean;
  isLocked?: boolean;
  onToggle: () => void;
  onUpdateName: (id: string, name: string) => Promise<void>;
  onUpdateBackground?: (id: string, url: string | null, type: 'header' | 'content') => void;
  children: React.ReactNode;
}

export const SectionCard = ({
  section,
  isAdmin,
  isExpanded,
  isLocked = false,
  onToggle,
  onUpdateName,
  onUpdateBackground,
  children,
}: SectionCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(section.name);
  const [saving, setSaving] = useState(false);
  const [showHeaderImageDialog, setShowHeaderImageDialog] = useState(false);
  const [showContentImageDialog, setShowContentImageDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const headerFileInputRef = useRef<HTMLInputElement>(null);
  const contentFileInputRef = useRef<HTMLInputElement>(null);

  const starRating = section.min_star_rating ?? 0;

  const handleSave = async () => {
    if (editName.trim() === "") return;
    setSaving(true);
    await onUpdateName(section.id, editName.trim());
    setSaving(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(section.name);
    setIsEditing(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'header' | 'content') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `section-${type}-${section.id}-${Date.now()}.${fileExt}`;
      const filePath = `section-backgrounds/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const column = type === 'header' ? 'background_url' : 'content_background_url';
      const { error: updateError } = await supabase
        .from("sections")
        .update({ [column]: urlData.publicUrl })
        .eq("id", section.id);

      if (updateError) throw updateError;

      toast.success(type === 'header' ? "Başlık arka planı güncellendi" : "İçerik arka planı güncellendi");
      if (type === 'header') {
        setShowHeaderImageDialog(false);
      } else {
        setShowContentImageDialog(false);
      }
      onUpdateBackground?.(section.id, urlData.publicUrl, type);
    } catch (error) {
      console.error("Error uploading background:", error);
      toast.error("Arka plan yüklenemedi");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveBackground = async (type: 'header' | 'content') => {
    setUploading(true);
    try {
      const column = type === 'header' ? 'background_url' : 'content_background_url';
      const { error } = await supabase
        .from("sections")
        .update({ [column]: null })
        .eq("id", section.id);

      if (error) throw error;

      toast.success("Arka plan kaldırıldı");
      if (type === 'header') {
        setShowHeaderImageDialog(false);
      } else {
        setShowContentImageDialog(false);
      }
      onUpdateBackground?.(section.id, null, type);
    } catch (error) {
      console.error("Error removing background:", error);
      toast.error("Arka plan kaldırılamadı");
    } finally {
      setUploading(false);
    }
  };

  // Render 5 stars based on min_star_rating
  const renderStars = () => {
    return (
      <div className="flex gap-0.5 ml-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "w-4 h-4",
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
      <div className={cn(
        "w-full rounded-xl bg-card border border-border overflow-hidden",
        isLocked && !isAdmin && "opacity-60"
      )}>
        {/* Section Header */}
        <div
          className={cn(
            "relative flex items-center justify-between p-4 cursor-pointer transition-colors",
            "hover:bg-muted/50",
            isLocked && !isAdmin && "cursor-not-allowed"
          )}
          style={section.background_url ? {
            backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${section.background_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          } : undefined}
          onClick={() => !isEditing && !isLocked && onToggle()}
        >
          {isEditing ? (
            <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-8 text-lg font-bold"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") handleCancel();
                }}
              />
              <Button size="icon" variant="ghost" onClick={handleSave} disabled={saving}>
                <Check className="w-4 h-4 text-green-500" />
              </Button>
              <Button size="icon" variant="ghost" onClick={handleCancel} disabled={saving}>
                <X className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 flex-1">
              {isLocked && !isAdmin && <Lock className="w-4 h-4 text-muted-foreground" />}
              <h2 className={cn(
                "text-lg font-bold text-center",
                section.background_url ? "text-white" : "text-foreground"
              )}>
                {section.name}
              </h2>
              {renderStars()}
              {isAdmin && (
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(true);
                    }}
                  >
                    <Pencil className={cn("w-3.5 h-3.5", section.background_url ? "text-white" : "text-muted-foreground")} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowHeaderImageDialog(true);
                    }}
                    title="Başlık Arka Planı"
                  >
                    <ImageIcon className={cn("w-3.5 h-3.5", section.background_url ? "text-white" : "text-muted-foreground")} />
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center">
            {isExpanded ? (
              <ChevronUp className={cn("w-5 h-5", section.background_url ? "text-white" : "text-muted-foreground")} />
            ) : (
              <ChevronDown className={cn("w-5 h-5", section.background_url ? "text-white" : "text-muted-foreground")} />
            )}
          </div>
        </div>

        {/* Section Content - Subsections */}
        {isExpanded && (
          <div 
            className="p-4 pt-0 border-t border-border relative overflow-hidden"
            style={section.content_background_url ? {
              backgroundImage: `url(${section.content_background_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            } : undefined}
          >
            {section.content_background_url && (
              <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
            )}
            {isAdmin && (
              <div className="relative z-20 flex justify-end mb-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setShowContentImageDialog(true)}
                >
                  <ImageIcon className="w-3 h-3 mr-1" />
                  İçerik Arka Planı
                </Button>
              </div>
            )}
            <div className="relative z-10">
              {children}
            </div>
          </div>
        )}
      </div>

      {/* Header Background Image Dialog */}
      <Dialog open={showHeaderImageDialog} onOpenChange={setShowHeaderImageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Başlık Arka Planı</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <input
              ref={headerFileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'header')}
              className="hidden"
            />
            <Button
              onClick={() => headerFileInputRef.current?.click()}
              disabled={uploading}
              className="w-full"
            >
              {uploading ? "Yükleniyor..." : "Fotoğraf Yükle"}
            </Button>
            {section.background_url && (
              <Button
                variant="destructive"
                onClick={() => handleRemoveBackground('header')}
                disabled={uploading}
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Arka Planı Kaldır
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Content Background Image Dialog */}
      <Dialog open={showContentImageDialog} onOpenChange={setShowContentImageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>İçerik Arka Planı</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <input
              ref={contentFileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'content')}
              className="hidden"
            />
            <Button
              onClick={() => contentFileInputRef.current?.click()}
              disabled={uploading}
              className="w-full"
            >
              {uploading ? "Yükleniyor..." : "Fotoğraf Yükle"}
            </Button>
            {section.content_background_url && (
              <Button
                variant="destructive"
                onClick={() => handleRemoveBackground('content')}
                disabled={uploading}
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Arka Planı Kaldır
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};