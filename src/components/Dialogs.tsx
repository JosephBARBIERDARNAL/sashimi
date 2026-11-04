import { useEffect, useMemo, useState, type ReactNode } from "react";
import { store, useApp, useElements } from "../state/store";
import { exportToCanvas, exportToSvg } from "../render/export";
import { resetFileHandle, saveBlob } from "../persistence/files";

function Dialog({ title, children, onClose, wide }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onPointerDown={onClose}>
      <div className={`modal island ${wide ? "wide" : ""}`} onPointerDown={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const close = () => store.setState({ dialog: null });

export function Dialogs() {
  const dialog = useApp((s) => s.dialog);
  if (dialog === "help") return <HelpDialog />;
  if (dialog === "export") return <ExportDialog />;
  if (dialog === "reset") return <ResetDialog />;
  return null;
}

const SHORTCUTS: [string, [string, string][]][] = [
  [
    "Tools",
    [
      ["Hand (pan)", "H"],
      ["Selection", "V or 1"],
      ["Rectangle", "R or 2"],
      ["Diamond", "D or 3"],
      ["Ellipse", "O or 4"],
      ["Arrow", "A or 5"],
      ["Line", "L or 6"],
      ["Draw", "P or 7"],
      ["Text", "T or 8"],
      ["Insert image", "9"],
      ["Eraser", "E or 0"],
      ["Keep tool active", "Q"],
    ],
  ],
  [
    "Editor",
    [
      ["Undo / Redo", "Ctrl+Z / Ctrl+Shift+Z"],
      ["Copy / Cut / Paste", "Ctrl+C / X / V"],
      ["Duplicate", "Ctrl+D or Alt+drag"],
      ["Delete", "Delete / Backspace"],
      ["Select all", "Ctrl+A"],
      ["Group / Ungroup", "Ctrl+G / Ctrl+Shift+G"],
      ["Bring forward / to front", "Ctrl+] / Ctrl+Shift+]"],
      ["Send backward / to back", "Ctrl+[ / Ctrl+Shift+["],
      ["Lock / unlock", "Ctrl+Shift+L"],
      ["Edit text / label", "Enter or double-click"],
      ["Finish multi-point line", "Enter / Esc / click last point"],
      ["Constrain / snap angle", "Shift while drawing"],
      ["Draw from center", "Alt while drawing"],
      ["Nudge", "Arrow keys (+Shift)"],
    ],
  ],
  [
    "View",
    [
      ["Pan", "Space+drag, wheel, middle mouse"],
      ["Zoom", "Ctrl+wheel, Ctrl + / -"],
      ["Reset zoom", "Ctrl+0"],
      ["Zoom to fit", "Shift+1"],
      ["Zoom to selection", "Shift+2"],
      ["Toggle grid", "Ctrl+'"],
      ["Dark mode", "Shift+Alt+D"],
      ["Save / Open", "Ctrl+S / Ctrl+O"],
      ["Export image", "Ctrl+Shift+E"],
    ],
  ],
];

function HelpDialog() {
  return (
    <Dialog title="Keyboard shortcuts" onClose={close} wide>
      <p className="muted">
        Sashimi is local-first: everything is stored in this browser (IndexedDB) and never leaves your machine unless you save or export a
        file. You can open
        <code>.sashimi</code> and <code>.excalidraw</code> files.
      </p>
      <div className="shortcut-cols">
        {SHORTCUTS.map(([title, rows]) => (
          <div key={title}>
            <h3>{title}</h3>
            {rows.map(([a, b]) => (
              <div className="shortcut-row" key={a}>
                <span>{a}</span>
                <kbd>{b}</kbd>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Dialog>
  );
}

function ExportDialog() {
  const all = useElements();
  const selectedIds = useApp((s) => s.selectedIds);
  const bg = useApp((s) => s.viewBackgroundColor);
  const name = useApp((s) => s.fileName);
  const hasSel = all.some((e) => selectedIds[e.id]);
  const [onlySel, setOnlySel] = useState(hasSel);
  const [withBg, setWithBg] = useState(true);
  const [scale, setScale] = useState(2);
  const els = onlySel ? all.filter((e) => selectedIds[e.id]) : all;
  const background = withBg ? bg : null;

  const preview = useMemo(() => {
    if (!els.length) return null;
    return exportToCanvas(els, { background, scale: 1 }).toDataURL();
  }, [els, background]);

  const png = () => new Promise<Blob>((res) => exportToCanvas(els, { background, scale }).toBlob((b) => res(b!), "image/png"));

  return (
    <Dialog title="Export image" onClose={close} wide>
      {!els.length ? (
        <p className="muted">Nothing to export yet — draw something first.</p>
      ) : (
        <div className="export">
          <div className={`export-preview ${withBg ? "" : "checker"}`}>{preview && <img src={preview} alt="Export preview" />}</div>
          <div className="export-opts">
            {hasSel && (
              <label className="check">
                <input type="checkbox" checked={onlySel} onChange={(e) => setOnlySel(e.target.checked)} /> Only selected
              </label>
            )}
            <label className="check">
              <input type="checkbox" checked={withBg} onChange={(e) => setWithBg(e.target.checked)} /> Background
            </label>
            <div className="btn-row">
              <span className="muted">Scale</span>
              {[1, 2, 3, 4].map((s) => (
                <button key={s} type="button" className={`opt-btn ${scale === s ? "active" : ""}`} onClick={() => setScale(s)}>
                  {s}×
                </button>
              ))}
            </div>
            <div className="export-actions">
              <button
                type="button"
                className="primary"
                onClick={async () => saveBlob(await png(), `${name || "drawing"}.png`, "PNG image", { "image/png": [".png"] })}
              >
                PNG
              </button>
              <button
                type="button"
                className="primary"
                onClick={() =>
                  saveBlob(
                    new Blob([exportToSvg(els, { background })], { type: "image/svg+xml" }),
                    `${name || "drawing"}.svg`,
                    "SVG image",
                    {
                      "image/svg+xml": [".svg"],
                    },
                  )
                }
              >
                SVG
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.write([new ClipboardItem({ "image/png": png() })]);
                    store.toast("Copied PNG to clipboard");
                  } catch {
                    store.toast("Clipboard not available");
                  }
                }}
              >
                Copy PNG
              </button>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(exportToSvg(els, { background }));
                  store.toast("Copied SVG to clipboard");
                }}
              >
                Copy SVG
              </button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}

function ResetDialog() {
  return (
    <Dialog title="Reset the canvas" onClose={close}>
      <p>This will clear the whole canvas. You can still undo it with Ctrl+Z.</p>
      <div className="export-actions">
        <button type="button" onClick={close}>
          Cancel
        </button>
        <button
          type="button"
          className="danger"
          onClick={() => {
            store.elements = [];
            resetFileHandle();
            store.setState({ selectedIds: {}, dialog: null, fileName: "Untitled" });
            store.commit();
          }}
        >
          Reset
        </button>
      </div>
    </Dialog>
  );
}
