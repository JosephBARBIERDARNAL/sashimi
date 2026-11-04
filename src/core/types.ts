export type Point = [number, number];

export type Tool = "hand" | "selection" | "rectangle" | "diamond" | "ellipse" | "arrow" | "line" | "freedraw" | "text" | "image" | "eraser";

export type ElementType = "rectangle" | "diamond" | "ellipse" | "arrow" | "line" | "freedraw" | "text" | "image";

export type FillStyle = "hachure" | "cross-hatch" | "solid" | "zigzag" | "dots";
export type StrokeStyle = "solid" | "dashed" | "dotted";
export type Arrowhead = "none" | "arrow" | "triangle" | "triangle_outline" | "bar" | "dot" | "circle_outline";
export type TextAlign = "left" | "center" | "right";

export interface El {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  roughness: number;
  opacity: number;
  roundness: boolean;
  seed: number;
  groupIds: string[];
  locked: boolean;
  // linear + freedraw (relative to x,y; normalised so min is 0)
  points?: Point[];
  startArrowhead?: Arrowhead;
  endArrowhead?: Arrowhead;
  startBinding?: string | null;
  endBinding?: string | null;
  // text (standalone, or label inside a shape)
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  textAlign?: TextAlign;
  // image
  src?: string;
}

export interface ItemStyle {
  strokeColor: string;
  backgroundColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  roughness: number;
  opacity: number;
  roundness: boolean;
  fontFamily: string;
  fontSize: number;
  textAlign: TextAlign;
  startArrowhead: Arrowhead;
  endArrowhead: Arrowhead;
}

export type Theme = "light" | "dark";

export interface AppState {
  tool: Tool;
  toolLocked: boolean;
  zoom: number;
  scrollX: number;
  scrollY: number;
  selectedIds: Record<string, true>;
  editingId: string | null;
  theme: Theme;
  grid: boolean;
  viewBackgroundColor: string;
  currentItem: ItemStyle;
  selectionBox: { x: number; y: number; w: number; h: number } | null;
  erasing: Record<string, true>;
  bindHintId: string | null;
  dialog: null | "help" | "export" | "reset";
  recentColors: string[];
  savedColors: string[];
  recentFonts: string[];
  fileName: string;
  toast: string | null;
}

export interface SceneData {
  type: "sashimi";
  version: 1;
  elements: El[];
  appState?: Partial<AppState>;
}
