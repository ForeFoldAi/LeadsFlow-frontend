import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Link2,
  PanelLeft,
  PanelRight,
  RefreshCw,
  Trash2,
  Type,
  Move,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  applyLayout,
  caretRangeAtPoint,
  getImageLink,
  getSizable,
  readLayout,
  setImageLink,
  type MediaAlign,
} from "./email-media";

interface MediaBlockControlsProps {
  block: HTMLElement;
  container: HTMLElement;
  editor: HTMLElement;
  /** Bumped by the editor whenever content changes so the overlay re-measures. */
  version: number;
  onChange: () => void;
  onDeselect: () => void;
  onReplace: (block: HTMLElement) => void;
}

const WIDTH_PRESETS = [25, 50, 75, 100];
const SPACING = [0, 4, 8, 16, 24];

interface Box { top: number; left: number; width: number; height: number }

export default function MediaBlockControls({
  block, container, editor, version, onChange, onDeselect, onReplace,
}: MediaBlockControlsProps) {
  const [box, setBox] = useState<Box | null>(null);
  const [, force] = useState(0);
  const [dropLine, setDropLine] = useState<Box | null>(null);
  const [dragging, setDragging] = useState(false);
  const rerender = useCallback(() => force((n) => n + 1), []);

  const layout = readLayout(block);
  const isImage = block.dataset.media === "image";

  const measure = useCallback(() => {
    const target = getSizable(block) ?? block;
    const r = target.getBoundingClientRect();
    const c = container.getBoundingClientRect();
    setBox({ top: r.top - c.top, left: r.left - c.left, width: r.width, height: r.height });
  }, [block, container]);

  useLayoutEffect(measure, [measure, version]);

  useEffect(() => {
    const ro = new ResizeObserver(measure);
    ro.observe(block);
    ro.observe(editor);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [block, editor, measure]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select")) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        block.remove();
        onChange();
        onDeselect();
      } else if (e.key === "Escape") {
        onDeselect();
      }
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!container.contains(t) && !t.closest("[data-radix-popper-content-wrapper]")) onDeselect();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [block, container, onChange, onDeselect]);

  const update = (patch: Parameters<typeof applyLayout>[1]) => {
    applyLayout(block, patch);
    onChange();
    rerender();
    requestAnimationFrame(measure);
  };

  const maxWidth = () => editor.clientWidth - 24;

  const startResize = (e: React.MouseEvent, side: "left" | "right") => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = layout.width;
    const factor = layout.align === "center" ? 2 : 1;
    const onMove = (ev: MouseEvent) => {
      const dx = (ev.clientX - startX) * (side === "right" ? 1 : -1) * factor;
      applyLayout(block, { width: Math.min(maxWidth(), startWidth + dx) });
      measure();
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      onChange();
      rerender();
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const dropRangeAt = (x: number, y: number): Range | null => {
    const range = caretRangeAtPoint(x, y);
    if (!range || !editor.contains(range.startContainer) || block.contains(range.startContainer)) return null;
    return range;
  };

  const startMove = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    let moving = false;
    const onMove = (ev: MouseEvent) => {
      if (!moving && Math.hypot(ev.clientX - startX, ev.clientY - startY) < 4) return;
      if (!moving) {
        moving = true;
        setDragging(true);
        block.style.opacity = "0.4";
      }
      const range = dropRangeAt(ev.clientX, ev.clientY);
      const rect = range?.getClientRects()[0] ?? (range?.startContainer as Element | undefined)?.getBoundingClientRect?.();
      if (!rect) return setDropLine(null);
      const c = container.getBoundingClientRect();
      setDropLine({ top: rect.top - c.top, left: rect.left - c.left, width: 2, height: rect.height || 18 });
    };
    const onUp = (ev: MouseEvent) => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      block.style.opacity = "";
      setDragging(false);
      setDropLine(null);
      if (!moving) return;
      const range = dropRangeAt(ev.clientX, ev.clientY);
      if (range) {
        range.insertNode(block);
        onChange();
      }
      requestAnimationFrame(measure);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  if (!box) return null;

  const btn = (onClick: () => void, icon: React.ReactNode, title: string, active = false) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
      className={cn("h-7 w-7 flex items-center justify-center rounded hover:bg-muted", active && "bg-muted text-primary")}
    >
      {icon}
    </button>
  );

  const alignBtn = (align: MediaAlign, icon: React.ReactNode, title: string) =>
    btn(() => update({ align }), icon, title, layout.align === align);

  const select = (label: string, value: number, onSelect: (v: number) => void) => (
    <label className="flex items-center gap-1 text-[11px] text-muted-foreground px-1">
      {label}
      <select
        className="h-6 text-[11px] bg-transparent border border-border rounded px-0.5"
        value={value}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => onSelect(Number(e.target.value))}
      >
        {SPACING.map((s) => <option key={s} value={s}>{s}px</option>)}
      </select>
    </label>
  );

  const toolbarAbove = box.top > 80;
  const handle = "absolute h-3 w-3 bg-primary border-2 border-background rounded-sm";

  return (
    <>
      <div
        className={cn("absolute border-2 border-primary cursor-move", dragging && "pointer-events-none")}
        style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
        onMouseDown={startMove}
        title="Drag to move"
      >
        <div className={cn(handle, "-top-1.5 -left-1.5 cursor-nwse-resize")} onMouseDown={(e) => startResize(e, "left")} />
        <div className={cn(handle, "-top-1.5 -right-1.5 cursor-nesw-resize")} onMouseDown={(e) => startResize(e, "right")} />
        <div className={cn(handle, "-bottom-1.5 -left-1.5 cursor-nesw-resize")} onMouseDown={(e) => startResize(e, "left")} />
        <div className={cn(handle, "-bottom-1.5 -right-1.5 cursor-nwse-resize")} onMouseDown={(e) => startResize(e, "right")} />
        <span className="absolute -bottom-6 right-0 text-[10px] bg-primary text-primary-foreground rounded px-1">
          {Math.round(layout.width)}px
        </span>
      </div>

      {dropLine && (
        <div className="absolute bg-primary pointer-events-none" style={dropLine} />
      )}

      {!dragging && (
        <div
          className="absolute z-20 flex flex-wrap items-center gap-0.5 rounded-md border border-border bg-background shadow-md px-1 py-0.5"
          style={{
            left: Math.max(0, Math.min(box.left, container.clientWidth - 420)),
            top: toolbarAbove ? box.top - 8 : box.top + box.height + 28,
            transform: toolbarAbove ? "translateY(-100%)" : undefined,
            maxWidth: container.clientWidth,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <span className="h-7 w-5 flex items-center justify-center text-muted-foreground" title="Drag the frame to move">
            <Move className="h-3.5 w-3.5" />
          </span>
          {alignBtn("left", <AlignLeft className="h-3.5 w-3.5" />, "Align left")}
          {alignBtn("center", <AlignCenter className="h-3.5 w-3.5" />, "Align center")}
          {alignBtn("right", <AlignRight className="h-3.5 w-3.5" />, "Align right")}
          {alignBtn("float-left", <PanelLeft className="h-3.5 w-3.5" />, "Float left (wrap text)")}
          {alignBtn("float-right", <PanelRight className="h-3.5 w-3.5" />, "Float right (wrap text)")}

          <div className="w-px h-5 bg-border mx-0.5" />
          {WIDTH_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              className="h-7 px-1.5 text-[11px] rounded hover:bg-muted"
              onMouseDown={(e) => { e.preventDefault(); update({ width: (maxWidth() * p) / 100 }); }}
            >
              {p}%
            </button>
          ))}

          <div className="w-px h-5 bg-border mx-0.5" />
          {select("Pad", layout.padding, (padding) => update({ padding }))}
          {select("Round", layout.radius, (radius) => update({ radius }))}

          <div className="w-px h-5 bg-border mx-0.5" />
          {isImage && (
            <>
              <TextPopover
                icon={<Link2 className="h-3.5 w-3.5" />}
                title="Link"
                placeholder="https://example.com"
                initial={getImageLink(block)}
                onSave={(v) => { setImageLink(block, v.trim()); onChange(); }}
              />
              <TextPopover
                icon={<Type className="h-3.5 w-3.5" />}
                title="Alt text"
                placeholder="Describe the image"
                initial={getSizable(block)?.getAttribute("alt") || ""}
                onSave={(v) => { getSizable(block)?.setAttribute("alt", v); onChange(); }}
              />
            </>
          )}
          {btn(() => onReplace(block), <RefreshCw className="h-3.5 w-3.5" />, "Replace file")}
          {btn(() => { block.remove(); onChange(); onDeselect(); }, <Trash2 className="h-3.5 w-3.5 text-destructive" />, "Delete")}
        </div>
      )}
    </>
  );
}

function TextPopover({ icon, title, placeholder, initial, onSave }: {
  icon: React.ReactNode;
  title: string;
  placeholder: string;
  initial: string;
  onSave: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setValue(initial); }}>
      <PopoverTrigger asChild>
        <button type="button" title={title} className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted">
          {icon}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2 space-y-2" onOpenAutoFocus={(e) => { e.preventDefault(); inputRef.current?.focus(); }}>
        <p className="text-xs font-medium">{title}</p>
        <Input
          ref={inputRef}
          className="h-8 text-xs"
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSave(value); setOpen(false); } }}
        />
        <div className="flex justify-end">
          <button
            type="button"
            className="h-7 px-2 text-xs rounded bg-primary text-primary-foreground"
            onClick={() => { onSave(value); setOpen(false); }}
          >
            Save
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
