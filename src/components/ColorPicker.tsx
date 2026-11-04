import { useRef, useState, useEffect } from "react";
import { GRAYSCALE, PALETTE, isValidColor, normalizeHex, toHex6 } from "../core/colors";
import { store, useApp } from "../state/store";
import { actions } from "../state/actions";
import { Popover } from "./Popover";
import { Icons } from "./Icons";

declare global {
  interface Window {
    EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> };
  }
}

const Swatch = ({
  color,
  active,
  onClick,
  title,
  size,
}: {
  color: string;
  active?: boolean;
  onClick: () => void;
  title?: string;
  size?: number;
}) => (
  <button
    type="button"
    className={`swatch ${active ? "active" : ""} ${color === "transparent" ? "transparent" : ""}`}
    style={{ background: color === "transparent" ? undefined : color, width: size, height: size }}
    title={title ?? color}
    onClick={onClick}
  />
);

const alphaOf = (c: string) => (/^#[0-9a-f]{8}$/i.test(c) ? parseInt(c.slice(7, 9), 16) / 255 : 1);

export function ColorPicker({
  label,
  value,
  quick,
  onChange,
  allowTransparent,
}: {
  label: string;
  value: string;
  quick: string[];
  onChange: (c: string) => void;
  allowTransparent?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const pick = (c: string) => {
    onChange(c);
    actions.addRecentColor(c);
  };
  return (
    <div className="prop">
      <div className="prop-label">{label}</div>
      <div className="color-row">
        {quick.map((c) => (
          <Swatch key={c} color={c} active={c.toLowerCase() === value.toLowerCase()} onClick={() => pick(c)} />
        ))}
        <div className="divider-v" />
        <button
          ref={btn}
          type="button"
          className={`swatch big ${value === "transparent" ? "transparent" : ""} ${open ? "active" : ""}`}
          style={{ background: value === "transparent" ? undefined : value }}
          title="More colors"
          onClick={() => setOpen((o) => !o)}
        />
      </div>
      {open && (
        <Popover anchor={btn} onClose={() => setOpen(false)} className="color-popover">
          <ColorPanel value={value} onPick={pick} onLive={onChange} allowTransparent={allowTransparent} />
        </Popover>
      )}
    </div>
  );
}

export function ColorPanel({
  value,
  onPick,
  onLive,
  allowTransparent,
}: {
  value: string;
  onPick: (c: string) => void;
  onLive: (c: string) => void;
  allowTransparent?: boolean;
}) {
  const recent = useApp((s) => s.recentColors);
  const saved = useApp((s) => s.savedColors);
  const [hex, setHex] = useState(value);
  useEffect(() => setHex(value), [value]);
  const lower = value.toLowerCase();
  const alpha = alphaOf(value);

  const setAlpha = (a: number) => {
    if (value === "transparent") return;
    const base = toHex6(value);
    const c =
      a >= 1
        ? base
        : base +
          Math.round(a * 255)
            .toString(16)
            .padStart(2, "0");
    onLive(c);
  };

  const commitHex = () => {
    const c = normalizeHex(hex);
    if (isValidColor(c)) onPick(c);
    else setHex(value);
  };

  return (
    <div className="color-panel">
      <div className="color-tools">
        <span className="hex-prefix">#</span>
        <input
          className="hex-input"
          value={hex.replace(/^#/, "")}
          spellCheck={false}
          onChange={(e) => setHex(e.target.value)}
          onBlur={commitHex}
          onKeyDown={(e) => e.key === "Enter" && commitHex()}
          aria-label="Hex color"
        />
        <label className="native-picker" title="Custom color">
          <input
            type="color"
            value={toHex6(value === "transparent" ? "#ffffff" : value)}
            onInput={(e) => onLive((e.target as HTMLInputElement).value)}
            onChange={(e) => onPick(e.target.value)}
          />
          <span className="rainbow" />
        </label>
        {window.EyeDropper && (
          <button
            type="button"
            className="icon-btn"
            title="Pick color from screen"
            onClick={async () => {
              try {
                const r = await new window.EyeDropper!().open();
                onPick(r.sRGBHex);
              } catch {
                /* cancelled */
              }
            }}
          >
            {Icons.eyedropper}
          </button>
        )}
        {allowTransparent && (
          <Swatch color="transparent" active={lower === "transparent"} onClick={() => onPick("transparent")} title="Transparent" />
        )}
      </div>
      <div className="alpha-row" title="Color transparency">
        <span>Alpha</span>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(alpha * 100)}
          disabled={value === "transparent"}
          onChange={(e) => setAlpha(Number(e.target.value) / 100)}
          onPointerUp={() => actions.addRecentColor(store.state.currentItem.strokeColor === value ? value : value)}
          style={{ ["--c" as string]: value === "transparent" ? "#000" : toHex6(value) }}
        />
        <span className="alpha-val">{Math.round(alpha * 100)}%</span>
      </div>
      {recent.length > 0 && (
        <>
          <div className="section-title">Recent</div>
          <div className="swatch-wrap">
            {recent.map((c) => (
              <Swatch key={c} color={c} active={c.toLowerCase() === lower} onClick={() => onPick(c)} />
            ))}
          </div>
        </>
      )}
      <div className="section-title">
        Saved
        <button
          type="button"
          className="mini-btn"
          title="Save current color"
          onClick={() => {
            if (value === "transparent" || saved.includes(value)) return;
            store.setState({ savedColors: [...saved, value].slice(-24) });
          }}
        >
          + Save current
        </button>
      </div>
      <div className="swatch-wrap">
        {saved.length === 0 && <span className="muted">No saved colors yet</span>}
        {saved.map((c) => (
          <span
            key={c}
            onContextMenu={(e) => {
              e.preventDefault();
              store.setState({ savedColors: saved.filter((x) => x !== c) });
            }}
          >
            <Swatch color={c} active={c.toLowerCase() === lower} onClick={() => onPick(c)} title={`${c} (right-click to remove)`} />
          </span>
        ))}
      </div>
      <div className="section-title">Palette</div>
      <div className="palette-grid" style={{ gridTemplateColumns: `repeat(${PALETTE.length}, 1fr)` }}>
        {PALETTE[0]!.shades.map((_, row) =>
          PALETTE.map((hue) => {
            const c = hue.shades[row]!;
            return (
              <Swatch
                key={hue.name + row}
                color={c}
                active={c === lower}
                onClick={() => onPick(c)}
                title={`${hue.name} ${row + 1} · ${c}`}
              />
            );
          }),
        )}
      </div>
      <div className="swatch-wrap gray-row">
        {GRAYSCALE.map((c) => (
          <Swatch key={c} color={c} active={c === lower} onClick={() => onPick(c)} />
        ))}
      </div>
    </div>
  );
}
