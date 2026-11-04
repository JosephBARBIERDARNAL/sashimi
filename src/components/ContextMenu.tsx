import { useEffect, useRef } from "react";
import { store } from "../state/store";
import { actions } from "../state/actions";
import { exportToCanvas } from "../render/export";
import { copySelection, copyStyles, pasteFromClipboard, pasteStyles } from "../interaction/clipboard";

export interface MenuState {
  x: number;
  y: number;
  onElement: boolean;
}

export function ContextMenu({ menu, onClose }: { menu: MenuState; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const down = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && onClose();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("pointerdown", down, true);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", down, true);
      window.removeEventListener("keydown", key);
    };
  }, [onClose]);

  const sel = store.selected;
  const item = (label: string, shortcut: string, fn: () => void, show = true) =>
    show && (
      <button
        key={label}
        type="button"
        className="menu-item"
        onClick={() => {
          onClose();
          fn();
        }}
      >
        <span>{label}</span>
        <span className="shortcut">{shortcut}</span>
      </button>
    );

  const left = Math.min(menu.x, window.innerWidth - 240);
  const top = Math.min(menu.y, window.innerHeight - (menu.onElement ? 470 : 260));

  return (
    <div ref={ref} className="menu island context-menu" style={{ left, top: Math.max(8, top) }} onContextMenu={(e) => e.preventDefault()}>
      {menu.onElement ? (
        <>
          {item("Cut", "Ctrl+X", () => {
            copySelection();
            actions.deleteSelected();
          })}
          {item("Copy", "Ctrl+C", copySelection)}
          {item("Paste", "Ctrl+V", () => pasteFromClipboard())}
          {item("Copy as PNG", "", async () => {
            try {
              const blob = await new Promise<Blob>((r) =>
                exportToCanvas(store.selected, { background: store.state.viewBackgroundColor, scale: 2 }).toBlob((b) => r(b!)),
              );
              await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
              store.toast("Copied as PNG");
            } catch {
              store.toast("Clipboard not available");
            }
          })}
          <div className="menu-sep" />
          {item("Copy styles", "Ctrl+Alt+C", () => copyStyles())}
          {item("Paste styles", "Ctrl+Alt+V", () => pasteStyles())}
          <div className="menu-sep" />
          {item("Duplicate", "Ctrl+D", () => actions.duplicateSelected())}
          {item("Group", "Ctrl+G", actions.group, sel.length > 1)}
          {item(
            "Ungroup",
            "Ctrl+Shift+G",
            actions.ungroup,
            sel.some((e) => e.groupIds.length > 0),
          )}
          {item(sel.every((e) => e.locked) ? "Unlock" : "Lock", "Ctrl+Shift+L", actions.toggleLock)}
          <div className="menu-sep" />
          {item("Bring forward", "Ctrl+]", () => actions.zOrder("forward"))}
          {item("Bring to front", "Ctrl+Shift+]", () => actions.zOrder("front"))}
          {item("Send backward", "Ctrl+[", () => actions.zOrder("backward"))}
          {item("Send to back", "Ctrl+Shift+[", () => actions.zOrder("back"))}
          <div className="menu-sep" />
          {item("Delete", "Del", actions.deleteSelected)}
        </>
      ) : (
        <>
          {item("Paste", "Ctrl+V", () => pasteFromClipboard())}
          {item("Select all", "Ctrl+A", actions.selectAll)}
          {item(
            "Unlock all",
            "",
            () => {
              store.setElements(store.elements.map((e) => (e.locked ? { ...e, locked: false } : e)));
              store.commit();
            },
            store.elements.some((e) => e.locked),
          )}
          <div className="menu-sep" />
          {item(store.state.grid ? "Hide grid" : "Show grid", "Ctrl+'", () => store.setState({ grid: !store.state.grid }))}
          {item("Zoom to fit", "Shift+1", () => actions.zoomToFit())}
          {item(store.state.theme === "dark" ? "Light mode" : "Dark mode", "Shift+Alt+D", () =>
            store.setState({ theme: store.state.theme === "dark" ? "light" : "dark" }),
          )}
        </>
      )}
    </div>
  );
}
