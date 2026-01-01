import { Button } from "@/components/ui/button";

interface Package {
  id: string;
  name: string;
}

interface PackageSelectorProps {
  unlockedPackages: Package[];
  selectedPackage: string;
  onSelect: (packageId: string) => void;
}

export const PackageSelector = ({ 
  unlockedPackages, 
  selectedPackage, 
  onSelect 
}: PackageSelectorProps) => {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      <Button
        variant={selectedPackage === "all" ? "default" : "outline"}
        size="sm"
        onClick={() => onSelect("all")}
      >
        Tümü
      </Button>
      
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
};