import { useState } from "react";
import { Word } from "@/types/word";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface FlashCardProps {
  word: Word;
  style?: React.CSSProperties;
  onSwipe?: (direction: "left" | "right") => void;
  onFlip?: () => void;
  showWord?: boolean;
}

export function FlashCard({ word, style, onSwipe, onFlip, showWord = true }: FlashCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX, y: touch.clientY });
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragStart) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - dragStart.x;
    const deltaY = touch.clientY - dragStart.y;
    setDragOffset({ x: deltaX, y: deltaY });
  };

  const handleTouchEnd = () => {
    if (!dragStart) return;

    const swipeThreshold = 100;
    if (Math.abs(dragOffset.x) > swipeThreshold) {
      const direction = dragOffset.x > 0 ? "right" : "left";
      onSwipe?.(direction);
    }

    setDragStart(null);
    setDragOffset({ x: 0, y: 0 });
    setIsDragging(false);
    setIsFlipped(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragStart({ x: e.clientX, y: e.clientY });
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragStart || !isDragging) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    setDragOffset({ x: deltaX, y: deltaY });
  };

  const handleMouseUp = () => {
    if (!dragStart) return;

    const swipeThreshold = 100;
    if (Math.abs(dragOffset.x) > swipeThreshold) {
      const direction = dragOffset.x > 0 ? "right" : "left";
      onSwipe?.(direction);
    }

    setDragStart(null);
    setDragOffset({ x: 0, y: 0 });
    setIsDragging(false);
    setIsFlipped(false);
  };

  const rotation = dragOffset.x * 0.1;
  const opacity = 1 - Math.abs(dragOffset.x) / 300;

  return (
    <div
      className="absolute inset-4 cursor-grab active:cursor-grabbing touch-none"
      style={{
        ...style,
        transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotation}deg)`,
        opacity,
        transition: isDragging ? "none" : "all 0.3s ease-out",
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className={cn(
          "relative w-full h-full perspective-1000",
          isFlipped && "flipped"
        )}
        style={{
          transformStyle: "preserve-3d",
          transition: "transform 0.6s",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
        onClick={(e) => {
          if (!isDragging && Math.abs(dragOffset.x) < 10) {
            e.stopPropagation();
            if (!isFlipped) {
              onFlip?.();
            }
            setIsFlipped(!isFlipped);
          }
        }}
      >
        {/* Front (English) */}
        <div
          className="absolute inset-0 bg-card rounded-3xl p-8 flex flex-col items-center justify-center backface-hidden"
          style={{
            boxShadow: "var(--shadow-float)",
            backfaceVisibility: "hidden",
          }}
        >
          <div className="flex gap-1 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={cn(
                  "w-5 h-5",
                  word.stars >= star
                    ? "fill-warning text-warning"
                    : "text-muted-foreground"
                )}
              />
            ))}
          </div>
          {showWord ? (
            <>
              <h2 className="text-5xl font-bold text-foreground text-center mb-4">
                {word.english}
              </h2>
              <p className="text-muted-foreground text-sm">Çevirmek için tıkla</p>
            </>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="text-6xl">🤔</div>
              <p className="text-muted-foreground text-center">Dinle ve hatırlamaya çalış</p>
            </div>
          )}
        </div>

        {/* Back (Turkish) */}
        <div
          className="absolute inset-0 bg-primary rounded-3xl p-8 flex flex-col items-center justify-center backface-hidden"
          style={{
            boxShadow: "var(--shadow-float)",
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <h2 className="text-5xl font-bold text-primary-foreground text-center mb-4">
            {word.turkish}
          </h2>
          <p className="text-primary-foreground/70 text-sm">
            Kaydırarak cevapla
          </p>
        </div>
      </div>

      {/* Swipe Indicators */}
      {isDragging && (
        <>
          <div
            className="absolute top-1/2 left-8 -translate-y-1/2 text-success text-2xl font-bold"
            style={{
              opacity: Math.max(0, dragOffset.x / 100),
            }}
          >
            ✓ Biliyorum
          </div>
          <div
            className="absolute top-1/2 right-8 -translate-y-1/2 text-warning text-2xl font-bold"
            style={{
              opacity: Math.max(0, -dragOffset.x / 100),
            }}
          >
            ✗ Bilmiyorum
          </div>
        </>
      )}
    </div>
  );
}
