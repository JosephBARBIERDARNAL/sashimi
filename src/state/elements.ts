import { nanoid } from "nanoid";
import type { El, ElementType, ItemStyle } from "../core/types";

/** Element factories and immutable collection helpers. */
export const randomSeed = () => Math.floor(Math.random() * 2 ** 31);

export const newElement = (type: ElementType, x: number, y: number, style: ItemStyle, extra: Partial<El> = {}): El => {
  const base: El = {
    id: nanoid(),
    type,
    x,
    y,
    width: 0,
    height: 0,
    angle: 0,
    strokeColor: style.strokeColor,
    backgroundColor: type === "line" || type === "arrow" || type === "freedraw" || type === "text" ? "transparent" : style.backgroundColor,
    fillStyle: style.fillStyle,
    strokeWidth: style.strokeWidth,
    strokeStyle: type === "freedraw" ? "solid" : style.strokeStyle,
    roughness: style.roughness,
    opacity: style.opacity,
    roundness: type === "line" ? false : style.roundness,
    seed: randomSeed(),
    groupIds: [],
    locked: false,
  };
  if (type === "line" || type === "arrow" || type === "freedraw") base.points = [[0, 0]];
  if (type === "arrow") {
    base.startArrowhead = style.startArrowhead;
    base.endArrowhead = style.endArrowhead;
    base.startBinding = null;
    base.endBinding = null;
  }
  if (type === "text" || type === "rectangle" || type === "diamond" || type === "ellipse") {
    base.fontFamily = style.fontFamily;
    base.fontSize = style.fontSize;
    base.textAlign = type === "text" ? style.textAlign : "center";
  }
  return { ...base, ...extra };
};

export const updateEls = (els: El[], ids: Set<string> | Record<string, true>, fn: (el: El) => El): El[] => {
  const has = ids instanceof Set ? (id: string) => ids.has(id) : (id: string) => !!ids[id];
  return els.map((e) => (has(e.id) ? fn(e) : e));
};

/** Expand a set of ids to include whole groups. */
export const expandGroups = (els: El[], ids: Set<string>): Set<string> => {
  const groups = new Set<string>();
  for (const e of els) if (ids.has(e.id) && e.groupIds.length) groups.add(e.groupIds[e.groupIds.length - 1]!);
  if (!groups.size) return ids;
  const out = new Set(ids);
  for (const e of els) if (e.groupIds.length && groups.has(e.groupIds[e.groupIds.length - 1]!)) out.add(e.id);
  return out;
};

export const toRecord = (ids: Iterable<string>) => {
  const r: Record<string, true> = {};
  for (const id of ids) r[id] = true;
  return r;
};

/** Look up the replacement id for `id`, minting a new one on first use. */
export const remapId = (map: Map<string, string>, id: string): string => {
  let next = map.get(id);
  if (!next) {
    next = nanoid();
    map.set(id, next);
  }
  return next;
};
