import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface VocabularyBoxProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  multiline?: boolean;
  className?: string;
}

export const VocabularyBox = ({
  label,
  value,
  onChange,
  placeholder,
  readOnly = false,
  multiline = false,
  className,
}: VocabularyBoxProps) => {
  return (
    <Card className={cn("p-4 space-y-2", className)}>
      <Label className="text-sm font-semibold text-muted-foreground">{label}</Label>
      {multiline ? (
        <Textarea
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          className="min-h-[80px] resize-none"
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
        />
      )}
    </Card>
  );
};
