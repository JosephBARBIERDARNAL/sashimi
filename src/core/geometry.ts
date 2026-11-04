import type { El, Point } from "./types";

export const rotate = (x: number, y: number, cx: number, cy: number, a: number): Point => {
  if (!a) return [x, y];
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [(x - cx) * c - (y - cy) * s + cx, (x - cx) * s + (y - cy) * c + cy];
};

export const center = (el: El): Point => [el.x + el.width / 2, el.y + el.height / 2];

/** World point -> element local coords (0..width, 0..height, unrotated). */
export const toLocal = (el: El, p: Point): Point => {
  const [cx, cy] = center(el);
  const [rx, ry] = rotate(p[0], p[1], cx, cy, -el.angle);
  return [rx - el.x, ry - el.y];
};

/** Element local coords -> world point. */
export const toWorld = (el: El, lp: Point): Point => {
  const [cx, cy] = center(el);
  return rotate(el.x + lp[0], el.y + lp[1], cx, cy, el.angle);
};

export const dist = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export const distToSegment = (p: Point, a: Point, b: Point) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return dist(p, a);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
};

export const isLinear = (el: El) => el.type === "arrow" || el.type === "line";
export const hasPoints = (el: El) => isLinear(el) || el.type === "freedraw";
export const isBindable = (el: El) =>
  el.type === "rectangle" || el.type === "diamond" || el.type === "ellipse" || el.type === "text" || el.type === "image";
export const canHoldText = (el: El) => el.type === "rectangle" || el.type === "diamond" || el.type === "ellipse";

/** Axis-aligned world bounds (accounts for rotation). */
export const getBounds = (el: El): [number, number, number, number] => {
  const pts: Point[] =
    hasPoints(el) && el.points?.length
      ? el.points.map((p) => toWorld(el, p))
      : (
          [
            [0, 0],
            [el.width, 0],
            [el.width, el.height],
            [0, el.height],
          ] as Point[]
        ).map((p) => toWorld(el, p));
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
};

export const getCommonBounds = (els: El[]): [number, number, number, number] => {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const el of els) {
    const [a, b, c, d] = getBounds(el);
    minX = Math.min(minX, a);
    minY = Math.min(minY, b);
    maxX = Math.max(maxX, c);
    maxY = Math.max(maxY, d);
  }
  return [minX, minY, maxX, maxY];
};

/** Is a local point inside the element's filled area? */
export const insideLocal = (el: El, lx: number, ly: number): boolean => {
  const { width: w, height: h } = el;
  if (el.type === "ellipse") {
    const rx = w / 2,
      ry = h / 2;
    if (rx <= 0 || ry <= 0) return false;
    const nx = (lx - rx) / rx,
      ny = (ly - ry) / ry;
    return nx * nx + ny * ny <= 1;
  }
  if (el.type === "diamond") {
    if (w <= 0 || h <= 0) return false;
    return Math.abs(lx - w / 2) / (w / 2) + Math.abs(ly - h / 2) / (h / 2) <= 1;
  }
  return lx >= 0 && ly >= 0 && lx <= w && ly <= h;
};

const outlineDistance = (el: El, lp: Point): number => {
  const { width: w, height: h } = el;
  if (el.type === "ellipse") {
    // approximate distance to ellipse outline
    const rx = Math.max(w / 2, 0.01),
      ry = Math.max(h / 2, 0.01);
    const dx = lp[0] - rx,
      dy = lp[1] - ry;
    const ang = Math.atan2(dy / ry, dx / rx);
    const ex = rx * Math.cos(ang),
      ey = ry * Math.sin(ang);
    return Math.hypot(dx - ex, dy - ey);
  }
  let poly: Point[];
  if (el.type === "diamond") {
    poly = [
      [w / 2, 0],
      [w, h / 2],
      [w / 2, h],
      [0, h / 2],
    ];
  } else {
    poly = [
      [0, 0],
      [w, 0],
      [w, h],
      [0, h],
    ];
  }
  let d = Infinity;
  for (let i = 0; i < poly.length; i++) d = Math.min(d, distToSegment(lp, poly[i]!, poly[(i + 1) % poly.length]!));
  return d;
};

export const hitTest = (el: El, p: Point, tolerance: number): boolean => {
  const lp = toLocal(el, p);
  const tol = tolerance + el.strokeWidth / 2;
  if (hasPoints(el)) {
    const pts = el.points ?? [];
    if (pts.length === 1) return dist(lp, pts[0]!) <= tol + el.strokeWidth;
    for (let i = 0; i < pts.length - 1; i++) {
      if (distToSegment(lp, pts[i]!, pts[i + 1]!) <= tol + (el.type === "freedraw" ? el.strokeWidth : 0)) return true;
    }
    return false;
  }
  if (el.type === "text" || el.type === "image") {
    return lp[0] >= -tol && lp[1] >= -tol && lp[0] <= el.width + tol && lp[1] <= el.height + tol;
  }
  const filled = el.backgroundColor !== "transparent" || !!el.text;
  if (filled && insideLocal(el, lp[0], lp[1])) return true;
  return outlineDistance(el, lp) <= tol;
};

/** Point on the outline of `target` along the ray from `from` towards target's center. */
export const edgePoint = (target: El, from: Point, gap: number): Point => {
  const c = center(target);
  const lf = toLocal(target, from);
  if (insideLocal(target, lf[0], lf[1])) return from;
  let lo = 0,
    hi = 1; // t along from->center; 0 outside, 1 inside(center)
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const p: Point = [from[0] + (c[0] - from[0]) * mid, from[1] + (c[1] - from[1]) * mid];
    const lp = toLocal(target, p);
    if (insideLocal(target, lp[0], lp[1])) hi = mid;
    else lo = mid;
  }
  const t = lo;
  const total = dist(from, c);
  const back = total > 0 ? gap / total : 0;
  const tt = Math.max(0, t - back);
  return [from[0] + (c[0] - from[0]) * tt, from[1] + (c[1] - from[1]) * tt];
};

/** Normalise points so their min is at 0, keeping world position stable. */
export const normalizePoints = (el: El): El => {
  const pts = el.points ?? [];
  if (!pts.length) return el;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [x, y] of pts) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  const anchorWorld = toWorld(el, pts[0]!);
  const points = pts.map(([x, y]) => [x - minX, y - minY] as Point);
  const next: El = { ...el, points, x: el.x + minX, y: el.y + minY, width: maxX - minX, height: maxY - minY };
  const after = toWorld(next, points[0]!);
  next.x += anchorWorld[0] - after[0];
  next.y += anchorWorld[1] - after[1];
  return next;
};

/** Build a linear element (angle 0) from absolute world points. */
export const fromAbsolutePoints = (el: El, abs: Point[]): El => {
  const minX = Math.min(...abs.map((p) => p[0]));
  const minY = Math.min(...abs.map((p) => p[1]));
  const maxX = Math.max(...abs.map((p) => p[0]));
  const maxY = Math.max(...abs.map((p) => p[1]));
  return {
    ...el,
    angle: 0,
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    points: abs.map(([x, y]) => [x - minX, y - minY] as Point),
  };
};

export const absolutePoints = (el: El): Point[] => (el.points ?? []).map((p) => toWorld(el, p));

export const snap = (v: number, grid: number | null) => (grid ? Math.round(v / grid) * grid : v);
