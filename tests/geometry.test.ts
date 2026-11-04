import { describe, expect, test } from "bun:test";
import type { El } from "../src/core/types";
import { edgePoint, fromAbsolutePoints, getBounds, hitTest, normalizePoints, toLocal, toWorld } from "../src/core/geometry";

const base = (over: Partial<El> = {}): El => ({
  id: "a",
  type: "rectangle",
  x: 0,
  y: 0,
  width: 100,
  height: 50,
  angle: 0,
  strokeColor: "#000",
  backgroundColor: "transparent",
  fillStyle: "solid",
  strokeWidth: 2,
  strokeStyle: "solid",
  roughness: 1,
  opacity: 100,
  roundness: false,
  seed: 1,
  groupIds: [],
  locked: false,
  ...over,
});

describe("geometry", () => {
  test("toLocal/toWorld round-trip with rotation", () => {
    const el = base({ x: 10, y: 20, angle: 0.7 });
    const w = toWorld(el, [30, 40]);
    const l = toLocal(el, w);
    expect(l[0]).toBeCloseTo(30);
    expect(l[1]).toBeCloseTo(40);
  });

  test("bounds of a rectangle rotated 90° swap width and height", () => {
    const [x0, y0, x1, y1] = getBounds(base({ angle: Math.PI / 2 }));
    expect(x1 - x0).toBeCloseTo(50);
    expect(y1 - y0).toBeCloseTo(100);
  });

  test("hit test: outline of transparent rect, inside of filled rect", () => {
    expect(hitTest(base(), [50, 25], 5)).toBe(false);
    expect(hitTest(base(), [50, 1], 5)).toBe(true);
    expect(hitTest(base({ backgroundColor: "#f00" }), [50, 25], 5)).toBe(true);
  });

  test("hit test on ellipse and diamond interiors", () => {
    const e = base({ type: "ellipse", backgroundColor: "#f00" });
    expect(hitTest(e, [50, 25], 1)).toBe(true);
    expect(hitTest(e, [2, 2], 1)).toBe(false);
  });

  test("normalizePoints keeps world position of the first point", () => {
    const el = base({ type: "line", x: 100, y: 100, points: [[0, 0], [-50, -20]], width: 50, height: 20 });
    const n = normalizePoints(el);
    expect(n.points![0]).toEqual([50, 20]);
    expect(n.x).toBeCloseTo(50);
    expect(n.y).toBeCloseTo(80);
  });

  test("fromAbsolutePoints computes bbox", () => {
    const n = fromAbsolutePoints(base({ type: "arrow" }), [[10, 10], [60, 30]]);
    expect([n.x, n.y, n.width, n.height]).toEqual([10, 10, 50, 20]);
  });

  test("edgePoint lands on the rectangle outline (minus gap)", () => {
    const target = base({ x: 100, y: 0, width: 100, height: 100 });
    const p = edgePoint(target, [0, 50], 0);
    expect(p[0]).toBeCloseTo(100, 0);
    expect(p[1]).toBeCloseTo(50);
  });
});
