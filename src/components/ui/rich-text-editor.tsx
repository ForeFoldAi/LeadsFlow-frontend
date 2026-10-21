import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useState } from "react";
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
  ImagePlus, Film, FileText, Paperclip, X, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { mediaService } from "@/lib/apis/media.service";
import type { EmailAttachment, MediaKind } from "@/lib/apis/types";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import MediaBlockControls from "./media-block-controls";
import {
  ACCEPT, MEDIA_SELECTOR, caretRangeAtPoint, createMediaBlock, createVideoPoster, kindOf, replaceMedia,
} from "./email-media";

type InsertMode = "body" | "attach" | "both";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  /** Files sent as real email attachments. Enables the "Attach as file" option for documents. */
  attachments?: EmailAttachment[];
  onAttachmentsChange?: (attachments: EmailAttachment[]) => void;
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

function errorMessage(error: unknown): string {
  const msg = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(", ");
  return msg || (error instanceof Error ? error.message : "Upload failed");
}

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  ({ value, onChange, placeholder, className, minHeight = "200px", attachments, onAttachmentsChange }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isInternalChange = useRef(false);
    const savedRange = useRef<Range | null>(null);
    const pendingPick = useRef<{ mode: InsertMode; replace?: HTMLElement }>({ mode: "body" });
    const attachmentsRef = useRef<EmailAttachment[]>(attachments ?? []);
    attachmentsRef.current = attachments ?? [];

    const [selected, setSelected] = useState<HTMLElement | null>(null);
    const [version, setVersion] = useState(0);
    const [uploading, setUploading] = useState(0);

    useEffect(() => {
      const el = editorRef.current;
      if (!el) return;
      // Only sync from outside if content actually differs (avoid cursor reset)
      if (!isInternalChange.current && el.innerHTML !== value) {
        el.innerHTML = value || "";
        setSelected(null);
      }
      isInternalChange.current = false;
    }, [value]);

    const handleInput = useCallback(() => {
      const el = editorRef.current;
      if (!el) return;
      isInternalChange.current = true;
      onChange(el.innerHTML);
      setVersion((v) => v + 1);
    }, [onChange]);

    const saveRange = useCallback(() => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.getRangeAt(0).startContainer)) {
        savedRange.current = sel.getRangeAt(0).cloneRange();
      }
    }, []);

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

    /** Insert a node at the last known caret position (or the end), keeping a line after it to type on. */
    const insertNode = useCallback((node: Node) => {
      const el = editorRef.current!;
      const range = savedRange.current;
      if (range && el.contains(range.startContainer)) {
        range.deleteContents();
        range.insertNode(node);
      } else {
        el.appendChild(node);
      }
      if (node.parentNode === el && !node.nextSibling) {
        const line = document.createElement("div");
        line.appendChild(document.createElement("br"));
        el.appendChild(line);
      }
      const after = document.createRange();
      after.setStartAfter(node);
      after.collapse(true);
      savedRange.current = after;
    }, []);

    const uploadFile = useCallback(async (file: File, mode: InsertMode, replace?: HTMLElement) => {
      const el = editorRef.current;
      if (!el) return;
      const kind = kindOf(file);
      const toBody = mode !== "attach";

      let placeholderEl: HTMLElement | null = null;
      if (toBody && !replace) {
        placeholderEl = document.createElement("span");
        placeholderEl.setAttribute("data-uploading", "");
        placeholderEl.setAttribute("contenteditable", "false");
        placeholderEl.className = "inline-block text-xs text-muted-foreground border border-dashed border-border rounded px-2 py-1 my-1";
        placeholderEl.textContent = `Uploading ${file.name}... 0%`;
        insertNode(placeholderEl);
      }

      setUploading((n) => n + 1);
      try {
        const media = await mediaService.upload(file, (p) => {
          if (placeholderEl) placeholderEl.textContent = `Uploading ${file.name}... ${p}%`;
        });

        let posterUrl: string | undefined;
        if (kind === "video" && toBody) {
          const poster = await createVideoPoster(file);
          if (poster) posterUrl = (await mediaService.upload(poster)).url;
        }

        if (replace) {
          replaceMedia(replace, media, posterUrl);
        } else if (toBody) {
          const width = Math.min(480, el.clientWidth - 24);
          const block = createMediaBlock(media, width, posterUrl);
          if (placeholderEl?.isConnected) placeholderEl.replaceWith(block);
          else insertNode(block);
        }

        if (mode !== "body" && onAttachmentsChange) {
          onAttachmentsChange([
            ...attachmentsRef.current,
            { url: media.url, filename: media.filename, contentType: media.contentType },
          ]);
        }
        handleInput();
      } catch (error) {
        placeholderEl?.remove();
        handleInput();
        toast({ title: `Couldn't upload ${file.name}`, description: errorMessage(error), variant: "destructive" });
      } finally {
        setUploading((n) => n - 1);
      }
    }, [handleInput, insertNode, onAttachmentsChange]);

    const pickFile = useCallback((kind: MediaKind, mode: InsertMode, replace?: HTMLElement) => {
      saveRange();
      pendingPick.current = { mode, replace };
      const input = fileInputRef.current;
      if (!input) return;
      input.accept = ACCEPT[kind];
      input.value = "";
      input.click();
    }, [saveRange]);

    const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const { mode, replace } = pendingPick.current;
      uploadFile(file, mode, replace);
    };

    const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
      const files = Array.from(e.clipboardData.files);
      if (!files.length) return;
      e.preventDefault();
      saveRange();
      files.forEach((f) => uploadFile(f, "body"));
    }, [saveRange, uploadFile]);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      const files = Array.from(e.dataTransfer.files);
      if (!files.length) return;
      e.preventDefault();
      const range = caretRangeAtPoint(e.clientX, e.clientY);
      if (range && editorRef.current?.contains(range.startContainer)) savedRange.current = range;
      files.forEach((f) => uploadFile(f, "body"));
    }, [uploadFile]);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      const block = (e.target as HTMLElement).closest<HTMLElement>(MEDIA_SELECTOR);
      if (block && editorRef.current?.contains(block)) {
        e.preventDefault();
        setSelected(block);
      } else {
        setSelected(null);
      }
    }, []);

    const handleReplace = useCallback((block: HTMLElement) => {
      const kind = (block.dataset.media as MediaKind) || "image";
      pickFile(kind, "body", block);
    }, [pickFile]);

    const deselect = useCallback(() => setSelected(null), []);

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
      <div className={cn("rounded-md border border-border", className)}>
        {/* Toolbar */}
        <div className="flex items-center gap-0.5 flex-wrap px-2 py-1 border-b border-border bg-muted/30 rounded-t-md">
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

          <div className="w-px h-5 bg-border mx-0.5" />

          {toolbarBtn(() => pickFile("image", "body"), <ImagePlus className="h-3.5 w-3.5" />, "Insert image")}
          {toolbarBtn(() => pickFile("video", "body"), <Film className="h-3.5 w-3.5" />, "Insert video")}
          {onAttachmentsChange ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  title="Insert document"
                  onMouseDown={saveRange}
                  className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors"
                >
                  <FileText className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="text-xs">
                <DropdownMenuItem onSelect={() => pickFile("document", "body")}>Show in email body</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => pickFile("document", "attach")}>Attach as file</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => pickFile("document", "both")}>Both</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            toolbarBtn(() => pickFile("document", "body"), <FileText className="h-3.5 w-3.5" />, "Insert document")
          )}

          {uploading > 0 && (
            <span className="ml-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Uploading...
            </span>
          )}
        </div>

        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFilePicked} />

        {/* Editable area */}
        <div ref={containerRef} className="relative">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onPaste={handlePaste}
            onDrop={handleDrop}
            onDragStart={(e) => { if ((e.target as HTMLElement).closest?.(MEDIA_SELECTOR)) e.preventDefault(); }}
            onMouseDown={handleMouseDown}
            onMouseUp={saveRange}
            onKeyUp={saveRange}
            style={{ minHeight }}
            data-placeholder={placeholder}
            className={cn(
              "flow-root px-3 py-2 text-sm outline-none leading-relaxed [&_[data-media]]:cursor-pointer",
              "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none"
            )}
          />
          {selected && selected.isConnected && containerRef.current && editorRef.current && (
            <MediaBlockControls
              block={selected}
              container={containerRef.current}
              editor={editorRef.current}
              version={version}
              onChange={handleInput}
              onDeselect={deselect}
              onReplace={handleReplace}
            />
          )}
        </div>

        {attachments && attachments.length > 0 && (
          <div className="border-t border-border px-3 py-2 space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground">Files attached</p>
            <div className="flex flex-wrap gap-1.5">
              {attachments.map((a) => (
                <span key={a.url} className="flex items-center gap-1 rounded border border-border bg-muted/40 px-2 py-0.5 text-xs">
                  <Paperclip className="h-3 w-3" />
                  <a href={a.url} target="_blank" rel="noreferrer" className="max-w-[200px] truncate hover:underline">{a.filename}</a>
                  {onAttachmentsChange && (
                    <button
                      type="button"
                      title="Remove"
                      className="hover:text-destructive"
                      onClick={() => onAttachmentsChange(attachments.filter((x) => x.url !== a.url))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);

RichTextEditor.displayName = "RichTextEditor";
export default RichTextEditor;
