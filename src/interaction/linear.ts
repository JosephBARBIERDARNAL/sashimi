import type { Point } from "../core/types";
import { absolutePoints, fromAbsolutePoints } from "../core/geometry";
import { store } from "../state/store";
import { bindableAt, syncBindings } from "../state/bindings";
import { angleSnap, finishTool, setEl, snapP } from "./helpers";

/**
 * Click-click ("multi-point") creation of lines and arrows.
 * The last point of `abs` is a live preview following the cursor.
 */
let multi: { id: string; abs: Point[] } | null = null;

export const getMulti = () => multi;
export const getMultiId = () => multi?.id ?? null;

export const startMulti = (id: string, origin: Point) => {
  multi = { id, abs: [origin, origin] };
};

/** Fix the preview point in place and start a new preview point. */
export const addMultiPoint = () => {
  if (!multi) return;
  const last = multi.abs[multi.abs.length - 1]!;
  multi.abs = [...multi.abs, last];
};

export const updateMultiPreview = (p: Point, shift: boolean) => {
  if (!multi) return;
  const abs = multi.abs.slice();
  const prev = abs[abs.length - 2]!;
  abs[abs.length - 1] = shift ? angleSnap(prev, p) : snapP(p);
  multi.abs = abs;
  setEl(multi.id, (e) => fromAbsolutePoints(e, abs));
  const el = store.elements.find((e) => e.id === multi!.id);
  const hint = el?.type === "arrow" ? bindableAt(store.elements, abs[abs.length - 1]!, el.id, store.state.zoom) : null;
  store.setState({ bindHintId: hint?.id ?? null });
};

/** Attach an arrow's endpoints to whatever shapes they sit on. */
export const bindArrowEnds = (id: string) => {
  const el = store.elements.find((e) => e.id === id);
  if (el?.type !== "arrow") return;
  const abs = absolutePoints(el);
  const z = store.state.zoom;
  const st = bindableAt(store.elements, abs[0]!, id, z);
  let en = bindableAt(store.elements, abs[abs.length - 1]!, id, z);
  if (en && st && en.id === st.id) en = null;
  setEl(id, (e) => ({ ...e, startBinding: st?.id ?? null, endBinding: en?.id ?? null }));
  store.elements = syncBindings(store.elements, new Set([id]));
};

export const finishMulti = () => {
  if (!multi) return;
  const { id } = multi;
  const abs = multi.abs.slice(0, -1);
  multi = null;
  if (abs.length < 2) {
    store.elements = store.elements.filter((e) => e.id !== id);
    store.setState({ bindHintId: null, selectedIds: {} });
  } else {
    setEl(id, (e) => fromAbsolutePoints(e, abs));
    bindArrowEnds(id);
    store.setState({ bindHintId: null, selectedIds: { [id]: true } });
    finishTool();
  }
  store.commit();
};
