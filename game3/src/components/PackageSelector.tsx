import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Package {
  id: string;
  name: string;
}

interface PackageSelectorProps {
  unlockedPackages: Package[];
  selectedPackage: string;
  onSelect: (packageId: string) => void;
  isAdmin?: boolean;
}

export const PackageSelector = ({ 
  unlockedPackages, 
  selectedPackage, 
  onSelect,
  isAdmin = false
}: PackageSelectorProps) => {
  // Admin için dropdown seçici
  if (isAdmin) {
    return (
      <Select value={selectedPackage} onValueChange={onSelect}>
        <SelectTrigger className="w-[180px] bg-background">
          <SelectValue placeholder="Paket seçin" />
        </SelectTrigger>
        <SelectContent className="bg-background z-50">
          <SelectItem value="all">Tümü</SelectItem>
          {unlockedPackages.map((pkg) => (
            <SelectItem key={pkg.id} value={pkg.id}>
              {pkg.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Normal kullanıcılar için buton seçici (sadece Tümü seçili göster)
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      <Button
        variant="default"
        size="sm"
        onClick={() => onSelect("all")}
      >
        Tümü ({unlockedPackages.length} paket)
      </Button>
    </div>
  );
};