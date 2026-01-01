import { useState, useEffect } from 'react';
import { externalSupabase, ExternalPackage } from '@/lib/externalSupabase';
import { Loader2, Package } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PackageSelectorProps {
  onSelectPackage: (pkg: ExternalPackage) => void;
  onBack: () => void;
}

export function PackageSelector({ onSelectPackage, onBack }: PackageSelectorProps) {
  const [packages, setPackages] = useState<ExternalPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    setLoading(true);
    try {
      const { data, error } = await externalSupabase
        .from('learned_words')
        .select('package_name')
        .order('package_name');

      if (error) throw error;

      // Get unique package names and create package objects
      const uniquePackages = [...new Set(data?.map(d => d.package_name) || [])];
      const packageList: ExternalPackage[] = uniquePackages.map((name, index) => ({
        id: name,
        name: name,
        created_at: new Date().toISOString()
      }));

      setPackages(packageList);
    } catch (error) {
      console.error('Error loading packages:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="text-muted-foreground">
          ← Geri
        </button>
        <h2 className="text-xl font-bold text-foreground">Paket Seç</h2>
      </div>

      <p className="text-muted-foreground mb-6">
        Öğrenmek istediğiniz kelime paketini seçin.
      </p>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-3 pr-4">
            {packages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => onSelectPackage(pkg)}
                className="w-full p-4 rounded-xl border-2 border-border bg-card hover:border-primary hover:bg-primary/10 transition-all flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Package className="w-6 h-6 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground">{pkg.name}</p>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
