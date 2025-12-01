import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface UnknownWord {
  word: string;
  translation: string;
  inDatabase: boolean;
}

interface UnknownWordsBoxProps {
  words: UnknownWord[];
  isVisible: boolean;
  onToggle: () => void;
  onAddWord: (word: string) => void;
}

export const UnknownWordsBox = ({
  words,
  isVisible,
  onToggle,
  onAddWord,
}: UnknownWordsBoxProps) => {
  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        onClick={onToggle}
        className="w-full"
        size="sm"
      >
        {isVisible ? <X className="w-4 h-4 mr-2" /> : "Show Unknown Words"}
      </Button>
      
      {isVisible && (
        <Card className="p-4 space-y-3 animate-in slide-in-from-top duration-300">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Unknown Words from Sentence
          </h3>
          {words.length === 0 ? (
            <p className="text-sm text-muted-foreground">No unknown words found!</p>
          ) : (
            <div className="space-y-2">
              {words.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-md bg-secondary/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.word}</span>
                      <Badge variant={item.inDatabase ? "default" : "destructive"} className="text-xs">
                        {item.inDatabase ? "In DB" : "AI"}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">{item.translation}</span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onAddWord(item.word)}
                    className={cn(
                      "shrink-0",
                      item.inDatabase ? "text-success hover:text-success" : "text-warning hover:text-warning"
                    )}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
