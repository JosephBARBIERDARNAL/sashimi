// System font discovery: Local Font Access API (Chromium) with a probing fallback.

declare global {
  interface Window {
    queryLocalFonts?: () => Promise<{ family: string; fullName: string; style: string; postscriptName: string }[]>;
  }
}

export const HAND_FONT = "Caveat";

export const BUILTIN_FONTS: { label: string; family: string }[] = [
  { label: "Hand-drawn", family: HAND_FONT },
  { label: "Sans-serif", family: "system-ui" },
  { label: "Serif", family: "Georgia" },
  { label: "Monospace", family: "ui-monospace" },
];

const GENERIC = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-monospace",
  "ui-serif",
  "ui-sans-serif",
  "ui-rounded",
]);

/** CSS font-family value for a family name, with sensible fallbacks. */
export const fontStack = (family: string | undefined) => {
  const f = family || HAND_FONT;
  const main = GENERIC.has(f) ? f : `"${f.replace(/"/g, '\\"')}"`;
  return `${main}, "Segoe UI Emoji", sans-serif`;
};

export const supportsLocalFontAccess = () => typeof window !== "undefined" && typeof window.queryLocalFonts === "function";

export const localFontPermission = async (): Promise<PermissionState | "unsupported"> => {
  if (!supportsLocalFontAccess()) return "unsupported";
  try {
    const status = await navigator.permissions.query({ name: "local-fonts" as PermissionName });
    return status.state;
  } catch {
    return "prompt";
  }
};

export const queryAllSystemFonts = async (): Promise<string[]> => {
  if (!window.queryLocalFonts) return probeFonts();
  const fonts = await window.queryLocalFonts();
  const families = new Set<string>();
  for (const f of fonts) if (f.family) families.add(f.family);
  return [...families].sort((a, b) => a.localeCompare(b));
};

const CANDIDATES =
  `Academy Engraved LET,American Typewriter,Andale Mono,Apple Chancery,Apple Color Emoji,Apple SD Gothic Neo,AppleGothic,AppleMyungjo,Arial,Arial Black,Arial Hebrew,Arial Narrow,Arial Rounded MT Bold,Arial Unicode MS,Avenir,Avenir Next,Avenir Next Condensed,Bahnschrift,Baskerville,Big Caslon,Bodoni 72,Bodoni 72 Oldstyle,Bodoni 72 Smallcaps,Bodoni Ornaments,Bookman Old Style,Bradley Hand,Brush Script MT,Calibri,Cambria,Cambria Math,Candara,Cantarell,Chalkboard,Chalkboard SE,Chalkduster,Charter,Cochin,Comic Sans MS,Consolas,Constantia,Copperplate,Corbel,Courier,Courier New,DejaVu Sans,DejaVu Sans Mono,DejaVu Serif,Didot,DIN Alternate,DIN Condensed,Droid Sans,Ebrima,Euphemia UCAS,Franklin Gothic Medium,Futura,Gabriola,Gadugi,Garamond,Geneva,Georgia,Gill Sans,Gill Sans MT,Helvetica,Helvetica Neue,Herculanum,Hoefler Text,HoloLens MDL2 Assets,Impact,Ink Free,Iowan Old Style,Javanese Text,Kefa,Kohinoor Devanagari,Lato,Liberation Mono,Liberation Sans,Liberation Serif,Lucida Console,Lucida Grande,Lucida Sans Unicode,Luminari,Malgun Gothic,Marker Felt,Menlo,Microsoft Himalaya,Microsoft JhengHei,Microsoft New Tai Lue,Microsoft PhagsPa,Microsoft Sans Serif,Microsoft Tai Le,Microsoft YaHei,Microsoft Yi Baiti,MingLiU-ExtB,Mongolian Baiti,Monaco,MS Gothic,MV Boli,Myanmar Text,Noteworthy,Noto Sans,Noto Serif,Noto Mono,Noto Color Emoji,Nirmala UI,Open Sans,Optima,Palatino,Palatino Linotype,Papyrus,Party LET,Phosphate,PingFang SC,Plantagenet Cherokee,PT Mono,PT Sans,PT Serif,Roboto,Roboto Mono,Rockwell,Savoye LET,Segoe Print,Segoe Script,Segoe UI,Segoe UI Emoji,Segoe UI Historic,Segoe UI Symbol,SF Mono,SF Pro,SF Pro Display,SF Pro Rounded,SF Pro Text,SignPainter,Silom,SimSun,Sitka,Skia,Snell Roundhand,Source Code Pro,Source Sans Pro,STIX Two Text,Sylfaen,Symbol,Tahoma,Times,Times New Roman,Trattatello,Trebuchet MS,Ubuntu,Ubuntu Mono,Verdana,Webdings,Wingdings,Yu Gothic,Zapfino,Fira Code,Fira Sans,JetBrains Mono,Inter,IBM Plex Sans,IBM Plex Mono,IBM Plex Serif,Cascadia Code,Cascadia Mono,Hack,Iosevka,Montserrat,Poppins,Raleway,Merriweather,Playfair Display,Nunito,Work Sans,Libre Baskerville,Crimson Text,EB Garamond`.split(
    ",",
  );

/** Fallback when Local Font Access is unavailable: detect fonts via glyph metrics. */
export const probeFonts = (): string[] => {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return [];
  const sample = "mmmmmmmmmmlli1WQ@#&wÿ";
  const bases = ["monospace", "serif", "sans-serif"];
  const baseW = bases.map((b) => {
    ctx.font = `72px ${b}`;
    return ctx.measureText(sample).width;
  });
  const found: string[] = [];
  for (const f of CANDIDATES) {
    const ok = bases.some((b, i) => {
      ctx.font = `72px "${f}", ${b}`;
      return ctx.measureText(sample).width !== baseW[i];
    });
    if (ok) found.push(f);
  }
  return found.sort((a, b) => a.localeCompare(b));
};
