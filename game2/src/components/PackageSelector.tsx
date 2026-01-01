import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

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
  const [isOpen, setIsOpen] = useState(false);

  if (loading) {
    return <div className="text-muted-foreground text-sm mb-4">Paketler yükleniyor...</div>;
  }

  const sortedPackages = packages.sort((a, b) => a.display_order - b.display_order);
  const selectedPkgName = selectedPackage === 'all' 
    ? 'Tümü' 
    : sortedPackages.find(p => p.id === selectedPackage)?.name || 'Paket Seç';

  const handleSelect = (packageId: string) => {
    onSelect(packageId);
    setIsOpen(false);
  };

  return (
    <div className="relative mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full max-w-xs px-4 py-2 text-sm font-medium bg-secondary text-secondary-foreground rounded-lg border border-border hover:bg-secondary/80 transition-colors"
      >
        <span>{selectedPkgName}</span>
        <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute top-full left-0 mt-1 w-full max-w-xs bg-popover border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
            <div
              onClick={() => handleSelect('all')}
              className={`flex items-center justify-between px-4 py-2 text-sm cursor-pointer hover:bg-muted transition-colors ${
                selectedPackage === 'all' ? 'bg-muted' : ''
              }`}
            >
              <span>Tümü</span>
              {selectedPackage === 'all' && <Check className="w-4 h-4 text-primary" />}
            </div>
            
            {sortedPackages.map((pkg) => (
              <div
                key={pkg.id}
                onClick={() => handleSelect(pkg.id)}
                className={`flex items-center justify-between px-4 py-2 text-sm cursor-pointer hover:bg-muted transition-colors ${
                  selectedPackage === pkg.id ? 'bg-muted' : ''
                }`}
              >
                <span>{pkg.name}</span>
                {selectedPackage === pkg.id && <Check className="w-4 h-4 text-primary" />}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};