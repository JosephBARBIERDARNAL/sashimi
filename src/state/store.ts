import { useSyncExternalStore } from "react";
import type { AppState, El } from "../core/types";
import { initialAppState } from "./defaults";

/**
 * Minimal external store: elements + app state, with snapshot-based undo/redo.
 * Elements are immutable; every change produces a new array.
 */
type Listener = () => void;

class Store {
  elements: El[] = [];
  state: AppState = initialAppState();
  private listeners = new Set<Listener>();
  private undoStack: El[][] = [];
  private redoStack: El[][] = [];
  private committed: El[] = [];
  version = 0;

  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  emit() {
    this.version++;
    for (const l of this.listeners) l();
  }

  setState(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
    const p = typeof patch === "function" ? patch(this.state) : patch;
    this.state = { ...this.state, ...p };
    this.emit();
  }

  setElements(els: El[]) {
    this.elements = els;
    this.emit();
  }

  /** Snapshot current elements as an undo step (if changed since last commit). */
  commit() {
    if (this.elements === this.committed) return;
    this.undoStack.push(this.committed);
    if (this.undoStack.length > 300) this.undoStack.shift();
    this.redoStack = [];
    this.committed = this.elements;
    this.emit();
  }

  resetHistory() {
    this.undoStack = [];
    this.redoStack = [];
    this.committed = this.elements;
  }

  undo() {
    const prev = this.undoStack.pop();
    if (!prev) return;
    this.redoStack.push(this.committed);
    this.committed = prev;
    this.elements = prev;
    this.pruneSelection();
    this.emit();
  }
  redo() {
    const next = this.redoStack.pop();
    if (!next) return;
    this.undoStack.push(this.committed);
    this.committed = next;
    this.elements = next;
    this.pruneSelection();
    this.emit();
  }
  get canUndo() {
    return this.undoStack.length > 0;
  }
  get canRedo() {
    return this.redoStack.length > 0;
  }
  private pruneSelection() {
    const ids = new Set(this.elements.map((e) => e.id));
    const sel: Record<string, true> = {};
    for (const id in this.state.selectedIds) if (ids.has(id)) sel[id] = true;
    this.state = { ...this.state, selectedIds: sel, editingId: null };
  }

  get selected(): El[] {
    return this.elements.filter((e) => this.state.selectedIds[e.id]);
  }

  toast(msg: string) {
    this.setState({ toast: msg });
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.setState({ toast: null }), 2200);
  }
  private toastTimer: ReturnType<typeof setTimeout> | undefined;
}

export const store = new Store();

export function useApp<T>(sel: (s: AppState) => T): T {
  return useSyncExternalStore(store.subscribe, () => sel(store.state));
}
export function useElements(): El[] {
  return useSyncExternalStore(store.subscribe, () => store.elements);
}
export function useVersion(): number {
  return useSyncExternalStore(store.subscribe, () => store.version);
}
