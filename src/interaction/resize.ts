import type { El, Point } from "../core/types";
import { center, isLinear, rotate, toLocal } from "../core/geometry";
import { measureTextEl } from "../core/text";
import type { HandleDir } from "../render/handles";
import { store } from "../state/store";
import { syncBindings } from "../state/bindings";

export interface ResizeState {
  dir: HandleDir;
  orig: El[];
  bounds: [number, number, number, number];
}

/** Resize a single element (rotation-aware) or a multi-selection (proportional). */
export const doResize = (r: ResizeState, p: Point, shift: boolean, alt: boolean) => {
  const dir = r.dir;
  if (r.orig.length === 1) {
    const o = r.orig[0]!;
    if (o.locked) return;
    const lp = toLocal(o, p);
    const w = o.width,
      h = o.height;
    let l = 0,
      t = 0,
      R = w,
      B = h;
    if (dir.includes("w")) l = lp[0];
    if (dir.includes("e")) R = lp[0];
    if (dir.includes("n")) t = lp[1];
    if (dir.includes("s")) B = lp[1];
    const keep = shift || o.type === "text" || o.type === "image";
    if (keep && dir.length === 2 && w > 0 && h > 0) {
      const sx = (R - l) / w,
        sy = (B - t) / h;
      const k = Math.max(Math.abs(sx), Math.abs(sy));
      const nw = k * w * Math.sign(sx || 1),
        nh = k * h * Math.sign(sy || 1);
      if (dir.includes("w")) l = R - nw;
      else R = l + nw;
      if (dir.includes("n")) t = B - nh;
      else B = t + nh;
    } else if (keep && dir.length === 1 && w > 0 && h > 0) {
      if (dir === "e" || dir === "w") {
        const nh = (Math.abs(R - l) / w) * h;
        t = h / 2 - nh / 2;
        B = h / 2 + nh / 2;
      } else {
        const nw = (Math.abs(B - t) / h) * w;
        l = w / 2 - nw / 2;
        R = w / 2 + nw / 2;
      }
    }
    if (alt) {
      if (dir.includes("e")) l = w - R;
      if (dir.includes("w")) R = w - l;
      if (dir.includes("s")) t = h - B;
      if (dir.includes("n")) B = h - t;
    }
    const nw = R - l,
      nh = B - t;
    const oc = center(o);
    const wc = rotate(o.x + (l + R) / 2, o.y + (t + B) / 2, oc[0], oc[1], o.angle);
    let next: El;
    if (o.points && (isLinear(o) || o.type === "freedraw")) {
      const sx = w ? nw / w : 1,
        sy = h ? nh / h : 1;
      const pts = o.points.map(([x, y]) => [x * sx, y * sy] as Point);
      const minX = Math.min(...pts.map((q) => q[0])),
        minY = Math.min(...pts.map((q) => q[1]));
      const norm = pts.map(([x, y]) => [x - minX, y - minY] as Point);
      next = { ...o, points: norm, width: Math.abs(nw), height: Math.abs(nh), x: wc[0] - Math.abs(nw) / 2, y: wc[1] - Math.abs(nh) / 2 };
    } else if (o.type === "text") {
      const k = Math.abs(nh) / (h || 1);
      next = measureTextEl({ ...o, fontSize: Math.max(1, (o.fontSize ?? 20) * k) });
      next = { ...next, x: wc[0] - next.width / 2, y: wc[1] - next.height / 2 };
    } else {
      next = { ...o, width: Math.max(1, Math.abs(nw)), height: Math.max(1, Math.abs(nh)) };
      next.x = wc[0] - next.width / 2;
      next.y = wc[1] - next.height / 2;
    }
    let els = store.elements.map((el) => (el.id === o.id ? next : el));
    els = syncBindings(els, new Set([o.id]));
    store.setElements(els);
    return;
  }
  // multi: proportional scaling from opposite corner
  const [x0, y0, x1, y1] = r.bounds;
  const ax = dir.includes("w") ? x1 : x0;
  const ay = dir.includes("n") ? y1 : y0;
  const bw = x1 - x0 || 1,
    bh = y1 - y0 || 1;
  const sx = Math.abs(p[0] - ax) / bw,
    sy = Math.abs(p[1] - ay) / bh;
  const k = Math.max(0.05, Math.max(sx, sy));
  const map = new Map<string, El>();
  for (const o of r.orig) {
    if (o.locked) continue;
    const oc = center(o);
    const nc: Point = [ax + (oc[0] - ax) * k, ay + (oc[1] - ay) * k];
    let n: El = { ...o, width: o.width * k, height: o.height * k };
    if (o.points) n.points = o.points.map(([x, y]) => [x * k, y * k] as Point);
    if (o.fontSize) n.fontSize = o.fontSize * k;
    n.x = nc[0] - n.width / 2;
    n.y = nc[1] - n.height / 2;
    if (o.type === "text") {
      n = measureTextEl(n);
      n.x = nc[0] - n.width / 2;
      n.y = nc[1] - n.height / 2;
    }
    map.set(o.id, n);
  }
  let els = store.elements.map((el) => map.get(el.id) ?? el);
  els = syncBindings(els, new Set(map.keys()));
  store.setElements(els);
};
