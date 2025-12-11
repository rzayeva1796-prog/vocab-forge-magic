import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { SubPackage, generateSubPackages } from "@/lib/subPackages";
import { Loader2, Save } from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface SubPackageSelectorProps {
  packageId: string;
  packageName: string;
  selectedSubPackage: string | null;
  onSelect: (subPackageId: string | null) => void;
  onSave?: (subPackageId: string | null) => void;
  savedSubPackage?: string | null;
}

export const SubPackageSelector = ({
  packageId,
  packageName,
  selectedSubPackage,
  onSelect,
  onSave,
  savedSubPackage,
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

  const handleSave = () => {
    if (onSave) {
      onSave(selectedSubPackage);
      toast.success("Alt paket kaydedildi");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
        <Loader2 className="w-3 h-3 animate-spin" />
        Yükleniyor...
      </div>
    );
  }

  if (subPackages.length === 0) {
    return null;
  }

  const selectedSubPkgName = subPackages.find(sp => sp.id === selectedSubPackage)?.name || "Tümü";
  const savedSubPkgName = subPackages.find(sp => sp.id === savedSubPackage)?.name || "Tümü";
  const hasChanges = selectedSubPackage !== savedSubPackage;

  return (
    <div className="flex flex-col gap-1.5 mt-1">
      {/* Package Display */}
      <div className="flex items-center gap-1">
        <div className="flex flex-col gap-0.5 flex-1">
          <Label className="text-[10px] text-muted-foreground">Paket</Label>
          <div className="h-7 px-2 text-xs bg-muted/50 rounded-md flex items-center border border-border/50">
            {packageName}
          </div>
        </div>
      </div>
      
      {/* Sub-package Selector with Save Button */}
      <div className="flex items-end gap-1">
        <div className="flex flex-col gap-0.5 flex-1">
          <Label className="text-[10px] text-muted-foreground">Alt Paket</Label>
          <Select
            value={selectedSubPackage || "all"}
            onValueChange={(value) => onSelect(value === "all" ? null : value)}
          >
            <SelectTrigger className="h-7 text-xs">
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
        </div>
        {onSave && (
          <Button
            variant={hasChanges ? "default" : "outline"}
            size="sm"
            className="h-7 px-2"
            onClick={(e) => {
              e.stopPropagation();
              handleSave();
            }}
          >
            <Save className="w-3 h-3" />
          </Button>
        )}
      </div>
      
      {/* Show saved selection */}
      {savedSubPackage !== undefined && (
        <div className="text-[10px] text-muted-foreground">
          Kayıtlı: {savedSubPkgName}
        </div>
      )}
    </div>
  );
};
