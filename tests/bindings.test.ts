import { expect, test } from "bun:test";
import type { El } from "../src/core/types";
import { syncBindings } from "../src/state/bindings";

const shape = (id: string, x: number): El => ({
  id,
  type: "rectangle",
  x,
  y: 0,
  width: 100,
  height: 100,
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
});

test("bound arrow follows its target shapes", () => {
  const a = shape("a", 0);
  const b = shape("b", 300);
  const arrow: El = {
    ...shape("arrow", 0),
    type: "arrow",
    x: 50,
    y: 50,
    width: 300,
    height: 0,
    points: [
      [0, 0],
      [300, 0],
    ],
    startBinding: "a",
    endBinding: "b",
  };
  const out = syncBindings([a, b, arrow]);
  const r = out[2]!;
  // start sits just right of shape a (x=100), end just left of shape b (x=300)
  expect(r.x).toBeGreaterThan(100);
  expect(r.x).toBeLessThan(110);
  expect(r.x + r.width).toBeLessThan(300);
  expect(r.x + r.width).toBeGreaterThan(290);

  const moved = syncBindings([a, { ...b, y: 200 }, r], new Set(["b"]));
  expect(moved[2]!.y + moved[2]!.height).toBeGreaterThan(150);
});
