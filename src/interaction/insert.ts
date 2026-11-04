import { nanoid } from "nanoid";
import type { El, Point } from "../core/types";
import { getCommonBounds, snap } from "../core/geometry";
import { store } from "../state/store";
import { newElement, randomSeed, remapId, toRecord } from "../state/elements";
import { readImageFile } from "../persistence/files";
import { gridSnap, toScene } from "./helpers";

/** Inserting images and pasted elements into the scene. */
export const insertImage = async (file: Blob, at?: Point) => {
  try {
    const { src, w, h } = await readImageFile(file);
    const s = store.state;
    const max = (Math.min(window.innerWidth, window.innerHeight) * 0.6) / s.zoom;
    const k = Math.min(1, max / Math.max(w, h));
    const pos = at ?? toScene(window.innerWidth / 2, window.innerHeight / 2);
    const el = newElement("image", pos[0] - (w * k) / 2, pos[1] - (h * k) / 2, s.currentItem, {
      width: w * k,
      height: h * k,
      src,
      backgroundColor: "transparent",
      strokeColor: "transparent",
    });
    store.elements = [...store.elements, el];
    store.setState({ selectedIds: { [el.id]: true }, tool: "selection" });
    store.commit();
  } catch {
    store.toast("Couldn't read that image");
  }
};

export const pickImage = () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = () => {
    const f = input.files?.[0];
    if (f) insertImage(f);
    else store.setState({ tool: "selection" });
  };
  input.click();
  // if the dialog is cancelled there is no event in all browsers; reset tool anyway
  setTimeout(() => store.state.tool === "image" && store.setState({ tool: "selection" }), 500);
};

/** Paste/insert elements (new ids), centred on `at`. */
export const insertElements = (els: El[], at?: Point) => {
  if (!els.length) return;
  const idMap = new Map<string, string>();
  const gMap = new Map<string, string>();
  for (const e of els) idMap.set(e.id, nanoid());
  const [a, b, c, d] = getCommonBounds(els);
  const pos = at ?? toScene(window.innerWidth / 2, window.innerHeight / 2);
  const dx = snap(pos[0] - (a + c) / 2, gridSnap()),
    dy = snap(pos[1] - (b + d) / 2, gridSnap());
  const clones = els.map((e) => ({
    ...e,
    id: idMap.get(e.id)!,
    x: e.x + dx,
    y: e.y + dy,
    seed: randomSeed(),
    groupIds: e.groupIds.map((g) => remapId(gMap, g)),
    startBinding: e.startBinding ? (idMap.get(e.startBinding) ?? null) : e.startBinding,
    endBinding: e.endBinding ? (idMap.get(e.endBinding) ?? null) : e.endBinding,
  }));
  store.elements = [...store.elements, ...clones];
  store.setState({ selectedIds: toRecord(clones.map((e) => e.id)), tool: "selection" });
  store.commit();
};
