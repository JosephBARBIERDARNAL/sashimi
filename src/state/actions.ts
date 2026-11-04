import { nanoid } from "nanoid";
import type { El, ItemStyle, Point } from "../core/types";
import { getBounds, isLinear } from "../core/geometry";
import { fitContainerToText, measureTextEl } from "../core/text";
import { store } from "./store";
import { randomSeed, remapId, toRecord, updateEls } from "./elements";
import { syncBindings } from "./bindings";
import { MAX_ZOOM, MIN_ZOOM } from "../core/constants";

let previewBase: El[] | null = null;

/** Pure: apply style properties to the selected elements, skipping ones they don't apply to. */
export const applyStyles = (elements: El[], sel: Record<string, true>, patch: Partial<ItemStyle>): El[] => {
  const keys = Object.keys(patch) as (keyof ItemStyle)[];
  const fontChange = keys.includes("fontFamily") || keys.includes("fontSize");
  const els = updateEls(elements, sel, (el) => {
    const n: El = { ...el };
    for (const key of keys) {
      if (key === "backgroundColor" && (isLinear(el) || el.type === "text")) continue;
      if ((key === "startArrowhead" || key === "endArrowhead") && el.type !== "arrow") continue;
      if ((key === "fontFamily" || key === "fontSize" || key === "textAlign") && el.fontSize === undefined) continue;
      (n as unknown as Record<string, unknown>)[key] = patch[key];
    }
    if (fontChange && n.type === "text") return measureTextEl(n);
    if (fontChange && n.text) return fitContainerToText(n);
    return n;
  });
  return fontChange ? syncBindings(els, new Set(Object.keys(sel))) : els;
};

/** User-level commands operating on the store (each one is an undo step). */
export const actions = {
  /** Apply style properties to the selection and remember them for new elements. */
  setStyles(patch: Partial<ItemStyle>) {
    actions.endPreview();
    const s = store.state;
    store.setState({ currentItem: { ...s.currentItem, ...patch } });
    if (!Object.keys(s.selectedIds).length) return;
    store.setElements(applyStyles(store.elements, s.selectedIds, patch));
    store.commit();
  },

  /**
   * Temporarily show a style on the selection (e.g. hovering a font) without
   * creating an undo step. Always computed from the pre-preview elements.
   */
  previewStyles(patch: Partial<ItemStyle>) {
    const sel = store.state.selectedIds;
    if (!Object.keys(sel).length) return;
    previewBase ??= store.elements;
    store.setElements(applyStyles(previewBase, sel, patch));
  },

  /** Drop any preview and restore the elements as they were. */
  endPreview() {
    if (!previewBase) return;
    const base = previewBase;
    previewBase = null;
    store.setElements(base);
  },

  setStyle<K extends keyof ItemStyle>(key: K, value: ItemStyle[K]) {
    actions.setStyles({ [key]: value } as Partial<ItemStyle>);
  },

  nudge(dx: number, dy: number) {
    const sel = store.state.selectedIds;
    if (!Object.keys(sel).length) return;
    let els = updateEls(store.elements, sel, (e) => (e.locked ? e : { ...e, x: e.x + dx, y: e.y + dy }));
    els = syncBindings(els, new Set(Object.keys(sel)));
    store.setElements(els);
    store.commit();
  },

  addRecentColor(c: string) {
    if (c === "transparent") return;
    const r = [c, ...store.state.recentColors.filter((x) => x.toLowerCase() !== c.toLowerCase())].slice(0, 12);
    store.setState({ recentColors: r });
  },
  addRecentFont(f: string) {
    const r = [f, ...store.state.recentFonts.filter((x) => x !== f)].slice(0, 8);
    store.setState({ recentFonts: r });
  },

  deleteSelected() {
    const sel = store.state.selectedIds;
    if (!Object.keys(sel).length) return;
    let els = store.elements.filter((e) => !sel[e.id] || e.locked);
    els = els.map((e) =>
      e.type === "arrow" && ((e.startBinding && sel[e.startBinding]) || (e.endBinding && sel[e.endBinding]))
        ? {
            ...e,
            startBinding: e.startBinding && sel[e.startBinding] ? null : e.startBinding,
            endBinding: e.endBinding && sel[e.endBinding] ? null : e.endBinding,
          }
        : e,
    );
    store.elements = els;
    store.setState({ selectedIds: {}, editingId: null });
    store.commit();
  },

  duplicateSelected(offset = 10) {
    const sel = store.selected;
    if (!sel.length) return;
    const idMap = new Map<string, string>();
    const groupMap = new Map<string, string>();
    const clones = sel.map((e) => {
      const id = nanoid();
      idMap.set(e.id, id);
      return {
        ...e,
        id,
        seed: randomSeed(),
        x: e.x + offset,
        y: e.y + offset,
        locked: false,
        groupIds: e.groupIds.map((g) => remapId(groupMap, g)),
      };
    });
    const fixed = clones.map((c) =>
      c.type === "arrow"
        ? {
            ...c,
            startBinding: c.startBinding ? (idMap.get(c.startBinding) ?? null) : null,
            endBinding: c.endBinding ? (idMap.get(c.endBinding) ?? null) : null,
          }
        : c,
    );
    store.elements = [...store.elements, ...fixed];
    store.setState({ selectedIds: toRecord(fixed.map((c) => c.id)) });
    store.commit();
    return fixed;
  },

  selectAll() {
    store.setState({ selectedIds: toRecord(store.elements.filter((e) => !e.locked).map((e) => e.id)), tool: "selection" });
  },

  zOrder(kind: "front" | "back" | "forward" | "backward") {
    const sel = store.state.selectedIds;
    const els = store.elements.slice();
    if (!Object.keys(sel).length) return;
    let result: El[];
    if (kind === "front") result = [...els.filter((e) => !sel[e.id]), ...els.filter((e) => sel[e.id])];
    else if (kind === "back") result = [...els.filter((e) => sel[e.id]), ...els.filter((e) => !sel[e.id])];
    else if (kind === "forward") {
      for (let i = els.length - 2; i >= 0; i--) {
        if (sel[els[i]!.id] && !sel[els[i + 1]!.id]) [els[i], els[i + 1]] = [els[i + 1]!, els[i]!];
      }
      result = els;
    } else {
      for (let i = 1; i < els.length; i++) {
        if (sel[els[i]!.id] && !sel[els[i - 1]!.id]) [els[i], els[i - 1]] = [els[i - 1]!, els[i]!];
      }
      result = els;
    }
    store.setElements(result);
    store.commit();
  },

  group() {
    const sel = store.state.selectedIds;
    if (Object.keys(sel).length < 2) return;
    const g = nanoid();
    store.setElements(updateEls(store.elements, sel, (e) => ({ ...e, groupIds: [...e.groupIds, g] })));
    store.commit();
  },
  ungroup() {
    const sel = store.state.selectedIds;
    store.setElements(updateEls(store.elements, sel, (e) => ({ ...e, groupIds: e.groupIds.slice(0, -1) })));
    store.commit();
  },

  toggleLock() {
    const sel = store.selected;
    if (!sel.length) return;
    const lock = !sel.every((e) => e.locked);
    store.setElements(updateEls(store.elements, store.state.selectedIds, (e) => ({ ...e, locked: lock })));
    if (!lock) store.setState({ selectedIds: store.state.selectedIds });
    store.commit();
  },

  align(kind: "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom") {
    const sel = store.selected;
    if (sel.length < 2) return;
    const all = sel.map(getBounds);
    const minX = Math.min(...all.map((b) => b[0])),
      minY = Math.min(...all.map((b) => b[1])),
      maxX = Math.max(...all.map((b) => b[2])),
      maxY = Math.max(...all.map((b) => b[3]));
    const map = new Map<string, El>();
    sel.forEach((e, i) => {
      const [a, b, c, d] = all[i]!;
      let dx = 0,
        dy = 0;
      if (kind === "left") dx = minX - a;
      if (kind === "right") dx = maxX - c;
      if (kind === "hcenter") dx = (minX + maxX) / 2 - (a + c) / 2;
      if (kind === "top") dy = minY - b;
      if (kind === "bottom") dy = maxY - d;
      if (kind === "vcenter") dy = (minY + maxY) / 2 - (b + d) / 2;
      map.set(e.id, { ...e, x: e.x + dx, y: e.y + dy });
    });
    let els = store.elements.map((e) => map.get(e.id) ?? e);
    els = syncBindings(els, new Set(map.keys()));
    store.setElements(els);
    store.commit();
  },

  zoomTo(z: number, anchor?: Point) {
    const s = store.state;
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
    const ax = anchor ? anchor[0] : window.innerWidth / 2;
    const ay = anchor ? anchor[1] : window.innerHeight / 2;
    // keep scene point under anchor fixed: screen = (scene + scroll) * zoom
    const sceneX = ax / s.zoom - s.scrollX;
    const sceneY = ay / s.zoom - s.scrollY;
    store.setState({ zoom, scrollX: ax / zoom - sceneX, scrollY: ay / zoom - sceneY });
  },

  zoomToFit(onlySelection = false) {
    const els = onlySelection && store.selected.length ? store.selected : store.elements;
    if (!els.length) {
      store.setState({ zoom: 1, scrollX: 0, scrollY: 0 });
      return;
    }
    const [a, b, c, d] = (() => {
      let r = [Infinity, Infinity, -Infinity, -Infinity];
      for (const e of els) {
        const bb = getBounds(e);
        r = [Math.min(r[0]!, bb[0]), Math.min(r[1]!, bb[1]), Math.max(r[2]!, bb[2]), Math.max(r[3]!, bb[3])];
      }
      return r as [number, number, number, number];
    })();
    const vw = window.innerWidth,
      vh = window.innerHeight;
    const zoom = Math.min(Math.max(0.1, Math.min((vw - 160) / Math.max(c - a, 1), (vh - 200) / Math.max(d - b, 1))), 1.5);
    store.setState({ zoom, scrollX: vw / 2 / zoom - (a + c) / 2, scrollY: vh / 2 / zoom - (b + d) / 2 });
  },
};
