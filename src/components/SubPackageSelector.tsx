import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { SubPackage, generateSubPackages } from "@/lib/subPackages";
import { Loader2 } from "lucide-react";

interface SubPackageSelectorProps {
  packageId: string;
  packageName: string;
  selectedSubPackage: string | null;
  onSelect: (subPackageId: string | null) => void;
}

export const SubPackageSelector = ({
  packageId,
  packageName,
  selectedSubPackage,
  onSelect,
}: SubPackageSelectorProps) => {
  const [subPackages, setSubPackages] = useState<SubPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrGenerateSubPackages();
  }, [packageId, packageName]);

  const loadOrGenerateSubPackages = async () => {
    setLoading(true);
    try {
      // First try to fetch existing sub-packages
      const { data: existing } = await supabase
        .from("sub_packages")
        .select("*")
        .eq("package_id", packageId)
        .order("display_order");

      if (existing && existing.length > 0) {
        setSubPackages(existing as SubPackage[]);
      } else {
        // Generate sub-packages if none exist
        const generated = await generateSubPackages(packageId, packageName);
        setSubPackages(generated);
      }
    } catch (error) {
      console.error("Error loading sub-packages:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        Yükleniyor...
      </div>
    );
  }

  if (subPackages.length === 0) {
    return null;
  }

  return (
    <Select
      value={selectedSubPackage || "all"}
      onValueChange={(value) => onSelect(value === "all" ? null : value)}
    >
      <SelectTrigger className="h-7 text-xs w-28">
        <SelectValue placeholder="Alt paket" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Tümü</SelectItem>
        {subPackages.map((subPkg) => (
          <SelectItem key={subPkg.id} value={subPkg.id}>
            {subPkg.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
