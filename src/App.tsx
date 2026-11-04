import { useEffect, useState } from "react";
import { store, useApp, useElements } from "./state/store";
import { Canvas } from "./components/Canvas";
import { Toolbar } from "./components/Toolbar";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { MainMenu } from "./components/MainMenu";
import { Footer } from "./components/Footer";
import { TextEditor } from "./components/TextEditor";
import { Dialogs } from "./components/Dialogs";
import { ContextMenu, type MenuState } from "./components/ContextMenu";
import { Welcome } from "./components/Welcome";
import { actions } from "./state/actions";
import { onKeyDown, onKeyUp } from "./interaction/keyboard";
import { copySelection, handlePasteEvent } from "./interaction/clipboard";
import { insertImage } from "./interaction/insert";
import { toScene } from "./interaction/helpers";
import { loadSceneFile } from "./persistence/files";

export function App() {
  const theme = useApp((s) => s.theme);
  const toast = useApp((s) => s.toast);
  const tool = useApp((s) => s.tool);
  const elements = useElements();
  const [menu, setMenu] = useState<MenuState | null>(null);

  useEffect(() => {
    const isTyping = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");
    };
    const copy = (e: ClipboardEvent) => !isTyping(e.target) && copySelection(e);
    const cut = (e: ClipboardEvent) => {
      if (isTyping(e.target)) return;
      copySelection(e).then((ok) => ok && actions.deleteSelected());
    };
    const paste = (e: ClipboardEvent) => !isTyping(e.target) && !store.state.editingId && handlePasteEvent(e);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    document.addEventListener("copy", copy);
    document.addEventListener("cut", cut);
    document.addEventListener("paste", paste);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("copy", copy);
      document.removeEventListener("cut", cut);
      document.removeEventListener("paste", paste);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <div
      className={`app theme-${theme}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={async (e) => {
        e.preventDefault();
        const at = toScene(e.clientX, e.clientY);
        for (const f of e.dataTransfer.files) {
          if (f.type.startsWith("image/")) await insertImage(f, at);
          else if (/\.(sashimi|json|excalidraw)$/i.test(f.name)) await loadSceneFile(f, true);
        }
      }}
    >
      <Canvas onContextMenu={(x, y, onElement) => setMenu({ x, y, onElement })} />
      {elements.length === 0 && tool === "selection" && <Welcome />}
      <div className="top-bar">
        <div className="top-left">
          <MainMenu />
        </div>
        <Toolbar />
        <div className="top-right" />
      </div>
      <PropertiesPanel />
      <Footer />
      <TextEditor />
      <Dialogs />
      {menu && <ContextMenu menu={menu} onClose={() => setMenu(null)} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
