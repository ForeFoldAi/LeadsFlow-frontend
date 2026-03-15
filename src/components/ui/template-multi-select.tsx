import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ChevronDown, X } from "lucide-react";
import { FollowupTemplate, TEMPLATE_CATEGORY_LABELS, TemplateCategory } from "@/lib/apis";
import { cn } from "@/lib/utils";

interface TemplateMultiSelectProps {
  templates: FollowupTemplate[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  hint?: string;
  className?: string;
  size?: "sm" | "md";
}

export function TemplateMultiSelect({
  templates,
  selectedIds,
  onChange,
  placeholder = "Select templates…",
  hint,
  className,
  size = "md",
}: TemplateMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const toggle = (id: string) =>
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
            return q
      ? templates.filter(
          (t) => {
            const sectors = t.sectors ?? (t.sector ? [t.sector] : []);
            const sectorMatch = sectors.some((s) => s.toLowerCase().includes(q));
            return t.name.toLowerCase().includes(q) || sectorMatch;
          }
        )
      : templates;
  }, [templates, search]);

  const selectedTemplates = templates.filter((t) => selectedIds.includes(t.id));
  const triggerH = size === "sm" ? "h-9 text-xs" : "h-10 text-sm";

  return (
    <div className={cn("w-full", className)}>
      <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch(""); }}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("w-full justify-between font-normal", triggerH)}
          >
            <span className="truncate text-left">
              {selectedIds.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : selectedIds.length === 1 ? (
                selectedTemplates[0]?.name
              ) : (
                `${selectedIds.length} templates selected`
              )}
            </span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 ml-2 text-muted-foreground transition-transform", open && "rotate-180")} />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="p-0"
          style={{ width: "var(--radix-popover-trigger-width)", minWidth: 240 }}
          align="start"
          sideOffset={4}
        >
          {/* Search */}
          <div className="px-3 py-2 border-b">
            <input
              className="w-full text-sm bg-transparent outline-none placeholder:text-muted-foreground"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          {/* List */}
          <div
            className="overflow-y-auto"
            style={{ maxHeight: 220, overscrollBehavior: "contain" }}
            onWheel={(e) => e.stopPropagation()}
          >
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No templates</p>
            ) : (
              filtered.map((t) => {
                const isSelected = selectedIds.includes(t.id);
                const catLabel = t.category
                  ? (TEMPLATE_CATEGORY_LABELS[t.category as TemplateCategory] ?? t.category)
                  : null;
                return (
                  <label
                    key={t.id}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 cursor-pointer select-none hover:bg-muted/60 transition-colors",
                      isSelected && "bg-muted/40"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggle(t.id)}
                      className="shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{t.name}</p>
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        {(() => {
                          const sectorList = t.sectors?.length ? t.sectors : (t.sector ? [t.sector] : []);
                          if (sectorList.length === 0) return null;
                          return (
                            <span className="text-[10px] text-muted-foreground" title={sectorList.join(", ")}>
                              {sectorList.join(", ")}
                            </span>
                          );
                        })()}
                        {catLabel && (
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                            t.category === "general" && "bg-slate-100 text-slate-600",
                            t.category === "focused_template" && "bg-blue-100 text-blue-700",
                            t.category === "followup_template" && "bg-amber-100 text-amber-700",
                            !["general","focused_template","followup_template"].includes(t.category ?? "") && "bg-muted text-muted-foreground"
                          )}>
                            {catLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>

          {/* Footer */}
          {selectedIds.length > 0 && (
            <div className="border-t px-3 py-1.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{selectedIds.length} selected</span>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => onChange([])}
              >
                Clear
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Chips */}
      {selectedTemplates.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selectedTemplates.map((t) => (
            <span
              key={t.id}
              className={cn(
                "inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border max-w-[180px]",
                t.category === "general" && "bg-slate-100 text-slate-700 border-slate-200",
                t.category === "focused_template" && "bg-blue-50 text-blue-700 border-blue-200",
                t.category === "followup_template" && "bg-amber-50 text-amber-700 border-amber-200",
                !["general","focused_template","followup_template"].includes(t.category ?? "") && "bg-muted text-foreground border-border"
              )}
            >
              <span className="truncate">{t.name}</span>
              <button type="button" onClick={() => toggle(t.id)} className="shrink-0 opacity-50 hover:opacity-100">
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
