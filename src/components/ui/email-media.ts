import type { MediaKind, UploadedMedia } from "@/lib/apis/types";

/**
 * Media blocks are plain HTML with inline styles + legacy attributes (width, align)
 * because email clients ignore stylesheets, absolute positioning and <video>.
 */

export type MediaAlign = "left" | "center" | "right" | "float-left" | "float-right";

export interface MediaLayout {
  align: MediaAlign;
  width: number;
  padding: number;
  radius: number;
}

export const MEDIA_SELECTOR = "[data-media]";

export const ACCEPT: Record<MediaKind, string> = {
  image: "image/png,image/jpeg,image/gif,image/webp",
  video: "video/mp4,video/webm,video/quicktime",
  document: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv",
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function kindOf(file: File): MediaKind {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "document";
}

function sizableHtml(media: UploadedMedia, posterUrl?: string): string {
  const name = escapeHtml(media.filename);
  const url = escapeHtml(media.url);
  if (media.kind === "image") {
    return `<img data-sizable src="${url}" alt="${name}" style="display:inline-block;height:auto;" />`;
  }
  if (media.kind === "video") {
    const inner = posterUrl
      ? `<img src="${escapeHtml(posterUrl)}" alt="Play video: ${name}" style="display:block;width:100%;height:auto;border:0;" />`
      : `<span style="display:block;background:#101828;color:#ffffff;text-align:center;padding:48px 16px;font-family:Arial,Helvetica,sans-serif;">` +
        `<span style="display:block;font-size:44px;line-height:1;">&#9654;</span>` +
        `<span style="display:block;font-size:14px;margin-top:12px;">Watch video: ${name}</span></span>`;
    return `<a data-sizable href="${url}" target="_blank" rel="noopener" style="display:inline-block;overflow:hidden;text-decoration:none;">${inner}</a>`;
  }
  return (
    `<a data-sizable href="${url}" target="_blank" rel="noopener" style="display:inline-block;box-sizing:border-box;border:1px solid #e4e7ec;padding:10px 14px;text-decoration:none;color:#344054;font-family:Arial,Helvetica,sans-serif;font-size:14px;text-align:left;">` +
    `<span style="font-size:20px;vertical-align:middle;">&#128196;</span> ` +
    `<strong style="vertical-align:middle;">${name}</strong> ` +
    `<span style="color:#667085;font-size:12px;vertical-align:middle;">${formatSize(media.size)}</span></a>`
  );
}

export function createMediaBlock(media: UploadedMedia, defaultWidth: number, posterUrl?: string): HTMLElement {
  const block = document.createElement("div");
  block.setAttribute("data-media", media.kind);
  block.setAttribute("contenteditable", "false");
  block.innerHTML = sizableHtml(media, posterUrl);
  applyLayout(block, {
    align: "center",
    width: media.kind === "document" ? Math.min(360, defaultWidth) : defaultWidth,
    padding: 0,
    radius: media.kind === "document" ? 8 : 0,
  });
  return block;
}

export function getSizable(block: HTMLElement): HTMLElement | null {
  return block.querySelector<HTMLElement>("[data-sizable]");
}

export function readLayout(block: HTMLElement): MediaLayout {
  const sizable = getSizable(block);
  return {
    align: (block.dataset.align as MediaAlign) || "center",
    width: Number(sizable?.getAttribute("width")) || sizable?.offsetWidth || 300,
    padding: Number(block.dataset.padding) || 0,
    radius: Number(block.dataset.radius) || 0,
  };
}

export function applyLayout(block: HTMLElement, patch: Partial<MediaLayout>) {
  const layout = { ...readLayoutSafe(block), ...patch };
  const width = Math.max(40, Math.round(layout.width));
  block.dataset.align = layout.align;
  block.dataset.padding = String(layout.padding);
  block.dataset.radius = String(layout.radius);

  const pad = `padding:${layout.padding}px;`;
  if (layout.align === "float-left") {
    block.setAttribute("style", `float:left;margin:4px 16px 8px 0;${pad}`);
  } else if (layout.align === "float-right") {
    block.setAttribute("style", `float:right;margin:4px 0 8px 16px;${pad}`);
  } else {
    block.setAttribute("style", `text-align:${layout.align};margin:12px 0;clear:both;${pad}`);
  }

  const sizable = getSizable(block);
  if (!sizable) return;
  sizable.setAttribute("width", String(width));
  sizable.style.width = `${width}px`;
  sizable.style.maxWidth = "100%";
  sizable.style.borderRadius = `${layout.radius}px`;
  const img = block.dataset.media === "image" ? sizable : null;
  if (img) {
    if (layout.align === "float-left") img.setAttribute("align", "left");
    else if (layout.align === "float-right") img.setAttribute("align", "right");
    else img.removeAttribute("align");
  }
}

function readLayoutSafe(block: HTMLElement): MediaLayout {
  return block.dataset.align ? readLayout(block) : { align: "center", width: 300, padding: 0, radius: 0 };
}

/** Image blocks can be wrapped in a link; returns the current href or "". */
export function getImageLink(block: HTMLElement): string {
  const img = getSizable(block);
  const parent = img?.parentElement;
  return parent?.tagName === "A" ? parent.getAttribute("href") || "" : "";
}

export function setImageLink(block: HTMLElement, href: string) {
  const img = getSizable(block);
  if (!img) return;
  const parent = img.parentElement!;
  if (parent.tagName === "A") {
    if (href) parent.setAttribute("href", href);
    else parent.replaceWith(img);
  } else if (href) {
    const a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener";
    img.replaceWith(a);
    a.appendChild(img);
  }
}

/** Replace the file behind a block, keeping its layout. */
export function replaceMedia(block: HTMLElement, media: UploadedMedia, posterUrl?: string) {
  const layout = readLayout(block);
  const link = block.dataset.media === "image" ? getImageLink(block) : "";
  block.setAttribute("data-media", media.kind);
  block.innerHTML = sizableHtml(media, posterUrl);
  if (link && media.kind === "image") setImageLink(block, link);
  applyLayout(block, layout);
}

/** Grab a frame from a local video file and draw a play button on it. */
export function createVideoPoster(file: File): Promise<File | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let settled = false;
    const done = (result: File | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(result);
    };
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.onerror = () => done(null);
    video.onloadeddata = () => {
      video.currentTime = Math.min(1, (video.duration || 0) / 2);
    };
    video.onseeked = () => {
      const scale = Math.min(1, 1200 / (video.videoWidth || 1));
      const w = Math.round(video.videoWidth * scale);
      const h = Math.round(video.videoHeight * scale);
      if (!w || !h) return done(null);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return done(null);
      ctx.drawImage(video, 0, 0, w, h);
      const r = Math.max(24, Math.min(w, h) * 0.12);
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(w / 2 - r * 0.35, h / 2 - r * 0.5);
      ctx.lineTo(w / 2 + r * 0.55, h / 2);
      ctx.lineTo(w / 2 - r * 0.35, h / 2 + r * 0.5);
      ctx.closePath();
      ctx.fill();
      canvas.toBlob(
        (blob) => done(blob ? new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-poster.jpg`, { type: "image/jpeg" }) : null),
        "image/jpeg",
        0.85,
      );
    };
    setTimeout(() => done(null), 15000);
    video.src = url;
  });
}

/** Caret range at a viewport point (Chrome/Safari and Firefox APIs). */
export function caretRangeAtPoint(x: number, y: number): Range | null {
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  };
  if (document.caretRangeFromPoint) return document.caretRangeFromPoint(x, y);
  const pos = doc.caretPositionFromPoint?.(x, y);
  if (!pos) return null;
  const range = document.createRange();
  range.setStart(pos.offsetNode, pos.offset);
  range.collapse(true);
  return range;
}
