import { cn } from "../lib/utils";

interface LetterBlockProps {
  letter: string;
  onClick?: () => void;
  variant?: "answer" | "scrambled" | "falling" | "empty";
  className?: string;
  disabled?: boolean;
  size?: "default" | "small";
}

export const LetterBlock = ({ 
  letter, 
  onClick, 
  variant = "scrambled",
  className,
  disabled = false,
  size = "default"
}: LetterBlockProps) => {
  const baseStyles = "flex items-center justify-center font-bold rounded-xl transition-all duration-200";
  
  const sizeStyles = {
    default: "w-10 h-10 text-base",
    small: "w-8 h-8 text-sm"
  };
  
  const variantStyles = {
    answer: "bg-gradient-to-br from-game-block to-game-block/80 border-2 border-game-border text-foreground",
    scrambled: "bg-gradient-to-br from-primary to-primary/90 border-2 border-primary/50 text-primary-foreground hover:scale-105 hover:shadow-[0_0_20px_hsl(var(--primary)/0.5)] active:scale-95 cursor-pointer",
    falling: "bg-gradient-to-br from-accent to-accent/90 border-2 border-accent/50 text-accent-foreground shadow-lg",
    empty: "bg-game-block/30 border-2 border-dashed border-game-border/50 text-muted-foreground/50"
  };

  const isDisabled = disabled || variant === "empty";

  return (
    <button
      onClick={!isDisabled ? onClick : undefined}
      disabled={isDisabled}
      className={cn(
        baseStyles,
        sizeStyles[size],
        variantStyles[variant],
        isDisabled && "cursor-not-allowed opacity-50",
        !letter && variant !== "empty" && "invisible",
        className
      )}
    >
      {letter ? letter.toUpperCase() : (variant === "empty" ? "" : "")}
    </button>
  );
};