import { store, useApp, useVersion } from "../state/store";
import { actions } from "../state/actions";
import { Icons } from "./Icons";

export function Footer() {
  const zoom = useApp((s) => s.zoom);
  useVersion(); // re-render for undo/redo availability
  return (
    <div className="footer" onPointerDown={(e) => e.stopPropagation()}>
      <div className="island zoom-group">
        <button type="button" className="tool-btn" title="Zoom out (Ctrl+-)" onClick={() => actions.zoomTo(zoom / 1.1)}>
          {Icons.minus}
        </button>
        <button type="button" className="zoom-val" title="Reset zoom (Ctrl+0)" onClick={() => actions.zoomTo(1)}>
          {Math.round(zoom * 100)}%
        </button>
        <button type="button" className="tool-btn" title="Zoom in (Ctrl++)" onClick={() => actions.zoomTo(zoom * 1.1)}>
          {Icons.plus}
        </button>
      </div>
      <div className="island zoom-group">
        <button type="button" className="tool-btn" title="Undo (Ctrl+Z)" disabled={!store.canUndo} onClick={() => store.undo()}>
          {Icons.undo}
        </button>
        <button type="button" className="tool-btn" title="Redo (Ctrl+Shift+Z)" disabled={!store.canRedo} onClick={() => store.redo()}>
          {Icons.redo}
        </button>
      </div>
      <div className="spacer" />
      <button type="button" className="island icon-island" title="Help (?)" onClick={() => store.setState({ dialog: "help" })}>
        {Icons.help}
      </button>
    </div>
  );
}
