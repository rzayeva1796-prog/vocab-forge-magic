import { cn } from "@/lib/utils";

interface WordButtonProps {
  word: string;
  state: 'default' | 'selected' | 'correct' | 'wrong';
  onClick: () => void;
  disabled?: boolean;
}

export const WordButton = ({ word, state, onClick, disabled }: WordButtonProps) => {
  return (
    <button
      onPointerDown={(e) => {
        e.preventDefault();
        if (!disabled) onClick();
      }}
      disabled={disabled}
      className={cn(
        "w-full py-4 px-3 rounded-xl font-semibold text-base transition-all duration-100",
        "shadow-md hover:shadow-lg active:scale-95 disabled:cursor-not-allowed",
        "border-2 select-none touch-manipulation",
        state === 'default' && "bg-card text-card-foreground border-border hover:border-primary",
        state === 'selected' && "bg-selected text-selected-foreground border-selected scale-[1.02]",
        state === 'correct' && "bg-success text-success-foreground border-success scale-[1.02] opacity-70",
        state === 'wrong' && "bg-destructive text-destructive-foreground border-destructive animate-shake"
      )}
    >
      {word}
    </button>
  );
};
