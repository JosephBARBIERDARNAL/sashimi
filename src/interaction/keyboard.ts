import type { Tool } from "../core/types";
import { canHoldText } from "../core/geometry";
import { store } from "../state/store";
import { actions } from "../state/actions";
import { openFile, saveScene } from "../persistence/files";
import { copyStyles, pasteStyles } from "./clipboard";
import { pointer } from "./helpers";
import { finishMulti, getMultiId } from "./linear";
import { cancelInteraction, setTool } from "./pointer";
import { startEditing } from "./textEditing";

/** Global keyboard shortcuts. */

const KEY_TOOLS: Record<string, Tool> = {
  h: "hand",
  v: "selection",
  "1": "selection",
  r: "rectangle",
  "2": "rectangle",
  d: "diamond",
  "3": "diamond",
  o: "ellipse",
  "4": "ellipse",
  a: "arrow",
  "5": "arrow",
  l: "line",
  "6": "line",
  p: "freedraw",
  x: "freedraw",
  "7": "freedraw",
  t: "text",
  "8": "text",
  "9": "image",
  e: "eraser",
  "0": "eraser",
};

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
};

export const onKeyDown = (e: KeyboardEvent) => {
  if (isTyping(e.target)) return;
  const s = store.state;
  const mod = e.ctrlKey || e.metaKey;
  const k = e.key.toLowerCase();

  if (e.key === " " && !e.repeat) {
    pointer.spaceDown = true;
    document.body.classList.add("panning");
    e.preventDefault();
    return;
  }
  if (s.dialog) return;

  if (mod) {
    if (k === "z") {
      e.preventDefault();
      e.shiftKey ? store.redo() : store.undo();
    } else if (k === "y") {
      e.preventDefault();
      store.redo();
    } else if (k === "a") {
      e.preventDefault();
      actions.selectAll();
    } else if (k === "d") {
      e.preventDefault();
      actions.duplicateSelected();
    } else if (k === "g") {
      e.preventDefault();
      e.shiftKey ? actions.ungroup() : actions.group();
    } else if (k === "s") {
      e.preventDefault();
      saveScene(e.shiftKey);
    } else if (k === "o") {
      e.preventDefault();
      openFile();
    } else if (k === "e" && e.shiftKey) {
      e.preventDefault();
      store.setState({ dialog: "export" });
    } else if (k === "l" && e.shiftKey) {
      e.preventDefault();
      actions.toggleLock();
    } else if (e.code === "BracketRight") {
      e.preventDefault();
      actions.zOrder(e.shiftKey ? "front" : "forward");
    } else if (e.code === "BracketLeft") {
      e.preventDefault();
      actions.zOrder(e.shiftKey ? "back" : "backward");
    } else if (e.key === "=" || e.key === "+") {
      e.preventDefault();
      actions.zoomTo(s.zoom * 1.1);
    } else if (e.key === "-") {
      e.preventDefault();
      actions.zoomTo(s.zoom / 1.1);
    } else if (e.key === "0") {
      e.preventDefault();
      actions.zoomTo(1);
    } else if (e.key === "'") {
      e.preventDefault();
      store.setState({ grid: !s.grid });
    } else if (e.altKey && e.code === "KeyC") {
      e.preventDefault();
      copyStyles();
    } else if (e.altKey && e.code === "KeyV") {
      e.preventDefault();
      pasteStyles();
    }
    return;
  }

  if (e.shiftKey && e.altKey && e.code === "KeyD") {
    store.setState({ theme: s.theme === "dark" ? "light" : "dark" });
    return;
  }
  if (e.shiftKey && e.code === "Digit1") return actions.zoomToFit();
  if (e.shiftKey && e.code === "Digit2") return actions.zoomToFit(true);
  if (e.key === "?") return store.setState({ dialog: "help" });

  if (e.key === "Escape") {
    if (getMultiId()) return finishMulti();
    cancelInteraction();
    store.setState({ selectedIds: {}, tool: s.toolLocked ? s.tool : "selection" });
    return;
  }
  if (e.key === "Enter") {
    if (getMultiId()) return finishMulti();
    const sel = store.selected;
    if (sel.length === 1 && (sel[0]!.type === "text" || canHoldText(sel[0]!)) && !sel[0]!.locked) {
      e.preventDefault();
      startEditing(sel[0]!.id);
    }
    return;
  }
  if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    actions.deleteSelected();
    return;
  }
  if (e.key.startsWith("Arrow")) {
    const step = (e.shiftKey ? 10 : 1) * (s.grid ? 20 : 1);
    const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
    const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
    if (Object.keys(s.selectedIds).length) {
      e.preventDefault();
      actions.nudge(dx, dy);
    }
    return;
  }
  if (k === "q") return store.setState({ toolLocked: !s.toolLocked });
  if (e.altKey || e.shiftKey) return;
  const tool = KEY_TOOLS[k];
  if (tool) setTool(tool);
};

export const onKeyUp = (e: KeyboardEvent) => {
  if (e.key === " ") {
    pointer.spaceDown = false;
    document.body.classList.remove("panning");
  }
};
