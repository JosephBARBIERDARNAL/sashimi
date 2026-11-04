import type { El } from "./types";
import { fontStack } from "./fonts";

export const LINE_HEIGHT = 1.25;

let mctx: CanvasRenderingContext2D | null = null;
const ctx = () => (mctx ??= document.createElement("canvas").getContext("2d")!);

export const fontString = (size: number, family?: string) => `${size}px ${fontStack(family)}`;

export const measureLines = (lines: string[], size: number, family?: string) => {
  const c = ctx();
  c.font = fontString(size, family);
  let w = 0;
  for (const l of lines) w = Math.max(w, c.measureText(l).width);
  return { width: Math.ceil(w), height: Math.ceil(lines.length * size * LINE_HEIGHT) };
};

/** Re-measure a standalone text element. */
export const measureTextEl = (el: El): El => {
  const lines = (el.text ?? "").split("\n");
  const { width, height } = measureLines(lines, el.fontSize ?? 20, el.fontFamily);
  return { ...el, width: Math.max(width, 1), height };
};

export const wrapText = (text: string, maxWidth: number, size: number, family?: string): string[] => {
  const c = ctx();
  c.font = fontString(size, family);
  const out: string[] = [];
  for (const para of text.split("\n")) {
    const words = para.split(/(\s+)/);
    let line = "";
    for (const word of words) {
      const candidate = line + word;
      if (c.measureText(candidate).width <= maxWidth || line === "") {
        if (c.measureText(candidate).width > maxWidth && line === "") {
          // break very long words by characters
          let chunk = "";
          for (const ch of word) {
            if (c.measureText(chunk + ch).width > maxWidth && chunk) {
              out.push(chunk);
              chunk = ch;
            } else chunk += ch;
          }
          line = chunk;
        } else line = candidate;
      } else {
        out.push(line.trimEnd());
        line = word.trimStart();
      }
    }
    out.push(line);
  }
  return out;
};

/** Inner text area width of a container shape. */
export const containerTextWidth = (el: El) => {
  const pad = 10;
  if (el.type === "ellipse") return Math.max(10, el.width / Math.SQRT2 - pad * 2);
  if (el.type === "diamond") return Math.max(10, el.width / 2 - pad);
  return Math.max(10, el.width - pad * 2);
};

export const containerTextLines = (el: El) => wrapText(el.text ?? "", containerTextWidth(el), el.fontSize ?? 20, el.fontFamily);

/** Grow container height so its label fits. */
export const fitContainerToText = (el: El): El => {
  if (!el.text) return el;
  const lines = containerTextLines(el);
  const needed = lines.length * (el.fontSize ?? 20) * LINE_HEIGHT;
  const factor = el.type === "rectangle" ? 1 : el.type === "ellipse" ? Math.SQRT2 : 2;
  const minH = needed * factor + 20;
  if (el.height >= minH) return el;
  const dy = minH - el.height;
  return { ...el, height: minH, y: el.y - dy / 2 };
};
