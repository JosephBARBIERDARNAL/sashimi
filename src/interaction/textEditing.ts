import type { Point } from "../core/types";
import { LINE_HEIGHT, fitContainerToText, measureTextEl } from "../core/text";
import { store } from "../state/store";
import { newElement } from "../state/elements";
import { syncBindings } from "../state/bindings";
import { setEl } from "./helpers";

/** Creating and committing text (standalone text and shape labels). */
export const startEditing = (id: string) => store.setState({ editingId: id, selectedIds: { [id]: true } });

export const commitText = (id: string, text: string) => {
  const el = store.elements.find((e) => e.id === id);
  if (!el) return store.setState({ editingId: null });
  const trimmed = text.replace(/\s+$/, "");
  if (el.type === "text") {
    if (!trimmed.trim()) {
      store.elements = store.elements.filter((e) => e.id !== id);
      store.setState({ editingId: null, selectedIds: {} });
    } else {
      setEl(id, (e) => measureTextEl({ ...e, text: trimmed }));
      store.setState({ editingId: null });
    }
  } else {
    setEl(id, (e) => fitContainerToText({ ...e, text: trimmed.trim() ? trimmed : undefined }));
    store.elements = syncBindings(store.elements, new Set([id]));
    store.setState({ editingId: null });
  }
  store.commit();
};

export const createText = (p: Point) => {
  const ci = store.state.currentItem;
  const el = newElement("text", p[0], p[1] - (ci.fontSize * LINE_HEIGHT) / 2, ci, { text: "" });
  store.elements = [...store.elements, measureTextEl(el)];
  startEditing(el.id);
};
