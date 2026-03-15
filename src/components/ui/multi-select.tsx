import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiSelectProps {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  className,
  triggerClassName,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const toggle = (item: string) =>
    onChange(
      value.includes(item) ? value.filter((x) => x !== item) : [...value, item]
    );

  const filtered = search
    ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch(""); }}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("h-8 text-xs justify-between font-normal gap-1", triggerClassName)}
          >
            <span className="truncate text-left flex-1 min-w-0">
              {value.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : value.length === 1 ? (
                value[0]
              ) : (
                `${value.length} selected`
              )}
            </span>
            <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="p-0"
          style={{ width: "var(--radix-popover-trigger-width)", minWidth: 160 }}
          align="start"
          sideOffset={4}
        >
          <div className="px-3 py-2 border-b">
            <input
              className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          <div
            className="overflow-y-auto"
            style={{ maxHeight: 200, overscrollBehavior: "contain" }}
            onWheel={(e) => e.stopPropagation()}
          >
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No options</p>
            ) : (
              filtered.map((opt) => {
                const isSelected = value.includes(opt);
                return (
                  <label
                    key={opt}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 cursor-pointer select-none hover:bg-muted/60 transition-colors text-xs",
                      isSelected && "bg-muted/40"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggle(opt)}
                      className="shrink-0"
                    />
                    <span className="truncate">{opt}</span>
                  </label>
                );
              })
            )}
          </div>

          {value.length > 0 && (
            <div className="border-t px-3 py-1.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{value.length} selected</span>
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
    </div>
  );
}
