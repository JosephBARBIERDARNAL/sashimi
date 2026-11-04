import type { Tool } from "../core/types";
import { store, useApp } from "../state/store";
import { setTool } from "../interaction/pointer";
import { Icons } from "./Icons";

export const TOOLS: { tool: Tool; label: string; key: string; num?: string }[] = [
  { tool: "hand", label: "Hand (panning tool)", key: "H" },
  { tool: "selection", label: "Selection", key: "V", num: "1" },
  { tool: "rectangle", label: "Rectangle", key: "R", num: "2" },
  { tool: "diamond", label: "Diamond", key: "D", num: "3" },
  { tool: "ellipse", label: "Ellipse", key: "O", num: "4" },
  { tool: "arrow", label: "Arrow", key: "A", num: "5" },
  { tool: "line", label: "Line", key: "L", num: "6" },
  { tool: "freedraw", label: "Draw", key: "P", num: "7" },
  { tool: "text", label: "Text", key: "T", num: "8" },
  { tool: "image", label: "Insert image", key: "9", num: "9" },
  { tool: "eraser", label: "Eraser", key: "E", num: "0" },
];

export function Toolbar() {
  const tool = useApp((s) => s.tool);
  const locked = useApp((s) => s.toolLocked);
  return (
    <div className="toolbar island" role="toolbar" onPointerDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        className={`tool-btn ${locked ? "active" : ""}`}
        title="Keep selected tool active after drawing (Q)"
        onClick={() => store.setState({ toolLocked: !locked })}
      >
        {locked ? Icons.lock : Icons.unlock}
      </button>
      <div className="divider-v tall" />
      {TOOLS.map((t) => (
        <button
          key={t.tool}
          type="button"
          className={`tool-btn ${tool === t.tool ? "active" : ""}`}
          title={`${t.label} — ${t.key}${t.num && t.num !== t.key ? ` or ${t.num}` : ""}`}
          aria-pressed={tool === t.tool}
          onClick={() => setTool(t.tool)}
        >
          {Icons[t.tool]}
          {t.num && <span className="tool-num">{t.num}</span>}
        </button>
      ))}
    </div>
  );
}
