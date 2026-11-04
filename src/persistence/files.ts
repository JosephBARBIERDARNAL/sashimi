import { store } from "../state/store";
import { actions } from "../state/actions";
import { serialize } from "./autosave";
import { parseScene } from "./excalidraw";

/** Save / open drawing files (File System Access API with download fallback). */
type FileHandle = {
  name: string;
  createWritable: () => Promise<{ write: (d: Blob) => Promise<void>; close: () => Promise<void> }>;
  getFile: () => Promise<File>;
};
declare global {
  interface Window {
    showSaveFilePicker?: (o?: unknown) => Promise<FileHandle>;
    showOpenFilePicker?: (o?: unknown) => Promise<FileHandle[]>;
  }
}

let currentHandle: FileHandle | null = null;

const download = (blob: Blob, name: string) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

export const saveBlob = async (blob: Blob, name: string, description: string, accept: Record<string, string[]>) => {
  if (window.showSaveFilePicker) {
    try {
      const h = await window.showSaveFilePicker({ suggestedName: name, types: [{ description, accept }] });
      const w = await h.createWritable();
      await w.write(blob);
      await w.close();
      return h;
    } catch (e) {
      if ((e as Error).name === "AbortError") return null;
      console.warn(e);
    }
  }
  download(blob, name);
  return null;
};

export const saveScene = async (saveAs = false) => {
  const blob = new Blob([JSON.stringify(serialize(store.elements), null, 2)], { type: "application/json" });
  if (currentHandle && !saveAs) {
    try {
      const w = await currentHandle.createWritable();
      await w.write(blob);
      await w.close();
      store.toast(`Saved to ${currentHandle.name}`);
      return;
    } catch (e) {
      console.warn(e);
    }
  }
  const h = await saveBlob(blob, `${store.state.fileName || "drawing"}.sashimi`, "Sashimi drawing", {
    "application/json": [".sashimi", ".json"],
  });
  if (h) {
    currentHandle = h;
    store.setState({ fileName: h.name.replace(/\.(sashimi|json|excalidraw)$/i, "") });
    store.toast(`Saved to ${h.name}`);
  } else if (!window.showSaveFilePicker) store.toast("Downloaded");
};

export const openFile = async () => {
  let file: File | null = null;
  if (window.showOpenFilePicker) {
    try {
      const [h] = await window.showOpenFilePicker({
        types: [{ description: "Drawings", accept: { "application/json": [".sashimi", ".json", ".excalidraw"] } }],
      });
      if (!h) return;
      file = await h.getFile();
      if (/\.(sashimi|json)$/i.test(h.name)) currentHandle = h;
      else currentHandle = null;
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
  }
  if (!file) {
    file = await new Promise<File | null>((res) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".sashimi,.json,.excalidraw";
      input.onchange = () => res(input.files?.[0] ?? null);
      input.click();
    });
    currentHandle = null;
  }
  if (file) await loadSceneFile(file, true);
};

export const loadSceneFile = async (file: File, replace: boolean) => {
  try {
    const data = JSON.parse(await file.text());
    const els = parseScene(data);
    if (!els) throw new Error("Unrecognised file");
    if (replace) {
      store.elements = els;
      store.setState({
        selectedIds: {},
        editingId: null,
        fileName: file.name.replace(/\.(sashimi|json|excalidraw)$/i, ""),
        ...(data.appState?.viewBackgroundColor ? { viewBackgroundColor: data.appState.viewBackgroundColor } : {}),
      });
      store.commit();
      actions.zoomToFit();
    }
    return els;
  } catch (e) {
    store.toast(`Couldn't open file: ${(e as Error).message}`);
    return null;
  }
};

export const resetFileHandle = () => (currentHandle = null);

export const readImageFile = (file: Blob): Promise<{ src: string; w: number; h: number }> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const src = r.result as string;
      const img = new Image();
      img.onload = () => res({ src, w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = rej;
      img.src = src;
    };
    r.onerror = rej;
    r.readAsDataURL(file);
  });
