import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";

interface Word {
  english: string;
  turkish: string;
  frequency_group: string;
}

interface AllWordsDrawerProps {
  words: Word[];
}

export const AllWordsDrawer = ({ words }: AllWordsDrawerProps) => {
  // Group words by frequency
  const groupedWords = words.reduce((acc, word) => {
    if (!acc[word.frequency_group]) {
      acc[word.frequency_group] = [];
    }
    acc[word.frequency_group].push(word);
    return acc;
  }, {} as Record<string, Word[]>);

  const sortedGroups = Object.keys(groupedWords).sort((a, b) => {
    const numA = parseInt(a.replace("k", "")) || 0;
    const numB = parseInt(b.replace("k", "")) || 0;
    return numA - numB;
  });

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <BookOpen className="w-4 h-4 mr-2" />
          All Words ({words.length})
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            All Words ({words.length})
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
          <div className="space-y-6 pr-4">
            {sortedGroups.map((group) => (
              <div key={group} className="space-y-2">
                <div className="flex items-center gap-2 sticky top-0 bg-background py-2">
                  <Badge variant="secondary" className="text-sm">
                    {group}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    ({groupedWords[group].length} words)
                  </span>
                </div>
                <div className="space-y-1">
                  {groupedWords[group].map((word, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between p-2 rounded-md hover:bg-secondary/50 transition-colors"
                    >
                      <span className="font-medium">{word.english}</span>
                      <span className="text-muted-foreground">{word.turkish}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
