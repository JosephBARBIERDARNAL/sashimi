import { useEffect, useRef } from "react";
import { hitTest } from "../core/geometry";
import { store, useApp } from "../state/store";
import { expandGroups, toRecord } from "../state/elements";
import { renderScene } from "../render/scene";
import { setImageLoadCallback } from "../render/images";
import { toScene } from "../interaction/helpers";
import { getMultiId } from "../interaction/linear";
import { onDoubleClick, onPointerDown, onPointerMove, onPointerUp, onWheel } from "../interaction/pointer";

export function Canvas({ onContextMenu }: { onContextMenu: (x: number, y: number, onElement: boolean) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const theme = useApp((s) => s.theme);

  useEffect(() => {
    const canvas = ref.current!;
    let frame = 0;
    const draw = () => {
      frame = 0;
      renderScene(canvas, store.elements, store.state, { multiPointId: getMultiId() });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      draw();
    };
    resize();
    setImageLoadCallback(schedule);
    const unsub = store.subscribe(schedule);
    window.addEventListener("resize", resize);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    document.fonts?.addEventListener?.("loadingdone", schedule);
    return () => {
      unsub();
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("wheel", onWheel);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className={`canvas ${theme === "dark" ? "dark" : ""}`}
      onPointerDown={(e) => {
        if (e.button === 0 || e.button === 1) e.currentTarget.setPointerCapture(e.pointerId);
        if (e.button === 1) e.preventDefault();
        onPointerDown(e);
      }}
      onPointerMove={(e) => onPointerMove(e, e.currentTarget)}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
      onContextMenu={(e) => {
        e.preventDefault();
        const p = toScene(e.clientX, e.clientY);
        const z = store.state.zoom;
        let hit = null;
        for (let i = store.elements.length - 1; i >= 0; i--) {
          if (hitTest(store.elements[i]!, p, 6 / z)) {
            hit = store.elements[i]!;
            break;
          }
        }
        if (hit && !store.state.selectedIds[hit.id]) {
          store.setState({ selectedIds: toRecord(expandGroups(store.elements, new Set([hit.id]))) });
        }
        if (!hit) store.setState({ selectedIds: {} });
        onContextMenu(e.clientX, e.clientY, !!hit);
      }}
    />
  );
}
