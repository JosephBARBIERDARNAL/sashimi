import { useRef, useState } from "react";
import { QUICK_CANVAS } from "../core/colors";
import { store, useApp } from "../state/store";
import { openFile, saveScene } from "../persistence/files";
import { ColorPanel } from "./ColorPicker";
import { Icons } from "./Icons";
import { Popover } from "./Popover";

export function MainMenu() {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const theme = useApp((s) => s.theme);
  const grid = useApp((s) => s.grid);
  const bg = useApp((s) => s.viewBackgroundColor);
  const [bgOpen, setBgOpen] = useState(false);
  const bgBtn = useRef<HTMLButtonElement>(null);

  const item = (icon: React.ReactNode, label: string, shortcut: string, fn: () => void) => (
    <button
      type="button"
      className="menu-item"
      onClick={() => {
        setOpen(false);
        fn();
      }}
    >
      <span className="menu-icon">{icon}</span>
      <span>{label}</span>
      <span className="shortcut">{shortcut}</span>
    </button>
  );

  return (
    <>
      <button
        ref={btn}
        type="button"
        className={`island icon-island ${open ? "active" : ""}`}
        title="Menu"
        onClick={() => setOpen((o) => !o)}
      >
        {Icons.menu}
      </button>
      {open && (
        <Popover anchor={btn} placement="bottom" onClose={() => setOpen(false)} className="menu">
          {item(Icons.open, "Open…", "Ctrl+O", openFile)}
          {item(Icons.save, "Save", "Ctrl+S", () => saveScene())}
          {item(Icons.save, "Save as…", "Ctrl+Shift+S", () => saveScene(true))}
          {item(Icons.export, "Export image…", "Ctrl+Shift+E", () => store.setState({ dialog: "export" }))}
          {item(Icons.reset, "Reset the canvas", "", () => store.setState({ dialog: "reset" }))}
          <div className="menu-sep" />
          {item(Icons.help, "Help & shortcuts", "?", () => store.setState({ dialog: "help" }))}
          {item(Icons.grid, grid ? "Hide grid" : "Show grid", "Ctrl+'", () => store.setState({ grid: !grid }))}
          {item(theme === "dark" ? Icons.sun : Icons.moon, theme === "dark" ? "Light mode" : "Dark mode", "Shift+Alt+D", () =>
            store.setState({ theme: theme === "dark" ? "light" : "dark" }),
          )}
          <div className="menu-sep" />
          <div className="menu-label">Canvas background</div>
          <div className="color-row menu-colors">
            {QUICK_CANVAS.map((c) => (
              <button
                key={c}
                type="button"
                className={`swatch ${c === bg ? "active" : ""}`}
                style={{ background: c }}
                title={c}
                onClick={() => store.setState({ viewBackgroundColor: c })}
              />
            ))}
            <div className="divider-v" />
            <button
              ref={bgBtn}
              type="button"
              className="swatch big"
              style={{ background: bg }}
              title="More colors"
              onClick={() => setBgOpen((o) => !o)}
            />
          </div>
          {bgOpen && (
            <Popover anchor={bgBtn} onClose={() => setBgOpen(false)} className="color-popover">
              <ColorPanel
                value={bg}
                onPick={(c) => store.setState({ viewBackgroundColor: c })}
                onLive={(c) => store.setState({ viewBackgroundColor: c })}
              />
            </Popover>
          )}
        </Popover>
      )}
    </>
  );
}
