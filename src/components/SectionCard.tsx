import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Check, X, Star, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SectionCardProps {
  section: {
    id: string;
    name: string;
    display_order: number;
    min_star_rating?: number; // New: minimum star rating of subsections
  };
  isAdmin: boolean;
  isExpanded: boolean;
  isLocked?: boolean;
  onToggle: () => void;
  onUpdateName: (id: string, name: string) => Promise<void>;
  children: React.ReactNode;
}

export const SectionCard = ({
  section,
  isAdmin,
  isExpanded,
  isLocked = false,
  onToggle,
  onUpdateName,
  children,
}: SectionCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(section.name);
  const [saving, setSaving] = useState(false);

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
    <div className={cn(
      "w-full rounded-xl bg-card border border-border overflow-hidden",
      isLocked && !isAdmin && "opacity-60"
    )}>
      {/* Section Header */}
      <div
        className={cn(
          "flex items-center justify-between p-4 cursor-pointer transition-colors",
          "hover:bg-muted/50",
          isLocked && !isAdmin && "cursor-not-allowed"
        )}
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
          <div className="flex items-center gap-2">
            {isLocked && !isAdmin && <Lock className="w-4 h-4 text-muted-foreground" />}
            <h2 className="text-lg font-bold text-foreground">{section.name}</h2>
            {renderStars()}
            {isAdmin && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
              >
                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            )}
          </div>
        )}

        <div className="flex items-center">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Section Content - Subsections */}
      {isExpanded && (
        <div className="p-4 pt-0 border-t border-border">
          {children}
        </div>
      )}
    </div>
  );
};
