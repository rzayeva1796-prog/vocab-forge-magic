import { Word } from "@/pages/game4/types/book";
import { StarRating } from "./StarRating";
import { cn } from "@/lib/utils";

interface WordListProps {
  words: Word[];
  starFilter?: number;
}

export function WordList({ words, starFilter }: WordListProps) {
  const filteredWords = starFilter
    ? words.filter((w) => w.stars === starFilter)
    : words;

  if (filteredWords.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Bu grupta kelime yok
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {filteredWords.map((word) => (
        <div
          key={word.id}
          className="flex items-center justify-between p-3 bg-background rounded-lg border border-border/50"
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">{word.english}</p>
            <p className="text-sm text-muted-foreground truncate">{word.turkish}</p>
          </div>
          <StarRating rating={word.stars} size="sm" className="ml-2 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}
