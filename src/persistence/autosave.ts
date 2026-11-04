import type { AppState, El, SceneData } from "../core/types";
import { PERSISTED_KEYS } from "../state/defaults";
import { store } from "../state/store";
import { idbGet, idbSet } from "./idb";

/** Local-first persistence: the scene is continuously saved to IndexedDB. */
const pickPersisted = (s: AppState): Partial<AppState> => {
  const o: Partial<AppState> = {};
  for (const k of PERSISTED_KEYS) (o as Record<string, unknown>)[k] = s[k];
  return o;
};

export const serialize = (elements: El[], withState = true): SceneData => ({
  type: "sashimi",
  version: 1,
  elements,
  appState: withState ? { viewBackgroundColor: store.state.viewBackgroundColor, grid: store.state.grid } : undefined,
});

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let lastSaved: { els: El[] | null; state: string } = { els: null, state: "" };

export const startAutosave = () => {
  const flush = () => {
    const stateJson = JSON.stringify(pickPersisted(store.state));
    if (lastSaved.els === store.elements && lastSaved.state === stateJson) return;
    lastSaved = { els: store.elements, state: stateJson };
    idbSet("scene", { elements: store.elements, appState: JSON.parse(stateJson) }).catch((e) => console.error("autosave failed", e));
  };
  store.subscribe(() => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 300);
  });
  window.addEventListener("beforeunload", flush);
  document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flush());
};

export const loadSaved = async () => {
  try {
    const saved = await idbGet<{ elements: El[]; appState: Partial<AppState> }>("scene");
    if (saved) {
      store.elements = saved.elements ?? [];
      store.state = { ...store.state, ...saved.appState, currentItem: { ...store.state.currentItem, ...saved.appState?.currentItem } };
      store.resetHistory();
      store.emit();
    }
  } catch (e) {
    console.error("Failed to load saved scene", e);
  }
};
