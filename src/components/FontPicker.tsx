import { useEffect, useMemo, useRef, useState } from "react";
import { BUILTIN_FONTS, fontStack, supportsLocalFontAccess } from "../core/fonts";
import { useApp } from "../state/store";
import { actions } from "../state/actions";
import { loadFonts, useSystemFonts } from "../state/systemFonts";
import { Popover } from "./Popover";

const ITEM_H = 32;

export function FontPicker({ value, onChange }: { value: string; onChange: (f: string) => void }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const builtin = BUILTIN_FONTS.find((b) => b.family === value);
  return (
    <div className="prop">
      <div className="prop-label">Font family</div>
      <div className="btn-row">
        {BUILTIN_FONTS.map((b) => (
          <button
            key={b.family}
            type="button"
            className={`opt-btn ${value === b.family ? "active" : ""}`}
            title={b.label}
            style={{ fontFamily: fontStack(b.family) }}
            onClick={() => onChange(b.family)}
          >
            Aa
          </button>
        ))}
      </div>
      <button
        ref={btn}
        type="button"
        className={`font-button ${open ? "active" : ""}`}
        onClick={() => setOpen((o) => !o)}
        title="All fonts on your system"
      >
        <span style={{ fontFamily: fontStack(value) }}>{builtin ? builtin.label : value}</span>
        <span className="chev">▾</span>
      </button>
      {open && (
        <Popover anchor={btn} onClose={() => setOpen(false)} className="font-popover">
          <FontList
            value={value}
            onPick={(f) => {
              onChange(f);
              actions.addRecentFont(f);
            }}
          />
        </Popover>
      )}
    </div>
  );
}

function FontList({ value, onPick }: { value: string; onPick: (f: string) => void }) {
  const { systemFonts, status } = useSystemFonts();
  const recent = useApp((s) => s.recentFonts);
  const [q, setQ] = useState("");
  const [scroll, setScroll] = useState(0);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadFonts(false);
    // Closing the list without picking restores the original font.
    return () => actions.endPreview();
  }, []);

  const preview = (family: string | undefined) => {
    if (family) actions.previewStyles({ fontFamily: family });
  };
  const moveActive = (n: number) => {
    setActive(n);
    scrollTo(n);
    preview(items[n]?.family);
  };

  const items = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const match = (f: string) => !ql || f.toLowerCase().includes(ql);
    const out: { family: string; label?: string; section?: string }[] = [];
    const seen = new Set<string>();
    const add = (family: string, section: string, label?: string) => {
      if (seen.has(family) || !match(label ?? family)) return;
      seen.add(family);
      out.push({ family, label, section });
    };
    for (const b of BUILTIN_FONTS) add(b.family, "Built-in", b.label);
    for (const f of recent) add(f, "Recent");
    for (const f of systemFonts) add(f, "System fonts");
    if (ql && !out.some((o) => o.family.toLowerCase() === ql))
      out.push({ family: q.trim(), label: `Use “${q.trim()}”`, section: "Custom" });
    return out;
  }, [q, systemFonts, recent]);

  const viewH = 300;
  const start = Math.max(0, Math.floor(scroll / ITEM_H) - 4);
  const end = Math.min(items.length, Math.ceil((scroll + viewH) / ITEM_H) + 4);

  const scrollTo = (i: number) => {
    const el = listRef.current;
    if (!el) return;
    if (i * ITEM_H < el.scrollTop) el.scrollTop = i * ITEM_H;
    else if ((i + 1) * ITEM_H > el.scrollTop + viewH) el.scrollTop = (i + 1) * ITEM_H - viewH;
  };

  return (
    <div className="font-list">
      <input
        autoFocus
        className="font-search"
        placeholder={`Search ${systemFonts.length ? `${systemFonts.length} ` : ""}fonts or type any font name…`}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            moveActive(Math.min(items.length - 1, active + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            moveActive(Math.max(0, active - 1));
          } else if (e.key === "Enter" && items[active]) onPick(items[active]!.family);
        }}
      />
      {supportsLocalFontAccess() && status !== "full" && (
        <button type="button" className="font-access" onClick={() => loadFonts(true)} disabled={status === "loading"}>
          {status === "loading"
            ? "Loading fonts…"
            : status === "denied"
              ? "Font access was blocked — click to retry"
              : "🔓 Show all fonts installed on this computer"}
        </button>
      )}
      {!supportsLocalFontAccess() && (
        <div className="font-note">
          This browser can’t list every font, so these were auto-detected. You can type the name of any installed font.
        </div>
      )}
      <div
        ref={listRef}
        className="font-scroll"
        style={{ height: viewH }}
        onScroll={(e) => setScroll((e.target as HTMLDivElement).scrollTop)}
        onMouseLeave={() => actions.endPreview()}
      >
        <div style={{ height: items.length * ITEM_H, position: "relative" }}>
          {items.slice(start, end).map((it, k) => {
            const i = start + k;
            const prev = items[i - 1];
            const showSection = !prev || prev.section !== it.section;
            return (
              <button
                key={it.section + it.family}
                type="button"
                className={`font-item ${it.family === value ? "selected" : ""} ${i === active ? "kb" : ""}`}
                style={{ top: i * ITEM_H, height: ITEM_H }}
                onMouseEnter={() => {
                  setActive(i);
                  preview(it.family);
                }}
                onClick={() => onPick(it.family)}
              >
                <span className="font-name" style={{ fontFamily: fontStack(it.family) }}>
                  {it.label ?? it.family}
                </span>
                {showSection && <span className="font-section">{it.section}</span>}
                {it.family === value && <span className="tick">✓</span>}
              </button>
            );
          })}
        </div>
      </div>
      <div className="font-foot">{items.length} fonts</div>
    </div>
  );
}
