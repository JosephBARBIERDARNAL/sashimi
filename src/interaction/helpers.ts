import type { El, Point } from "../core/types";
import { canHoldText, dist, hitTest, insideLocal, snap, toLocal } from "../core/geometry";
import { GRID_SIZE } from "../core/constants";
import { store } from "../state/store";

/** Shared, mutable pointer info (not part of React state). */
export const pointer = {
  /** Last known pointer position in scene coordinates (used for paste/drop). */
  last: [0, 0] as Point,
  /** Space bar held → temporary hand tool. */
  spaceDown: false,
};

export const toScene = (clientX: number, clientY: number): Point => {
  const s = store.state;
  return [clientX / s.zoom - s.scrollX, clientY / s.zoom - s.scrollY];
};

export const gridSnap = () => (store.state.grid ? GRID_SIZE : null);
export const snapP = (p: Point): Point => [snap(p[0], gridSnap()), snap(p[1], gridSnap())];

/** Topmost element under a scene point. */
export const hitAt = (p: Point): El | null => {
  const tol = 6 / store.state.zoom;
  const els = store.elements;
  for (let i = els.length - 1; i >= 0; i--) if (hitTest(els[i]!, p, tol)) return els[i]!;
  return null;
};

/** Topmost shape that can hold a label and contains the point (even if transparent). */
export const containerAt = (p: Point): El | null => {
  const els = store.elements;
  for (let i = els.length - 1; i >= 0; i--) {
    const el = els[i]!;
    if (el.locked || !canHoldText(el)) continue;
    const [lx, ly] = toLocal(el, p);
    if (insideLocal(el, lx, ly)) return el;
  }
  return null;
};

/** Snap the segment from→to to 15° increments. */
export const angleSnap = (from: Point, to: Point): Point => {
  const a = Math.atan2(to[1] - from[1], to[0] - from[0]);
  const step = Math.PI / 12;
  const sa = Math.round(a / step) * step;
  const d = dist(from, to);
  return [from[0] + d * Math.cos(sa), from[1] + d * Math.sin(sa)];
};

/** Return to the selection tool after drawing, unless the tool is locked. */
export const finishTool = () => {
  if (!store.state.toolLocked) store.setState({ tool: "selection" });
};

/** Replace one element in place (no emit — caller emits). */
export const setEl = (id: string, fn: (e: El) => El) => {
  store.elements = store.elements.map((e) => (e.id === id ? fn(e) : e));
};
