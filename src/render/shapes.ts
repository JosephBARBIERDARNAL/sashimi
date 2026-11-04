import rough from "roughjs";
import type { Drawable, Options } from "roughjs/bin/core";
import { getStroke } from "perfect-freehand";
import type { Arrowhead, El, Point } from "../core/types";

/** Hand-drawn shape generation (rough.js / perfect-freehand), cached per element. */
const gen = rough.generator();

// ---------- shape generation (cached) ----------

const roughOpts = (el: El): Options => {
  const sw = el.strokeWidth;
  return {
    seed: el.seed,
    roughness: el.roughness,
    bowing: el.roughness ? 1 : 0,
    stroke: el.strokeColor,
    strokeWidth: sw,
    fill: el.backgroundColor === "transparent" ? undefined : el.backgroundColor,
    fillStyle: el.fillStyle,
    fillWeight: sw / 2,
    hachureGap: sw * 4,
    strokeLineDash: el.strokeStyle === "dashed" ? [8, 8 + sw * 2] : el.strokeStyle === "dotted" ? [1.5, 6 + sw * 2] : undefined,
    disableMultiStroke: el.strokeStyle !== "solid" || el.roughness === 0,
    preserveVertices: el.roughness < 2,
  };
};

const roundedRectPath = (w: number, h: number) => {
  const r = Math.min(Math.min(w, h) * 0.25, 32);
  return `M ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h} L ${r} ${h} Q 0 ${h} 0 ${h - r} L 0 ${r} Q 0 0 ${r} 0 Z`;
};

const roundedDiamondPath = (w: number, h: number) => {
  const r = Math.min(w, h) * 0.12;
  const top: Point = [w / 2, 0],
    right: Point = [w, h / 2],
    bottom: Point = [w / 2, h],
    left: Point = [0, h / 2];
  const lerp = (a: Point, b: Point, d: number): Point => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [a[0] + ((b[0] - a[0]) * d) / len, a[1] + ((b[1] - a[1]) * d) / len];
  };
  const v = [top, right, bottom, left];
  let d = "";
  for (let i = 0; i < 4; i++) {
    const cur = v[i]!,
      prev = v[(i + 3) % 4]!,
      next = v[(i + 1) % 4]!;
    const a = lerp(cur, prev, r),
      b = lerp(cur, next, r);
    d += `${i === 0 ? "M" : "L"} ${a[0]} ${a[1]} Q ${cur[0]} ${cur[1]} ${b[0]} ${b[1]} `;
  }
  return `${d}Z`;
};

const arrowheadDrawables = (el: El, head: Arrowhead, tip: Point, from: Point): Drawable[] => {
  if (head === "none") return [];
  const segLen = Math.hypot(tip[0] - from[0], tip[1] - from[1]);
  const size = Math.min(10 + el.strokeWidth * 4, Math.max(segLen * 0.6, 4));
  const a = Math.atan2(tip[1] - from[1], tip[0] - from[0]);
  const spread = head === "arrow" ? 0.45 : 0.4;
  const w1: Point = [tip[0] - size * Math.cos(a - spread), tip[1] - size * Math.sin(a - spread)];
  const w2: Point = [tip[0] - size * Math.cos(a + spread), tip[1] - size * Math.sin(a + spread)];
  const base = { ...roughOpts(el), strokeLineDash: undefined, fill: undefined, disableMultiStroke: true };
  switch (head) {
    case "arrow":
      return [gen.linearPath([w1, tip, w2], base)];
    case "triangle":
      return [gen.polygon([tip, w1, w2], { ...base, fill: el.strokeColor, fillStyle: "solid" })];
    case "triangle_outline":
      return [gen.polygon([tip, w1, w2], base)];
    case "bar": {
      const p = a + Math.PI / 2;
      const h = size * 0.6;
      return [gen.line(tip[0] + h * Math.cos(p), tip[1] + h * Math.sin(p), tip[0] - h * Math.cos(p), tip[1] - h * Math.sin(p), base)];
    }
    case "dot":
      return [gen.circle(tip[0], tip[1], size * 0.7, { ...base, fill: el.strokeColor, fillStyle: "solid" })];
    case "circle_outline":
      return [gen.circle(tip[0], tip[1], size * 0.7, base)];
  }
  return [];
};

const svgPathFromStroke = (pts: number[][]) => {
  if (!pts.length) return "";
  const d = pts.reduce(
    (acc: (string | number)[], [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length]!;
      acc.push(x0!, y0!, (x0! + x1!) / 2, (y0! + y1!) / 2);
      return acc;
    },
    ["M", ...pts[0]!, "Q"],
  );
  d.push("Z");
  return d.join(" ");
};

export const freedrawPath = (el: El) =>
  svgPathFromStroke(
    getStroke(el.points ?? [], {
      size: el.strokeWidth * 4.25,
      thinning: 0.6,
      smoothing: 0.5,
      streamline: 0.5,
      simulatePressure: true,
      last: true,
    }),
  );

interface Cached {
  key: string;
  drawables: Drawable[];
  path?: string;
  path2d?: Path2D;
}
const cache = new Map<string, Cached>();

const shapeKey = (el: El) =>
  JSON.stringify([
    el.type,
    el.width,
    el.height,
    el.points,
    el.strokeColor,
    el.backgroundColor,
    el.fillStyle,
    el.strokeWidth,
    el.strokeStyle,
    el.roughness,
    el.roundness,
    el.seed,
    el.startArrowhead,
    el.endArrowhead,
  ]);

export const getShape = (el: El): Cached => {
  const key = shapeKey(el);
  const hit = cache.get(el.id);
  if (hit && hit.key === key) return hit;
  const o = roughOpts(el);
  const { width: w, height: h } = el;
  let drawables: Drawable[] = [];
  let path: string | undefined;
  switch (el.type) {
    case "rectangle":
      drawables = [el.roundness ? gen.path(roundedRectPath(w, h), o) : gen.rectangle(0, 0, w, h, o)];
      break;
    case "diamond":
      drawables = [
        el.roundness
          ? gen.path(roundedDiamondPath(w, h), o)
          : gen.polygon(
              [
                [w / 2, 0],
                [w, h / 2],
                [w / 2, h],
                [0, h / 2],
              ],
              o,
            ),
      ];
      break;
    case "ellipse":
      drawables = [gen.ellipse(w / 2, h / 2, w, h, o)];
      break;
    case "line":
    case "arrow": {
      const pts = el.points ?? [];
      if (pts.length < 2) break;
      const lo = { ...o, fill: undefined };
      drawables = [el.roundness && pts.length > 2 ? gen.curve(pts, lo) : gen.linearPath(pts, lo)];
      if (el.type === "arrow") {
        drawables.push(...arrowheadDrawables(el, el.endArrowhead ?? "arrow", pts[pts.length - 1]!, pts[pts.length - 2]!));
        drawables.push(...arrowheadDrawables(el, el.startArrowhead ?? "none", pts[0]!, pts[1]!));
      }
      break;
    }
    case "freedraw":
      path = freedrawPath(el);
      break;
  }
  const entry: Cached = { key, drawables, path, path2d: path ? new Path2D(path) : undefined };
  cache.set(el.id, entry);
  return entry;
};
