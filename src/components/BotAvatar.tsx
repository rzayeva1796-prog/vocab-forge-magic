import { cn } from "@/lib/utils";

type Props = {
  src: string;
  alt: string;
  size?: number;
  className?: string;
};

export function BotAvatar({ src, alt, size = 40, className }: Props) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      width={size}
      height={size}
      className={cn(
        "rounded-full object-cover border border-border",
        className
      )}
      style={{ width: size, height: size }}
    />
  );
}
