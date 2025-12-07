import { Lock, Star, Headphones, BookOpen, Video } from "lucide-react";
import { cn } from "@/lib/utils";

interface PackageCardProps {
  package: {
    id: string;
    name: string;
    word_count: number;
    unlocked: boolean;
    stars_progress: { total: number; with3Stars: number };
  };
  index: number;
}

// Different icons for variety like Duolingo
const packageIcons = [
  Video,
  BookOpen,
  Headphones,
  Star,
  Video,
  BookOpen,
  Headphones,
  Star,
  Video,
  BookOpen,
];

export const PackageCard = ({ package: pkg, index }: PackageCardProps) => {
  const Icon = packageIcons[index % packageIcons.length];
  const progress = pkg.stars_progress.total > 0 
    ? (pkg.stars_progress.with3Stars / pkg.stars_progress.total) * 100 
    : 0;

  // Alternating positions for zigzag layout
  const isLeft = index % 2 === 0;

  return (
    <div 
      className={cn(
        "relative flex items-center gap-4",
        isLeft ? "self-start ml-8" : "self-end mr-8"
      )}
    >
      {/* Connection line to next package */}
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
        disabled={!pkg.unlocked}
        className={cn(
          "relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300",
          pkg.unlocked
            ? "bg-muted hover:bg-muted/80 cursor-pointer shadow-lg hover:scale-105"
            : "bg-muted/50 cursor-not-allowed opacity-60"
        )}
      >
        {pkg.unlocked ? (
          <Icon className="w-8 h-8 text-muted-foreground" />
        ) : (
          <Lock className="w-8 h-8 text-muted-foreground" />
        )}

        {/* Progress ring */}
        {pkg.unlocked && progress > 0 && (
          <svg 
            className="absolute inset-0 -rotate-90 w-20 h-20"
            viewBox="0 0 80 80"
          >
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
        {pkg.unlocked && (
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
        <span className={cn(
          "font-semibold text-sm",
          pkg.unlocked ? "text-foreground" : "text-muted-foreground"
        )}>
          {pkg.name}
        </span>
        <span className="text-xs text-muted-foreground">
          {pkg.word_count} kelime
        </span>
        {pkg.unlocked && (
          <span className="text-xs text-primary">
            {pkg.stars_progress.with3Stars}/{pkg.stars_progress.total} ★
          </span>
        )}
      </div>
    </div>
  );
};
