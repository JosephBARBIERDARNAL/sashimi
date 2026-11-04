import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { store, useApp, useElements } from "../state/store";
import { commitText } from "../interaction/textEditing";
import { LINE_HEIGHT, containerTextLines, containerTextWidth, measureTextEl } from "../core/text";
import { fontStack } from "../core/fonts";

/** In-place textarea for editing text elements and shape labels. */
export function TextEditor() {
  const id = useApp((s) => s.editingId);
  if (!id) return null;
  return <Editor key={id} id={id} />;
}

function Editor({ id }: { id: string }) {
  const els = useElements();
  const zoom = useApp((s) => s.zoom);
  const scrollX = useApp((s) => s.scrollX);
  const scrollY = useApp((s) => s.scrollY);
  const el = els.find((e) => e.id === id);
  const ref = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(el?.text ?? "");
  const done = useRef(false);

  useLayoutEffect(() => {
    const t = ref.current;
    if (!t) return;
    t.focus();
    t.select();
    // Re-assert focus after the current pointer event finishes.
    const raf = requestAnimationFrame(() => {
      if (document.activeElement !== t) t.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const latest = useRef(value);
  latest.current = value;

  // Commit on unmount only (e.g. when another element starts editing).
  useEffect(
    () => () => {
      if (!done.current) commitText(id, latest.current);
    },
    [id],
  );

  if (!el) return null;
  const size = (el.fontSize ?? 20) * zoom;
  const lh = size * LINE_HEIGHT;
  const finish = () => {
    if (done.current) return;
    done.current = true;
    commitText(id, latest.current);
  };

  const onChange = (text: string) => {
    setValue(text);
    if (el.type === "text") {
      store.elements = store.elements.map((e) => (e.id === id ? measureTextEl({ ...e, text }) : e));
      store.emit();
    }
  };

  let style: React.CSSProperties;
  const common: React.CSSProperties = {
    font: `${size}px ${fontStack(el.fontFamily)}`,
    lineHeight: LINE_HEIGHT,
    color: el.strokeColor === "transparent" ? "#1e1e1e" : el.strokeColor,
    textAlign: el.textAlign ?? "left",
    transform: `rotate(${el.angle}rad)`,
    opacity: el.opacity / 100,
  };
  if (el.type === "text") {
    const w = (el.width + 2) * zoom + size * 0.6;
    style = {
      ...common,
      left: (el.x + scrollX) * zoom,
      top: (el.y + scrollY) * zoom,
      width: w,
      height: Math.max(lh, el.height * zoom),
      whiteSpace: "pre",
      transformOrigin: `${(el.width * zoom) / 2}px ${(el.height * zoom) / 2}px`,
    };
  } else {
    const iw = containerTextWidth(el) * zoom;
    const lines = containerTextLines({ ...el, text: value || " " });
    const h = Math.max(1, lines.length) * lh;
    const cx = (el.x + el.width / 2 + scrollX) * zoom;
    const cy = (el.y + el.height / 2 + scrollY) * zoom;
    style = {
      ...common,
      left: cx - iw / 2,
      top: cy - h / 2,
      width: iw,
      height: h,
      whiteSpace: "pre-wrap",
      textAlign: el.textAlign ?? "center",
      transformOrigin: "center",
    };
  }

  return (
    <textarea
      ref={ref}
      className="text-editor"
      style={style}
      value={value}
      spellCheck={false}
      wrap={el.type === "text" ? "off" : "soft"}
      onChange={(e) => onChange(e.target.value)}
      onBlur={finish}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape" || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) {
          e.preventDefault();
          finish();
        }
        if (e.key === "Tab") {
          e.preventDefault();
          const t = e.currentTarget;
          const s = t.selectionStart;
          const v = `${t.value.slice(0, s)}    ${t.value.slice(t.selectionEnd)}`;
          onChange(v);
          requestAnimationFrame(() => t.setSelectionRange(s + 4, s + 4));
        }
      }}
    />
  );
}
