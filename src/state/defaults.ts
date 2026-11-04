import type { AppState, ItemStyle } from "../core/types";
import { HAND_FONT } from "../core/fonts";

/** Default style for newly created elements. */
export const DEFAULT_ITEM: ItemStyle = {
  strokeColor: "#1e1e1e",
  backgroundColor: "transparent",
  fillStyle: "solid",
  strokeWidth: 2,
  strokeStyle: "solid",
  roughness: 1,
  opacity: 100,
  roundness: true,
  fontFamily: HAND_FONT,
  fontSize: 20,
  textAlign: "left",
  startArrowhead: "none",
  endArrowhead: "arrow",
};

export const initialAppState = (): AppState => ({
  tool: "selection",
  toolLocked: false,
  zoom: 1,
  scrollX: 0,
  scrollY: 0,
  selectedIds: {},
  editingId: null,
  theme: window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  grid: false,
  viewBackgroundColor: "#ffffff",
  currentItem: { ...DEFAULT_ITEM },
  selectionBox: null,
  erasing: {},
  bindHintId: null,
  dialog: null,
  recentColors: [],
  savedColors: [],
  recentFonts: [],
  fileName: "Untitled",
  toast: null,
});

export const PERSISTED_KEYS: (keyof AppState)[] = [
  "theme",
  "grid",
  "viewBackgroundColor",
  "currentItem",
  "zoom",
  "scrollX",
  "scrollY",
  "recentColors",
  "savedColors",
  "recentFonts",
  "fileName",
  "toolLocked",
];
