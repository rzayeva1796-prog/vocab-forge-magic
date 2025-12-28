import { Button } from "@/components/ui/button";

interface UnlockedPackage {
  id: string;
  name: string;
}

interface PackageSelectorProps {
  unlockedPackages: UnlockedPackage[];
  selectedPackage: string;
  onSelect: (packageId: string) => void;
}

export function PackageSelector({ 
  unlockedPackages, 
  selectedPackage, 
  onSelect 
}: PackageSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {/* Tüm Kelimeler butonu */}
      <Button
        variant={selectedPackage === "all" ? "default" : "outline"}
        size="sm"
        onClick={() => onSelect("all")}
      >
        Tümü
      </Button>
      
      {/* Kilitsiz paketler */}
      {unlockedPackages.map((pkg) => (
        <Button
          key={pkg.id}
          variant={selectedPackage === pkg.id ? "default" : "outline"}
          size="sm"
          onClick={() => onSelect(pkg.id)}
        >
          {pkg.name}
        </Button>
      ))}
    </div>
  );
}
