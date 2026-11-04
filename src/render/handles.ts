import type { El, Point } from "../core/types";
import { getCommonBounds, hasPoints, isLinear, rotate, toWorld } from "../core/geometry";

export type HandleDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
export type Handle =
  | { kind: "resize"; dir: HandleDir; p: Point }
  | { kind: "rotate"; p: Point }
  | { kind: "point"; index: number; p: Point }
  | { kind: "midpoint"; index: number; p: Point };

export interface Frame {
  corners: Point[]; // 4 world corners of the selection frame
  handles: Handle[];
  multi: boolean;
}

const boxHandles = (toW: (p: Point) => Point, l: number, t: number, r: number, b: number, zoom: number, cornersOnly: boolean): Handle[] => {
  const mx = (l + r) / 2,
    my = (t + b) / 2;
  const hs: Handle[] = [
    { kind: "resize", dir: "nw", p: toW([l, t]) },
    { kind: "resize", dir: "ne", p: toW([r, t]) },
    { kind: "resize", dir: "se", p: toW([r, b]) },
    { kind: "resize", dir: "sw", p: toW([l, b]) },
  ];
  const wide = (r - l) * zoom > 36,
    tall = (b - t) * zoom > 36;
  if (!cornersOnly) {
    if (wide) hs.push({ kind: "resize", dir: "n", p: toW([mx, t]) }, { kind: "resize", dir: "s", p: toW([mx, b]) });
    if (tall) hs.push({ kind: "resize", dir: "w", p: toW([l, my]) }, { kind: "resize", dir: "e", p: toW([r, my]) });
  }
  hs.push({ kind: "rotate", p: toW([mx, t - 22 / zoom]) });
  return hs;
};

export const getFrame = (selected: El[], zoom: number): Frame | null => {
  const els = selected.filter((e) => !e.locked);
  if (!selected.length) return null;
  const pad = 5 / zoom;
  if (selected.length === 1) {
    const el = selected[0]!;
    const toW = (p: Point) => toWorld(el, p);
    const l = -pad,
      t = -pad,
      r = el.width + pad,
      b = el.height + pad;
    const corners: Point[] = [toW([l, t]), toW([r, t]), toW([r, b]), toW([l, b])];
    if (el.locked) return { corners, handles: [], multi: false };
    const handles: Handle[] = [];
    if (isLinear(el)) {
      const pts = el.points ?? [];
      pts.forEach((p, index) => {
        handles.push({ kind: "point", index, p: toW(p) });
      });
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i]!,
          c = pts[i + 1]!;
        if (Math.hypot(a[0] - c[0], a[1] - c[1]) * zoom > 30)
          handles.push({ kind: "midpoint", index: i, p: toW([(a[0] + c[0]) / 2, (a[1] + c[1]) / 2]) });
      }
      if (pts.length > 2) handles.push(...boxHandles(toW, l, t, r, b, zoom, false));
      return { corners: pts.length > 2 ? corners : [], handles, multi: false };
    }
    const cornersOnly = el.type === "text" || el.type === "image";
    handles.push(...boxHandles(toW, l, t, r, b, zoom, cornersOnly));
    return { corners, handles, multi: false };
  }
  const [minX, minY, maxX, maxY] = getCommonBounds(selected);
  const id = (p: Point) => p;
  const l = minX - pad,
    t = minY - pad,
    r = maxX + pad,
    b = maxY + pad;
  const corners: Point[] = [
    [l, t],
    [r, t],
    [r, b],
    [l, b],
  ];
  return { corners, handles: els.length === selected.length ? boxHandles(id, l, t, r, b, zoom, true) : [], multi: true };
};

export const handleAt = (frame: Frame | null, p: Point, zoom: number): Handle | null => {
  if (!frame) return null;
  const r = 8 / zoom;
  const order = ["point", "rotate", "resize", "midpoint"] as const;
  for (const kind of order) {
    for (const h of frame.handles) {
      if (h.kind === kind && Math.hypot(h.p[0] - p[0], h.p[1] - p[1]) <= r) return h;
    }
  }
  return null;
};

const CURSORS: Record<HandleDir, number> = { e: 0, se: 45, s: 90, sw: 135, w: 180, nw: 225, n: 270, ne: 315 };
export const resizeCursor = (dir: HandleDir, angle: number) => {
  const deg = (((CURSORS[dir] + (angle * 180) / Math.PI) % 180) + 180) % 180;
  if (deg < 22.5 || deg >= 157.5) return "ew-resize";
  if (deg < 67.5) return "nwse-resize";
  if (deg < 112.5) return "ns-resize";
  return "nesw-resize";
};

export { rotate, hasPoints };
