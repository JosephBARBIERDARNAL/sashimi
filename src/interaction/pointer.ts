import type { El, Point, Tool } from "../core/types";
import {
  absolutePoints,
  center,
  canHoldText,
  dist,
  fromAbsolutePoints,
  getBounds,
  getCommonBounds,
  normalizePoints,
  rotate,
  snap,
} from "../core/geometry";
import { GRID_SIZE } from "../core/constants";
import { getFrame, handleAt, resizeCursor, type HandleDir } from "../render/handles";
import { store } from "../state/store";
import { actions } from "../state/actions";
import { expandGroups, newElement, toRecord } from "../state/elements";
import { bindableAt, syncBindings } from "../state/bindings";
import { angleSnap, containerAt, finishTool, hitAt, pointer, setEl, snapP, toScene } from "./helpers";
import { createText, startEditing } from "./textEditing";
import { pickImage } from "./insert";
import { addMultiPoint, bindArrowEnds, finishMulti, getMulti, startMulti, updateMultiPreview } from "./linear";
import { doResize } from "./resize";

/** Canvas pointer state machine (select / move / resize / rotate / draw / erase / pan). */
type Ix =
  | { kind: "none" }
  | { kind: "pan"; sx: number; sy: number; scrollX: number; scrollY: number }
  | { kind: "create"; id: string; origin: Point }
  | { kind: "linear"; id: string; abs: Point[]; dragged: boolean }
  | { kind: "freedraw"; id: string; abs: Point[] }
  | { kind: "move"; start: Point; orig: Map<string, El> }
  | { kind: "resize"; dir: HandleDir; orig: El[]; bounds: [number, number, number, number] }
  | { kind: "rotate"; start: number; c: Point; orig: El[] }
  | { kind: "point"; id: string; index: number; orig: El; target: string | null }
  | { kind: "marquee"; start: Point; base: Record<string, true> }
  | { kind: "erase"; last: Point };

let ix: Ix = { kind: "none" };

/** Text element or label-able shape to edit at p (shapes count even when transparent). */
const labelTargetAt = (p: Point): El | null => {
  const hit = hitAt(p);
  if (hit && !hit.locked && (hit.type === "text" || canHoldText(hit))) return hit;
  if (hit && hit.type !== "text" && !canHoldText(hit)) return null;
  return containerAt(p);
};

export const setTool = (tool: Tool) => {
  if (getMulti()) finishMulti();
  store.setState({ tool, selectedIds: tool === "selection" || tool === "hand" ? store.state.selectedIds : {}, editingId: null });
  if (tool === "image") pickImage();
};

export const onPointerDown = (e: PointerEvent | React.PointerEvent) => {
  const s = store.state;
  const raw = toScene(e.clientX, e.clientY);
  pointer.last = raw;
  if (s.editingId) {
    (document.activeElement as HTMLElement | null)?.blur();
    return;
  }
  if (e.button === 1 || (e.button === 0 && (pointer.spaceDown || s.tool === "hand"))) {
    ix = { kind: "pan", sx: e.clientX, sy: e.clientY, scrollX: s.scrollX, scrollY: s.scrollY };
    return;
  }
  if (e.button !== 0) return;

  const multi = getMulti();
  if (multi) {
    const lastFixed = multi.abs[multi.abs.length - 2]!;
    if (dist(lastFixed, raw) < 8 / s.zoom) finishMulti();
    else addMultiPoint();
    return;
  }

  const p = raw;
  switch (s.tool) {
    case "selection": {
      const sel = store.selected;
      const frame = getFrame(sel, s.zoom);
      const h = handleAt(frame, p, s.zoom);
      if (h) {
        if (h.kind === "rotate") {
          const [a, b, c, d] = getCommonBounds(sel);
          const ctr: Point = sel.length === 1 ? center(sel[0]!) : [(a + c) / 2, (b + d) / 2];
          ix = { kind: "rotate", start: Math.atan2(p[1] - ctr[1], p[0] - ctr[0]), c: ctr, orig: sel };
        } else if (h.kind === "resize") {
          ix = { kind: "resize", dir: h.dir, orig: sel, bounds: getCommonBounds(sel) };
        } else if (h.kind === "point") {
          ix = { kind: "point", id: sel[0]!.id, index: h.index, orig: sel[0]!, target: null };
        } else if (h.kind === "midpoint") {
          const el = sel[0]!;
          const abs = absolutePoints(el);
          abs.splice(h.index + 1, 0, h.p);
          const next = fromAbsolutePoints(el, abs);
          setEl(el.id, () => next);
          ix = { kind: "point", id: el.id, index: h.index + 1, orig: next, target: null };
        }
        return;
      }
      const hit = hitAt(p);
      if (hit) {
        const ids = expandGroups(store.elements, new Set([hit.id]));
        let selected = { ...s.selectedIds };
        if (e.shiftKey) {
          const all = [...ids].every((id) => selected[id]);
          for (const id of ids) all ? delete selected[id] : (selected[id] = true);
          store.setState({ selectedIds: selected });
          if (all) return;
        } else if (!s.selectedIds[hit.id]) {
          selected = toRecord(ids);
          store.setState({ selectedIds: selected });
        }
        if (e.altKey) {
          const dupes = actions.duplicateSelected(0) ?? [];
          selected = toRecord(dupes.map((d) => d.id));
        }
        beginMove(p, selected);
        return;
      }
      if (sel.length > 1) {
        const [a, b, c, d] = getCommonBounds(sel);
        if (p[0] >= a && p[0] <= c && p[1] >= b && p[1] <= d) {
          beginMove(p, s.selectedIds);
          return;
        }
      }
      if (!e.shiftKey) store.setState({ selectedIds: {} });
      ix = { kind: "marquee", start: p, base: e.shiftKey ? s.selectedIds : {} };
      return;
    }
    case "rectangle":
    case "diamond":
    case "ellipse": {
      const o = snapP(p);
      const el = newElement(s.tool, o[0], o[1], s.currentItem);
      store.elements = [...store.elements, el];
      store.setState({ selectedIds: {} });
      ix = { kind: "create", id: el.id, origin: o };
      return;
    }
    case "arrow":
    case "line": {
      const o = snapP(p);
      const el = newElement(s.tool, o[0], o[1], s.currentItem);
      const abs: Point[] = [o, o];
      store.elements = [...store.elements, fromAbsolutePoints(el, abs)];
      store.setState({ selectedIds: {} });
      ix = { kind: "linear", id: el.id, abs, dragged: false };
      return;
    }
    case "freedraw": {
      const el = newElement("freedraw", p[0], p[1], s.currentItem, { roughness: 0 });
      store.elements = [...store.elements, fromAbsolutePoints(el, [p])];
      store.setState({ selectedIds: {} });
      ix = { kind: "freedraw", id: el.id, abs: [p] };
      return;
    }
    case "text": {
      const hit = labelTargetAt(p);
      if (hit) startEditing(hit.id);
      else createText(snapP(p));
      finishTool();
      return;
    }
    case "eraser": {
      ix = { kind: "erase", last: p };
      eraseAlong(p, p);
      return;
    }
  }
};

const beginMove = (p: Point, selected: Record<string, true>) => {
  const orig = new Map<string, El>();
  for (const el of store.elements) {
    if (!selected[el.id] || el.locked) continue;
    let o = el;
    if (el.type === "arrow") {
      // detach from targets that aren't moving with it
      if (el.startBinding && !selected[el.startBinding]) o = { ...o, startBinding: null };
      if (el.endBinding && !selected[el.endBinding]) o = { ...o, endBinding: null };
    }
    orig.set(el.id, o);
  }
  ix = { kind: "move", start: p, orig };
};

const eraseAlong = (a: Point, b: Point) => {
  const steps = Math.max(1, Math.ceil(dist(a, b) / (4 / store.state.zoom)));
  const erasing = { ...store.state.erasing };
  let changed = false;
  for (let i = 0; i <= steps; i++) {
    const p: Point = [a[0] + ((b[0] - a[0]) * i) / steps, a[1] + ((b[1] - a[1]) * i) / steps];
    const hit = hitAt(p);
    if (hit && !hit.locked && !erasing[hit.id]) {
      for (const id of expandGroups(store.elements, new Set([hit.id]))) erasing[id] = true;
      changed = true;
    }
  }
  if (changed) store.setState({ erasing });
};

export const onPointerMove = (e: PointerEvent | React.PointerEvent, canvas: HTMLCanvasElement) => {
  const s = store.state;
  const p = toScene(e.clientX, e.clientY);
  pointer.last = p;
  if (getMulti() && ix.kind === "none") {
    updateMultiPreview(p, e.shiftKey);
    return;
  }
  switch (ix.kind) {
    case "none":
      updateCursor(p, canvas);
      return;
    case "pan":
      store.setState({ scrollX: ix.scrollX + (e.clientX - ix.sx) / s.zoom, scrollY: ix.scrollY + (e.clientY - ix.sy) / s.zoom });
      return;
    case "create": {
      const o = ix.origin;
      const c = snapP(p);
      let w = c[0] - o[0],
        h = c[1] - o[1];
      if (e.shiftKey) {
        const m = Math.max(Math.abs(w), Math.abs(h));
        w = Math.sign(w || 1) * m;
        h = Math.sign(h || 1) * m;
      }
      let x = Math.min(o[0], o[0] + w),
        y = Math.min(o[1], o[1] + h);
      let W = Math.abs(w),
        H = Math.abs(h);
      if (e.altKey) {
        x = o[0] - W;
        y = o[1] - H;
        W *= 2;
        H *= 2;
      }
      setEl(ix.id, (el) => ({ ...el, x, y, width: W, height: H }));
      store.emit();
      return;
    }
    case "linear": {
      const abs = ix.abs.slice();
      abs[abs.length - 1] = e.shiftKey ? angleSnap(abs[0]!, p) : snapP(p);
      if (dist(abs[0]!, abs[1]!) > 4 / s.zoom) ix.dragged = true;
      ix.abs = abs;
      setEl(ix.id, (el) => fromAbsolutePoints(el, abs));
      const el = store.elements.find((x) => x.id === (ix as { id: string }).id);
      const hint = el?.type === "arrow" ? bindableAt(store.elements, abs[1]!, el.id, s.zoom) : null;
      store.setState({ bindHintId: hint?.id ?? null });
      return;
    }
    case "freedraw": {
      const last = ix.abs[ix.abs.length - 1]!;
      if (dist(last, p) < 1 / s.zoom) return;
      ix.abs.push(p);
      const abs = ix.abs;
      setEl(ix.id, (el) => fromAbsolutePoints(el, abs));
      store.emit();
      return;
    }
    case "move": {
      let dx = p[0] - ix.start[0],
        dy = p[1] - ix.start[1];
      if (e.shiftKey) Math.abs(dx) > Math.abs(dy) ? (dy = 0) : (dx = 0);
      const first = ix.orig.values().next().value as El | undefined;
      if (first && s.grid) {
        dx = snap(first.x + dx, GRID_SIZE) - first.x;
        dy = snap(first.y + dy, GRID_SIZE) - first.y;
      }
      const orig = ix.orig;
      let els = store.elements.map((el) => {
        const o = orig.get(el.id);
        return o ? { ...o, x: o.x + dx, y: o.y + dy } : el;
      });
      els = syncBindings(els, new Set(orig.keys()));
      store.setElements(els);
      return;
    }
    case "resize":
      doResize(ix, p, e.shiftKey, e.altKey);
      return;
    case "rotate": {
      const a = Math.atan2(p[1] - ix.c[1], p[0] - ix.c[0]);
      let delta = a - ix.start;
      const c = ix.c;
      if (ix.orig.length === 1) {
        let ang = ix.orig[0]!.angle + delta;
        if (e.shiftKey) ang = Math.round(ang / (Math.PI / 12)) * (Math.PI / 12);
        delta = ang - ix.orig[0]!.angle;
      } else if (e.shiftKey) delta = Math.round(delta / (Math.PI / 12)) * (Math.PI / 12);
      const map = new Map<string, El>();
      for (const o of ix.orig) {
        if (o.locked) continue;
        const oc = center(o);
        const nc = rotate(oc[0], oc[1], c[0], c[1], delta);
        const ang = (((o.angle + delta) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        map.set(o.id, { ...o, angle: ang, x: nc[0] - o.width / 2, y: nc[1] - o.height / 2 });
      }
      let els = store.elements.map((el) => map.get(el.id) ?? el);
      els = syncBindings(els, new Set(map.keys()));
      store.setElements(els);
      return;
    }
    case "point": {
      const abs = absolutePoints(ix.orig);
      const i = ix.index;
      const neighbor = abs[i === 0 ? 1 : i - 1];
      abs[i] = e.shiftKey && neighbor ? angleSnap(neighbor, p) : snapP(p);
      let next = fromAbsolutePoints(ix.orig, abs);
      let target: El | null = null;
      if (next.type === "arrow" && (i === 0 || i === abs.length - 1)) {
        target = bindableAt(store.elements, abs[i]!, next.id, s.zoom);
        next = i === 0 ? { ...next, startBinding: null } : { ...next, endBinding: null };
      }
      ix.target = target?.id ?? null;
      const id = ix.id;
      let els = store.elements.map((el) => (el.id === id ? next : el));
      els = syncBindings(els, new Set([id]));
      store.elements = els;
      store.setState({ bindHintId: ix.target });
      return;
    }
    case "marquee": {
      const a = ix.start;
      const box = { x: Math.min(a[0], p[0]), y: Math.min(a[1], p[1]), w: Math.abs(p[0] - a[0]), h: Math.abs(p[1] - a[1]) };
      const ids = new Set<string>();
      for (const el of store.elements) {
        if (el.locked) continue;
        const [x0, y0, x1, y1] = getBounds(el);
        if (x0 >= box.x && y0 >= box.y && x1 <= box.x + box.w && y1 <= box.y + box.h) ids.add(el.id);
      }
      const full = expandGroups(store.elements, ids);
      store.setState({ selectionBox: box, selectedIds: { ...ix.base, ...toRecord(full) } });
      return;
    }
    case "erase":
      eraseAlong(ix.last, p);
      ix.last = p;
      return;
  }
};

export const onPointerUp = (e: PointerEvent | React.PointerEvent) => {
  const s = store.state;
  const cur = ix;
  ix = { kind: "none" };
  switch (cur.kind) {
    case "create": {
      const el = store.elements.find((x) => x.id === cur.id);
      if (!el || (el.width < 3 && el.height < 3)) {
        store.elements = store.elements.filter((x) => x.id !== cur.id);
        store.emit();
        return;
      }
      store.setState({ selectedIds: { [el.id]: true } });
      store.commit();
      finishTool();
      return;
    }
    case "linear": {
      if (!cur.dragged) {
        // click (not drag): enter multi-point mode
        startMulti(cur.id, cur.abs[0]!);
        updateMultiPreview(toScene(e.clientX, e.clientY), false);
        return;
      }
      bindArrowEnds(cur.id);
      store.setState({ bindHintId: null, selectedIds: { [cur.id]: true } });
      store.commit();
      finishTool();
      return;
    }
    case "freedraw": {
      if (cur.abs.length === 1) {
        const p = cur.abs[0]!;
        setEl(cur.id, (el) => fromAbsolutePoints(el, [p, [p[0] + 0.5, p[1] + 0.5]]));
      }
      store.commit();
      return;
    }
    case "point": {
      if (cur.target !== null || cur.orig.type === "arrow") {
        const el = store.elements.find((x) => x.id === cur.id);
        if (el?.type === "arrow") {
          const last = (el.points?.length ?? 0) - 1;
          if (cur.index === 0) setEl(el.id, (x) => ({ ...x, startBinding: cur.target }));
          if (cur.index === last) setEl(el.id, (x) => ({ ...x, endBinding: cur.target }));
          store.elements = syncBindings(store.elements, new Set([el.id]));
        }
      }
      setEl(cur.id, (x) => normalizePoints(x));
      store.setState({ bindHintId: null });
      store.commit();
      return;
    }
    case "marquee":
      store.setState({ selectionBox: null });
      return;
    case "erase": {
      const er = s.erasing;
      if (Object.keys(er).length) {
        store.setState({ selectedIds: er, erasing: {} });
        actions.deleteSelected();
      }
      return;
    }
    case "move":
    case "resize":
    case "rotate":
      store.commit();
      return;
  }
};

export const onDoubleClick = (e: React.MouseEvent) => {
  const s = store.state;
  if (getMulti() || s.tool !== "selection") return;
  const p = toScene(e.clientX, e.clientY);
  const target = labelTargetAt(p);
  if (target) {
    startEditing(target.id);
    return;
  }
  if (!hitAt(p)) createText(snapP(p));
};

export const cancelInteraction = () => {
  if (getMulti()) return finishMulti();
  ix = { kind: "none" };
};

const updateCursor = (p: Point, canvas: HTMLCanvasElement) => {
  const s = store.state;
  let cursor = "default";
  if (pointer.spaceDown || s.tool === "hand") cursor = "grab";
  else if (s.tool === "text") cursor = "text";
  else if (s.tool === "eraser") cursor = "cell";
  else if (s.tool !== "selection") cursor = "crosshair";
  else {
    const sel = store.selected;
    const h = handleAt(getFrame(sel, s.zoom), p, s.zoom);
    if (h?.kind === "resize") cursor = resizeCursor(h.dir, sel.length === 1 ? sel[0]!.angle : 0);
    else if (h?.kind === "rotate") cursor = "grab";
    else if (h) cursor = "pointer";
    else {
      const hit = hitAt(p);
      if (hit && !hit.locked) cursor = "move";
    }
  }
  if (canvas.style.cursor !== cursor) canvas.style.cursor = cursor;
};

export const onWheel = (e: WheelEvent) => {
  e.preventDefault();
  const s = store.state;
  if (e.ctrlKey || e.metaKey) {
    const factor = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.01));
    actions.zoomTo(s.zoom * factor, [e.clientX, e.clientY]);
    return;
  }
  const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
  const dy = e.shiftKey && !e.deltaX ? 0 : e.deltaY;
  store.setState({ scrollX: s.scrollX - dx / s.zoom, scrollY: s.scrollY - dy / s.zoom });
};
