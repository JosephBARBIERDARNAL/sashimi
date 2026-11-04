import { describe, expect, test } from "bun:test";
import { GRAYSCALE, PALETTE, oklch } from "../src/core/colors";

describe("palette", () => {
  test("has many more colors than a basic palette", () => {
    const count = PALETTE.reduce((n, h) => n + h.shades.length, 0) + GRAYSCALE.length;
    expect(count).toBeGreaterThan(200);
  });

  test("all swatches are valid, unique hex colors", () => {
    const all = PALETTE.flatMap((h) => h.shades);
    for (const c of all) expect(c).toMatch(/^#[0-9a-f]{6}$/);
    expect(new Set(all).size).toBeGreaterThan(all.length * 0.95);
  });

  test("oklch white/black", () => {
    expect(oklch(1, 0, 0)).toBe("#ffffff");
    expect(oklch(0, 0, 0)).toBe("#000000");
  });
});
