import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { Bold, Italic, Underline, Strikethrough, List, ListOrdered, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Convert an image File/Blob to a base64 data URI so it survives outside the browser session. */
function fileToDataUri(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Insert an <img> at the current cursor position inside a contentEditable element. */
function insertImageAtCursor(dataUri: string) {
  const img = document.createElement("img");
  img.src = dataUri;
  img.style.maxWidth = "100%";
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(img);
    range.setStartAfter(img);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export interface RichTextEditorRef {
  insertAtCursor: (text: string) => void;
  focus: () => void;
}

const FONT_FAMILIES = [
  { label: "Default", value: "Inter, Arial, sans-serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Georgia", value: "Georgia, 'Times New Roman', serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Courier New", value: "'Courier New', Courier, monospace" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', Helvetica, sans-serif" },
];

const FONT_SIZES = [
  { label: "10px", value: "1" },
  { label: "13px", value: "2" },
  { label: "16px", value: "3" },
  { label: "18px", value: "4" },
  { label: "24px", value: "5" },
  { label: "32px", value: "6" },
  { label: "48px", value: "7" },
];

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  ({ value, onChange, placeholder, className, minHeight = "200px" }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const isInternalChange = useRef(false);

    useEffect(() => {
      const el = editorRef.current;
      if (!el) return;
      // Only sync from outside if content actually differs (avoid cursor reset)
      if (!isInternalChange.current && el.innerHTML !== value) {
        el.innerHTML = value || "";
      }
      isInternalChange.current = false;
    }, [value]);

    const handleInput = useCallback(() => {
      const el = editorRef.current;
      if (!el) return;
      isInternalChange.current = true;
      onChange(el.innerHTML);
    }, [onChange]);

    const exec = useCallback((command: string, val?: string) => {
      editorRef.current?.focus();
      document.execCommand(command, false, val);
      handleInput();
    }, [handleInput]);

    useImperativeHandle(ref, () => ({
      insertAtCursor: (text: string) => {
        const el = editorRef.current;
        if (!el) return;
        el.focus();
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(text));
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        } else {
          el.innerHTML += text;
        }
        handleInput();
      },
      focus: () => editorRef.current?.focus(),
    }), [handleInput]);

    const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLDivElement>) => {
      const items = Array.from(e.clipboardData.items);
      const imageItem = items.find((item) => item.type.startsWith("image/"));
      if (!imageItem) return;
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (!file) return;
      const dataUri = await fileToDataUri(file);
      editorRef.current?.focus();
      insertImageAtCursor(dataUri);
      handleInput();
    }, [handleInput]);

    const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
      if (!files.length) return;
      e.preventDefault();
      const dataUri = await fileToDataUri(files[0]);
      editorRef.current?.focus();
      insertImageAtCursor(dataUri);
      handleInput();
    }, [handleInput]);

    const toolbarBtn = (onClick: () => void, icon: React.ReactNode, title: string, active = false) => (
      <button
        type="button"
        title={title}
        onMouseDown={(e) => { e.preventDefault(); onClick(); }}
        className={cn(
          "h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors",
          active && "bg-muted text-primary"
        )}
      >
        {icon}
      </button>
    );

    return (
      <div className={cn("rounded-md border border-border overflow-hidden", className)}>
        {/* Toolbar */}
        <div className="flex items-center gap-0.5 flex-wrap px-2 py-1 border-b border-border bg-muted/30">
          {/* Font family */}
          <select
            className="h-7 text-xs bg-transparent border border-border rounded px-1 mr-1 cursor-pointer max-w-[130px]"
            defaultValue="Inter, Arial, sans-serif"
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => exec("fontName", e.target.value)}
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                {f.label}
              </option>
            ))}
          </select>

          {/* Font size */}
          <select
            className="h-7 text-xs bg-transparent border border-border rounded px-1 mr-1 cursor-pointer"
            defaultValue="3"
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => exec("fontSize", e.target.value)}
          >
            {FONT_SIZES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <div className="w-px h-5 bg-border mx-0.5" />

          {toolbarBtn(() => exec("bold"), <Bold className="h-3.5 w-3.5" />, "Bold")}
          {toolbarBtn(() => exec("italic"), <Italic className="h-3.5 w-3.5" />, "Italic")}
          {toolbarBtn(() => exec("underline"), <Underline className="h-3.5 w-3.5" />, "Underline")}
          {toolbarBtn(() => exec("strikeThrough"), <Strikethrough className="h-3.5 w-3.5" />, "Strikethrough")}

          <div className="w-px h-5 bg-border mx-0.5" />

          {toolbarBtn(() => exec("insertUnorderedList"), <List className="h-3.5 w-3.5" />, "Bullet List")}
          {toolbarBtn(() => exec("insertOrderedList"), <ListOrdered className="h-3.5 w-3.5" />, "Numbered List")}

          <div className="w-px h-5 bg-border mx-0.5" />

          {toolbarBtn(() => exec("justifyLeft"), <AlignLeft className="h-3.5 w-3.5" />, "Align Left")}
          {toolbarBtn(() => exec("justifyCenter"), <AlignCenter className="h-3.5 w-3.5" />, "Align Center")}
          {toolbarBtn(() => exec("justifyRight"), <AlignRight className="h-3.5 w-3.5" />, "Align Right")}

        </div>

        {/* Editable area */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onPaste={handlePaste}
          onDrop={handleDrop}
          style={{ minHeight }}
          data-placeholder={placeholder}
          className={cn(
            "px-3 py-2 text-sm outline-none leading-relaxed",
            "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none"
          )}
        />
      </div>
    );
  }
);

RichTextEditor.displayName = "RichTextEditor";
export default RichTextEditor;
