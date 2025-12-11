import { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, Package, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { 
  groupPackagesByMainNumber, 
  parsePackageName,
  SubPackage 
} from "@/lib/subPackages";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface WordPackage {
  id: string;
  name: string;
  word_count: number;
}

interface CollapsiblePackageListProps {
  packages: WordPackage[];
  selectedPackage: string | null;
  selectedSubPackage: string | null;
  onSelectPackage: (packageId: string | null, subPackageId: string | null) => void;
  showAllOption?: boolean;
  totalWords?: number;
}

export const CollapsiblePackageList = ({
  packages,
  selectedPackage,
  selectedSubPackage,
  onSelectPackage,
  showAllOption = true,
  totalWords = 0,
}: CollapsiblePackageListProps) => {
  const [expandedMain, setExpandedMain] = useState<Set<number>>(new Set());
  const [expandedSub, setExpandedSub] = useState<Set<string>>(new Set());
  const [subPackages, setSubPackages] = useState<Record<string, SubPackage[]>>({});

  // Group packages by main number
  const groupedPackages = groupPackagesByMainNumber(packages);
  const sortedMainNumbers = Array.from(groupedPackages.keys()).sort((a, b) => a - b);

  // Load sub-packages when a package is expanded
  const loadSubPackages = async (packageId: string) => {
    // Always load if not already loaded (check for undefined, not just falsy)
    if (subPackages[packageId] !== undefined) return;

    console.log("Loading sub-packages for package:", packageId);
    const { data, error } = await supabase
      .from("sub_packages")
      .select("*")
      .eq("package_id", packageId)
      .order("display_order");

    console.log("Sub-packages loaded:", data?.length, "error:", error);
    // Set empty array if no data to prevent re-fetching
    setSubPackages(prev => ({ ...prev, [packageId]: (data || []) as SubPackage[] }));
  };

  const toggleMain = (mainNum: number) => {
    setExpandedMain(prev => {
      const next = new Set(prev);
      if (next.has(mainNum)) {
        next.delete(mainNum);
      } else {
        next.add(mainNum);
      }
      return next;
    });
  };

  const toggleSub = (packageId: string) => {
    loadSubPackages(packageId);
    setExpandedSub(prev => {
      const next = new Set(prev);
      if (next.has(packageId)) {
        next.delete(packageId);
      } else {
        next.add(packageId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-1">
      {/* All option */}
      {showAllOption && (
        <Button
          variant={selectedPackage === null && selectedSubPackage === null ? "default" : "ghost"}
          size="sm"
          className="w-full justify-start"
          onClick={() => onSelectPackage(null, null)}
        >
          <Package className="w-4 h-4 mr-2" />
          Tümü ({totalWords})
        </Button>
      )}

      {/* Main groups (1, 2, 3...) */}
      {sortedMainNumbers.map(mainNum => {
        const mainPackages = groupedPackages.get(mainNum) || [];
        const isMainExpanded = expandedMain.has(mainNum);
        const totalWordsInMain = mainPackages.reduce((sum, pkg) => sum + pkg.word_count, 0);

        return (
          <Collapsible
            key={mainNum}
            open={isMainExpanded}
            onOpenChange={() => toggleMain(mainNum)}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start font-semibold"
              >
                {isMainExpanded ? (
                  <ChevronDown className="w-4 h-4 mr-2" />
                ) : (
                  <ChevronRight className="w-4 h-4 mr-2" />
                )}
                <span className="flex-1 text-left">{mainNum}</span>
                <Badge variant="secondary" className="ml-2">
                  {totalWordsInMain}
                </Badge>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4 space-y-1">
              {/* Sub groups (1.1, 1.2, 1.3...) */}
              {mainPackages.map(pkg => {
                // Sort sub-packages numerically by name (1.1.1, 1.1.2, ..., 1.1.10)
                const pkgSubPackages = (subPackages[pkg.id] || []).sort((a, b) => {
                  const aParts = a.name.split('.').map(p => parseInt(p) || 0);
                  const bParts = b.name.split('.').map(p => parseInt(p) || 0);
                  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
                    const aVal = aParts[i] || 0;
                    const bVal = bParts[i] || 0;
                    if (aVal !== bVal) return aVal - bVal;
                  }
                  return 0;
                });
                const isSubExpanded = expandedSub.has(pkg.id);
                const hasSubPackages = pkgSubPackages.length > 0 || !subPackages[pkg.id]; // Show chevron if not loaded yet
                const isSelected = selectedPackage === pkg.id && !selectedSubPackage;

                return (
                  <Collapsible
                    key={pkg.id}
                    open={isSubExpanded}
                    onOpenChange={() => toggleSub(pkg.id)}
                  >
                    <div className="flex items-center">
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSub(pkg.id);
                          }}
                        >
                          {isSubExpanded ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <Button
                        variant={isSelected ? "default" : "ghost"}
                        size="sm"
                        className="flex-1 justify-start"
                        onClick={() => onSelectPackage(pkg.id, null)}
                      >
                        <Layers className="w-3 h-3 mr-2" />
                        <span className="flex-1 text-left">{pkg.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {pkg.word_count}
                        </Badge>
                      </Button>
                    </div>
                    <CollapsibleContent className="pl-8 space-y-1">
                      {/* Sub-sub packages (1.1.1, 1.1.2...) */}
                      {pkgSubPackages.length > 0 ? (
                        pkgSubPackages.map(subPkg => {
                          const isSubSelected = selectedSubPackage === subPkg.id;
                          
                          return (
                            <Button
                              key={subPkg.id}
                              variant={isSubSelected ? "default" : "ghost"}
                              size="sm"
                              className="w-full justify-start text-xs"
                              onClick={() => onSelectPackage(pkg.id, subPkg.id)}
                            >
                              <span className="flex-1 text-left">{subPkg.name}</span>
                            </Button>
                          );
                        })
                      ) : (
                        <div className="text-xs text-muted-foreground px-2 py-1">
                          Alt paket yok
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
};
