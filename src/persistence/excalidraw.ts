import { nanoid } from "nanoid";
import type { Arrowhead, El, ElementType, Point } from "../core/types";
import { HAND_FONT } from "../core/fonts";
import { fitContainerToText, measureTextEl } from "../core/text";
import { syncBindings } from "../state/bindings";

/** Parsing of .sashimi files and import of .excalidraw files. */
export const parseScene = (data: unknown): El[] | null => {
  const d = data as { type?: string; elements?: unknown[]; files?: Record<string, { dataURL: string }> };
  if (!d || !Array.isArray(d.elements)) return null;
  if (d.type === "sashimi") return d.elements as El[];
  if (d.type === "excalidraw" || d.type === "excalidraw/clipboard") return fromExcalidraw(d.elements as XEl[], d.files ?? {});
  return null;
};

interface XEl {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle?: number;
  strokeColor?: string;
  backgroundColor?: string;
  fillStyle?: string;
  strokeWidth?: number;
  strokeStyle?: string;
  roughness?: number;
  opacity?: number;
  roundness?: unknown;
  seed?: number;
  groupIds?: string[];
  locked?: boolean;
  isDeleted?: boolean;
  points?: Point[];
  startArrowhead?: string | null;
  endArrowhead?: string | null;
  startBinding?: { elementId: string } | null;
  endBinding?: { elementId: string } | null;
  text?: string;
  originalText?: string;
  fontSize?: number;
  fontFamily?: number;
  textAlign?: string;
  containerId?: string | null;
  fileId?: string;
}

const X_FONTS: Record<number, string> = {
  1: HAND_FONT,
  5: HAND_FONT,
  2: "Helvetica",
  9: "Helvetica",
  3: "ui-monospace",
  8: "ui-monospace",
  6: "Nunito",
  7: "Lilita One",
};

const xHead = (h: string | null | undefined): Arrowhead => {
  if (!h) return "none";
  if (h === "circle") return "dot";
  if (["arrow", "triangle", "triangle_outline", "bar", "dot", "circle_outline"].includes(h)) return h as Arrowhead;
  if (h.startsWith("diamond")) return "triangle";
  return "arrow";
};

const fromExcalidraw = (xs: XEl[], files: Record<string, { dataURL: string }>): El[] => {
  const live = xs.filter((x) => !x.isDeleted);
  const containers = new Map<string, XEl>();
  for (const x of live) if (x.containerId) containers.set(x.containerId, x);
  const out: El[] = [];
  for (const x of live) {
    const type = (x.type === "frame" || x.type === "magicframe" ? "rectangle" : x.type) as ElementType;
    if (!["rectangle", "diamond", "ellipse", "arrow", "line", "freedraw", "text", "image"].includes(type)) continue;
    const label = containers.get(x.id);
    if (x.containerId && live.some((c) => c.id === x.containerId && ["rectangle", "diamond", "ellipse"].includes(c.type))) continue;
    let el: El = {
      id: x.id || nanoid(),
      type,
      x: x.x,
      y: x.y,
      width: x.width,
      height: x.height,
      angle: x.angle ?? 0,
      strokeColor: x.strokeColor ?? "#1e1e1e",
      backgroundColor: x.backgroundColor ?? "transparent",
      fillStyle: (x.fillStyle as El["fillStyle"]) ?? "solid",
      strokeWidth: x.strokeWidth ?? 2,
      strokeStyle: (x.strokeStyle as El["strokeStyle"]) ?? "solid",
      roughness: x.roughness ?? 1,
      opacity: x.opacity ?? 100,
      roundness: !!x.roundness,
      seed: x.seed ?? Math.floor(Math.random() * 2 ** 31),
      groupIds: x.groupIds ?? [],
      locked: !!x.locked,
    };
    if (type === "arrow" || type === "line" || type === "freedraw") {
      const pts = x.points ?? [[0, 0]];
      const minX = Math.min(...pts.map((p) => p[0])),
        minY = Math.min(...pts.map((p) => p[1]));
      const maxX = Math.max(...pts.map((p) => p[0])),
        maxY = Math.max(...pts.map((p) => p[1]));
      el.points = pts.map(([px, py]) => [px - minX, py - minY] as Point);
      el.x = x.x + minX;
      el.y = x.y + minY;
      el.width = maxX - minX;
      el.height = maxY - minY;
    }
    if (type === "arrow") {
      el.startArrowhead = xHead(x.startArrowhead);
      el.endArrowhead = xHead(x.endArrowhead);
      el.startBinding = x.startBinding?.elementId ?? null;
      el.endBinding = x.endBinding?.elementId ?? null;
    }
    if (type === "text") {
      el.text = x.originalText ?? x.text ?? "";
      el.fontSize = x.fontSize ?? 20;
      el.fontFamily = X_FONTS[x.fontFamily ?? 1] ?? HAND_FONT;
      el.textAlign = (x.textAlign as El["textAlign"]) ?? "left";
      el = measureTextEl(el);
    }
    if (["rectangle", "diamond", "ellipse"].includes(type)) {
      el.fontFamily = label ? (X_FONTS[label.fontFamily ?? 1] ?? HAND_FONT) : HAND_FONT;
      el.fontSize = label?.fontSize ?? 20;
      el.textAlign = "center";
      if (label) {
        el.text = label.originalText ?? label.text ?? "";
        el.textAlign = (label.textAlign as El["textAlign"]) ?? "center";
        el = fitContainerToText(el);
      }
    }
    if (type === "image") el.src = x.fileId ? files[x.fileId]?.dataURL : undefined;
    out.push(el);
  }
  const ids = new Set(out.map((e) => e.id));
  const cleaned = out.map((e) =>
    e.type === "arrow"
      ? {
          ...e,
          startBinding: e.startBinding && ids.has(e.startBinding) ? e.startBinding : null,
          endBinding: e.endBinding && ids.has(e.endBinding) ? e.endBinding : null,
        }
      : e,
  );
  return syncBindings(cleaned);
};
