import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Trash2 } from "lucide-react";

interface Word {
  english: string;
  turkish: string;
  frequency_group: string;
}

interface LearnedWordsDrawerProps {
  words: Word[];
  onRemove: (word: Word) => void;
}

export const LearnedWordsDrawer = ({ words, onRemove }: LearnedWordsDrawerProps) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <GraduationCap className="w-4 h-4 mr-2" />
          Learned ({words.length})
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Learned Words ({words.length})
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
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
      </SheetContent>
    </Sheet>
  );
};
