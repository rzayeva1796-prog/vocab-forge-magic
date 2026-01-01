import { Button } from "@/components/ui/button";

interface UnlockedPackage {
  id: string;
  name: string;
  display_order: number;
}

interface PackageSelectorProps {
  packages: UnlockedPackage[];
  selectedPackage: string;
  onSelect: (packageId: string) => void;
  loading?: boolean;
}

export const PackageSelector = ({ 
  packages, 
  selectedPackage, 
  onSelect,
  loading 
}: PackageSelectorProps) => {
  if (loading) {
    return <div className="text-muted-foreground text-sm mb-4">Paketler yükleniyor...</div>;
  }

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <Button
        variant={selectedPackage === "all" ? "default" : "outline"}
        size="sm"
        onClick={() => onSelect("all")}
      >
        Tümü
      </Button>
      
      {packages
        .sort((a, b) => a.display_order - b.display_order)
        .map((pkg) => (
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
};
