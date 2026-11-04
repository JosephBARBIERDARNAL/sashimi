import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

export function Popover({
  anchor,
  onClose,
  children,
  placement = "right",
  className = "",
}: {
  anchor: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
  placement?: "right" | "bottom" | "top";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const a = anchor.current?.getBoundingClientRect();
    const el = ref.current;
    if (!a || !el) return;
    const r = el.getBoundingClientRect();
    let left = placement === "right" ? a.right + 10 : a.left;
    let top = placement === "right" ? a.top - 8 : placement === "bottom" ? a.bottom + 8 : a.top - r.height - 8;
    left = Math.max(8, Math.min(left, window.innerWidth - r.width - 8));
    top = Math.max(8, Math.min(top, window.innerHeight - r.height - 8));
    setPos({ left, top });
  }, [anchor, placement]);

  useEffect(() => {
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchor.current?.contains(t)) return;
      onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("keydown", key, true);
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("keydown", key, true);
    };
  }, [anchor, onClose]);

  return createPortal(
    <div
      ref={ref}
      className={`popover island ${className}`}
      style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.querySelector(".app") ?? document.body,
  );
}
