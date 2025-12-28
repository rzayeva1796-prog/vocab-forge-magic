import { Word, StarLevel } from "@/types/word";
import { groupWordsByStars } from "@/utils/wordParser";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface AllWordsModalProps {
  words: Word[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPackage?: string;
  packageName?: string;
}

export function AllWordsModal({ 
  words, 
  open, 
  onOpenChange, 
  selectedPackage,
  packageName 
}: AllWordsModalProps) {
  const groupedWords = groupWordsByStars(words);

  const getGroupTitle = (stars: StarLevel): string => {
    if (stars === 0) return "Yeni Kelimeler";
    return `${stars} Yıldız`;
  };

  // Build modal title based on selected package
  const modalTitle = selectedPackage && selectedPackage !== "all" && packageName
    ? `${packageName} (${words.length} kelime)`
    : `Tüm Kelimeler (${words.length})`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{modalTitle}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {([0, 1, 2, 3, 4, 5] as StarLevel[]).map((starLevel) => {
              const groupWords = groupedWords[starLevel];
              if (groupWords.length === 0) return null;

              return (
                <div key={starLevel} className="space-y-3">
                  <div className="flex items-center gap-2 sticky top-0 bg-background py-2 z-10">
                    <h3 className="text-lg font-semibold">
                      {getGroupTitle(starLevel)}
                    </h3>
                    <span className="text-muted-foreground text-sm">
                      ({groupWords.length})
                    </span>
                    {starLevel > 0 && (
                      <div className="flex gap-1">
                        {[...Array(starLevel)].map((_, i) => (
                          <Star
                            key={i}
                            className="w-4 h-4 fill-warning text-warning"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="grid gap-2">
                    {groupWords.map((word) => (
                      <div
                        key={word.id}
                        className={cn(
                          "p-4 rounded-lg bg-card border",
                          "flex items-center justify-between"
                        )}
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">
                            {word.english}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {word.turkish}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                          {word.level}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
