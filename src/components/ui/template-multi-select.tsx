import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ChevronDown, X, FileText } from "lucide-react";
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

const CATEGORY_COLORS: Record<string, string> = {
  general: "bg-slate-100 text-slate-700 border-slate-200",
  focused_template: "bg-blue-50 text-blue-700 border-blue-200",
  followup_template: "bg-amber-50 text-amber-700 border-amber-200",
};

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
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q
      ? templates.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            (t.sector || "").toLowerCase().includes(q) ||
            (t.category || "").toLowerCase().includes(q)
        )
      : templates;
  }, [templates, search]);

  // Group by sector
  const grouped = useMemo(() => {
    return filtered.reduce((acc, t) => {
      const key = t.sector || "General";
      if (!acc[key]) acc[key] = [];
      acc[key].push(t);
      return acc;
    }, {} as Record<string, FollowupTemplate[]>);
  }, [filtered]);

  const selectedTemplates = templates.filter((t) => selectedIds.includes(t.id));

  const triggerHeight = size === "sm" ? "h-8 text-xs" : "h-10 text-sm";

  return (
    <div className={cn("w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className={cn(
              "w-full justify-between font-normal",
              triggerHeight,
              selectedIds.length > 0 && "border-primary/40 bg-primary/5"
            )}
          >
            <span className="truncate text-left">
              {selectedIds.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : selectedIds.length === 1 ? (
                selectedTemplates[0]?.name
              ) : (
                <span className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-medium">
                    {selectedIds.length}
                  </Badge>
                  <span className="text-muted-foreground">templates selected</span>
                </span>
              )}
            </span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-50 ml-2 transition-transform", open && "rotate-180")} />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="p-0 shadow-lg border border-border/60"
          style={{ width: "var(--radix-popover-trigger-width)", minWidth: 280 }}
          align="start"
          sideOffset={4}
        >
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
              placeholder="Search templates…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* List */}
          <div
            className="overflow-y-auto"
            style={{ maxHeight: 240, overscrollBehavior: "contain" }}
            onWheel={(e) => e.stopPropagation()}
          >
            {Object.keys(grouped).length === 0 ? (
              <div className="py-6 text-center">
                <FileText className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">No templates found</p>
              </div>
            ) : (
              <div className="py-1">
                {Object.entries(grouped).sort().map(([sector, items]) => (
                  <div key={sector}>
                    {/* Sector header */}
                    <div className="px-3 py-1.5 flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {sector}
                      </span>
                      <div className="flex-1 h-px bg-border/60" />
                      <span className="text-[10px] text-muted-foreground">{items.length}</span>
                    </div>
                    {items.map((t) => {
                      const isSelected = selectedIds.includes(t.id);
                      const catLabel = t.category ? (TEMPLATE_CATEGORY_LABELS[t.category as TemplateCategory] ?? t.category) : null;
                      const catColor = CATEGORY_COLORS[t.category] ?? CATEGORY_COLORS.general;
                      return (
                        <label
                          key={t.id}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 cursor-pointer select-none transition-colors",
                            isSelected ? "bg-primary/8" : "hover:bg-muted/60"
                          )}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggle(t.id)}
                            className="shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className={cn("text-sm leading-tight truncate font-medium", isSelected && "text-primary")}>
                              {t.name}
                            </p>
                            {catLabel && (
                              <span className={cn("inline-flex items-center mt-0.5 text-[10px] px-1.5 py-0.5 rounded border font-medium", catColor)}>
                                {catLabel}
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {selectedIds.length > 0 && (
            <div className="border-t border-border/60 px-3 py-2 flex items-center justify-between bg-muted/20">
              <p className="text-[11px] text-muted-foreground">
                {selectedIds.length} selected
              </p>
              <button
                type="button"
                className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                onClick={() => onChange([])}
              >
                Clear all
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Selected chips */}
      {selectedTemplates.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedTemplates.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-primary/30 bg-primary/8 text-primary font-medium max-w-[180px]"
            >
              <span className="truncate">{t.name}</span>
              <button
                type="button"
                onClick={() => toggle(t.id)}
                className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {hint && (
        <p className="text-[11px] text-muted-foreground mt-1.5">{hint}</p>
      )}
    </div>
  );
}
