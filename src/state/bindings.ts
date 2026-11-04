import type { El, Point } from "../core/types";
import { absolutePoints, center, edgePoint, fromAbsolutePoints, getBounds, isBindable } from "../core/geometry";

/** Arrow ↔ shape binding: arrows whose ends are attached to shapes follow them. */
/** Re-route arrows bound to any element in `changed` (or all if omitted). */
export const syncBindings = (els: El[], changed?: Set<string>): El[] => {
  const byId = new Map(els.map((e) => [e.id, e]));
  let out: El[] | null = null;
  els.forEach((el, i) => {
    if (el.type !== "arrow" || (!el.startBinding && !el.endBinding)) return;
    const st = el.startBinding ? byId.get(el.startBinding) : undefined;
    const en = el.endBinding ? byId.get(el.endBinding) : undefined;
    if (changed && !changed.has(el.id) && !(st && changed.has(st.id)) && !(en && changed.has(en.id))) return;
    let next = el;
    if (el.startBinding && !st) next = { ...next, startBinding: null };
    if (el.endBinding && !en) next = { ...next, endBinding: null };
    const abs = absolutePoints(next);
    if (abs.length < 2) return;
    const n = abs.length;
    const gap = 4 + el.strokeWidth;
    if (st) {
      const adj = n > 2 ? abs[1]! : en ? center(en) : abs[n - 1]!;
      abs[0] = edgePoint(st, adj, gap);
    }
    if (en) {
      const adj = n > 2 ? abs[n - 2]! : st ? center(st) : abs[0]!;
      abs[n - 1] = edgePoint(en, adj, gap);
    }
    next = fromAbsolutePoints(next, abs);
    out ??= els.slice();
    out[i] = next;
  });
  return out ?? els;
};

/** Topmost bindable element under point p (excluding ids). */
export const bindableAt = (els: El[], p: Point, exclude: string, zoom: number): El | null => {
  for (let i = els.length - 1; i >= 0; i--) {
    const e = els[i]!;
    if (e.id === exclude || !isBindable(e)) continue;
    const [a, b, c, d] = getBounds(e);
    const m = 8 / zoom;
    if (p[0] >= a - m && p[0] <= c + m && p[1] >= b - m && p[1] <= d + m) return e;
  }
  return null;
};
