import type { El, ItemStyle } from "../core/types";
import { measureTextEl } from "../core/text";
import { store } from "../state/store";
import { actions } from "../state/actions";
import { newElement } from "../state/elements";
import { parseScene } from "../persistence/excalidraw";
import { insertElements, insertImage } from "./insert";
import { pointer } from "./helpers";

/** System clipboard (elements, images, text) and the in-app style clipboard. */

const MIME = "sashimi/clipboard";

const serializeSelection = () => JSON.stringify({ type: MIME, elements: store.selected });

export const copySelection = async (e?: ClipboardEvent) => {
  if (!store.selected.length) return false;
  const text = serializeSelection();
  if (e?.clipboardData) {
    e.clipboardData.setData("text/plain", text);
    e.preventDefault();
  } else {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      store.toast("Clipboard not available");
    }
  }
  return true;
};

const parseClipboardText = (text: string): El[] | null => {
  try {
    const data = JSON.parse(text);
    if (data?.type === MIME && Array.isArray(data.elements)) return data.elements as El[];
    return parseScene(data);
  } catch {
    return null;
  }
};

export const pasteText = (text: string) => {
  const els = parseClipboardText(text);
  if (els) return insertElements(els, pointer.last);
  if (!text.trim()) return;
  const ci = store.state.currentItem;
  const el = measureTextEl(newElement("text", pointer.last[0], pointer.last[1], ci, { text: text.replace(/\r\n/g, "\n") }));
  insertElements([el], pointer.last);
};

export const handlePasteEvent = (e: ClipboardEvent) => {
  const dt = e.clipboardData;
  if (!dt) return;
  e.preventDefault();
  const file = [...dt.files].find((f) => f.type.startsWith("image/"));
  if (file) return void insertImage(file, pointer.last);
  pasteText(dt.getData("text/plain"));
};

/** Paste via async clipboard API (context menu). */
export const pasteFromClipboard = async () => {
  try {
    if (navigator.clipboard.read) {
      const items = await navigator.clipboard.read();
      for (const it of items) {
        const img = it.types.find((t) => t.startsWith("image/"));
        if (img) return void insertImage(await it.getType(img), pointer.last);
      }
    }
    pasteText(await navigator.clipboard.readText());
  } catch {
    store.toast("Use Ctrl+V to paste");
  }
};

// ---- style clipboard ----
let copiedStyle: Partial<Record<string, unknown>> | null = null;
const STYLE_KEYS = [
  "strokeColor",
  "backgroundColor",
  "fillStyle",
  "strokeWidth",
  "strokeStyle",
  "roughness",
  "opacity",
  "roundness",
  "fontFamily",
  "fontSize",
  "textAlign",
  "startArrowhead",
  "endArrowhead",
] as const;

export const copyStyles = () => {
  const el = store.selected[0];
  if (!el) return;
  copiedStyle = {};
  for (const k of STYLE_KEYS) if (el[k] !== undefined) copiedStyle[k] = el[k];
  store.toast("Styles copied");
};
export const pasteStyles = () => {
  if (copiedStyle) actions.setStyles(copiedStyle as Partial<ItemStyle>);
};
