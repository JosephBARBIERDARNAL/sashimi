// Colour palettes. A large perceptual (OKLCH) palette is generated at load time.

const toSrgb = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);

const oklchToRgb = (L: number, C: number, hDeg: number): [number, number, number] => {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3,
    m = m_ ** 3,
    s = s_ ** 3;
  return [
    toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
};

const inGamut = ([r, g, b]: [number, number, number]) =>
  r >= -0.0005 && r <= 1.0005 && g >= -0.0005 && g <= 1.0005 && b >= -0.0005 && b <= 1.0005;

const hex2 = (v: number) =>
  Math.round(Math.max(0, Math.min(1, v)) * 255)
    .toString(16)
    .padStart(2, "0");

export const oklch = (L: number, C: number, h: number): string => {
  let lo = 0,
    hi = C;
  let rgb = oklchToRgb(L, C, h);
  if (!inGamut(rgb)) {
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToRgb(L, mid, h))) lo = mid;
      else hi = mid;
    }
    rgb = oklchToRgb(L, lo, h);
  }
  return `#${hex2(rgb[0])}${hex2(rgb[1])}${hex2(rgb[2])}`;
};

export const HUES: { name: string; h: number; c: number }[] = [
  { name: "Red", h: 25, c: 0.22 },
  { name: "Vermilion", h: 38, c: 0.21 },
  { name: "Orange", h: 55, c: 0.19 },
  { name: "Amber", h: 75, c: 0.18 },
  { name: "Yellow", h: 98, c: 0.19 },
  { name: "Lime", h: 125, c: 0.2 },
  { name: "Green", h: 145, c: 0.2 },
  { name: "Emerald", h: 160, c: 0.17 },
  { name: "Teal", h: 180, c: 0.14 },
  { name: "Cyan", h: 205, c: 0.14 },
  { name: "Sky", h: 230, c: 0.16 },
  { name: "Blue", h: 258, c: 0.2 },
  { name: "Indigo", h: 275, c: 0.21 },
  { name: "Violet", h: 292, c: 0.22 },
  { name: "Purple", h: 308, c: 0.22 },
  { name: "Fuchsia", h: 325, c: 0.24 },
  { name: "Pink", h: 350, c: 0.2 },
  { name: "Rose", h: 10, c: 0.21 },
  { name: "Brown", h: 55, c: 0.07 },
  { name: "Olive", h: 110, c: 0.07 },
  { name: "Slate", h: 255, c: 0.03 },
  { name: "Gray", h: 0, c: 0 },
];

export const LIGHTNESS = [0.97, 0.92, 0.85, 0.77, 0.69, 0.61, 0.53, 0.45, 0.37, 0.28, 0.2];

/** rows = hues, columns = lightness steps */
export const PALETTE: { name: string; shades: string[] }[] = HUES.map(({ name, h, c }) => ({
  name,
  shades: LIGHTNESS.map((L) => {
    // taper chroma at the extremes so very light/dark shades stay pleasant
    const taper = 1 - (Math.abs(L - 0.62) / 0.45) ** 2 * 0.75;
    return oklch(L, c * Math.max(0.15, taper), h);
  }),
}));

export const GRAYSCALE = ["#ffffff", "#f8f9fa", "#e9ecef", "#ced4da", "#adb5bd", "#868e96", "#495057", "#343a40", "#1e1e1e", "#000000"];

export const QUICK_STROKE = ["#1e1e1e", "#e03131", "#2f9e44", "#1971c2", "#f08c00"];
export const QUICK_BG = ["transparent", "#ffc9c9", "#b2f2bb", "#a5d8ff", "#ffec99"];
export const QUICK_CANVAS = ["#ffffff", "#f8f9fa", "#f5faff", "#fffce8", "#fdf8f6"];

export const isValidColor = (c: string) => {
  if (c === "transparent") return true;
  const s = new Option().style;
  s.color = c;
  return s.color !== "";
};

export const normalizeHex = (c: string): string => {
  const t = c.trim();
  if (/^[0-9a-f]{3,8}$/i.test(t)) return `#${t}`;
  return t;
};

/** #rrggbb for <input type=color>, best effort. */
export const toHex6 = (c: string): string => {
  if (/^#[0-9a-f]{6}/i.test(c)) return c.slice(0, 7);
  if (/^#[0-9a-f]{3}$/i.test(c)) return `#${[...c.slice(1)].map((x) => x + x).join("")}`;
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return "#000000";
  ctx.fillStyle = c;
  const v = ctx.fillStyle;
  return /^#[0-9a-f]{6}$/i.test(v) ? v : "#000000";
};
