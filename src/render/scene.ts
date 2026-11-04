import rough from "roughjs";
import type { AppState, El } from "../core/types";
import { getBounds } from "../core/geometry";
import { GRID_SIZE, SELECT_COLOR } from "../core/constants";
import { renderElement } from "./element";
import { getFrame } from "./handles";

/** Full-viewport render: background, grid, elements and interactive overlays. */
const drawGrid = (ctx: CanvasRenderingContext2D, s: AppState, w: number, h: number, gridSize: number) => {
  const step = gridSize * s.zoom;
  if (step < 6) return;
  ctx.save();
  ctx.lineWidth = 1;
  const offX = (s.scrollX * s.zoom) % step;
  const offY = (s.scrollY * s.zoom) % step;
  for (let _i = 0, x = offX; x < w; x += step, _i++) {
    const major = Math.round((x - s.scrollX * s.zoom) / step) % 5 === 0;
    ctx.strokeStyle = major ? "rgba(0,0,0,0.09)" : "rgba(0,0,0,0.045)";
    ctx.beginPath();
    ctx.moveTo(Math.round(x) + 0.5, 0);
    ctx.lineTo(Math.round(x) + 0.5, h);
    ctx.stroke();
  }
  for (let y = offY; y < h; y += step) {
    const major = Math.round((y - s.scrollY * s.zoom) / step) % 5 === 0;
    ctx.strokeStyle = major ? "rgba(0,0,0,0.09)" : "rgba(0,0,0,0.045)";
    ctx.beginPath();
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(w, Math.round(y) + 0.5);
    ctx.stroke();
  }
  ctx.restore();
};

export const renderScene = (canvas: HTMLCanvasElement, elements: El[], s: AppState, extra: { multiPointId?: string | null } = {}) => {
  const ctx = canvas.getContext("2d")!;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.width / dpr,
    h = canvas.height / dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = s.viewBackgroundColor;
  ctx.fillRect(0, 0, w, h);
  if (s.grid) drawGrid(ctx, s, w, h, GRID_SIZE);

  ctx.scale(s.zoom, s.zoom);
  ctx.translate(s.scrollX, s.scrollY);
  const rc = rough.canvas(canvas);
  const vx0 = -s.scrollX,
    vy0 = -s.scrollY,
    vx1 = vx0 + w / s.zoom,
    vy1 = vy0 + h / s.zoom;

  for (const el of elements) {
    const [a, b, c, d] = getBounds(el);
    const m = el.strokeWidth * 4 + 20;
    if (c < vx0 - m || a > vx1 + m || d < vy0 - m || b > vy1 + m) continue;
    renderElement(ctx, rc, el, { faded: !!s.erasing[el.id], hideText: s.editingId === el.id });
  }

  // ---- overlays (scene coords) ----
  const lw = 1 / s.zoom;
  if (s.bindHintId) {
    const t = elements.find((e) => e.id === s.bindHintId);
    if (t) {
      const [a, b, c, d] = getBounds(t);
      ctx.save();
      ctx.strokeStyle = SELECT_COLOR;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 4 * lw;
      const p = 6 * lw;
      ctx.strokeRect(a - p, b - p, c - a + 2 * p, d - b + 2 * p);
      ctx.restore();
    }
  }

  const selected = elements.filter((e) => s.selectedIds[e.id]);
  if (selected.length && !s.editingId && !extra.multiPointId) {
    ctx.save();
    ctx.strokeStyle = SELECT_COLOR;
    ctx.lineWidth = lw;
    if (selected.length > 1) {
      ctx.setLineDash([4 * lw, 4 * lw]);
      for (const el of selected) {
        const [a, b, c, d] = getBounds(el);
        ctx.strokeRect(a, b, c - a, d - b);
      }
      ctx.setLineDash([]);
    }
    const frame = getFrame(selected, s.zoom);
    if (frame) {
      if (frame.corners.length) {
        ctx.beginPath();
        frame.corners.forEach((p, i) => {
          if (i) ctx.lineTo(p[0], p[1]);
          else ctx.moveTo(p[0], p[1]);
        });
        ctx.closePath();
        if (selected.some((e) => e.locked)) ctx.setLineDash([6 * lw, 4 * lw]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      const angle = selected.length === 1 ? selected[0]!.angle : 0;
      for (const hd of frame.handles) {
        ctx.fillStyle = "#fff";
        ctx.lineWidth = lw;
        if (hd.kind === "resize") {
          const sz = 8 * lw;
          ctx.save();
          ctx.translate(hd.p[0], hd.p[1]);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.roundRect(-sz / 2, -sz / 2, sz, sz, 2 * lw);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        } else {
          const r = (hd.kind === "point" ? 5 : hd.kind === "midpoint" ? 3.5 : 4.5) * lw;
          ctx.beginPath();
          ctx.arc(hd.p[0], hd.p[1], r, 0, Math.PI * 2);
          if (hd.kind === "midpoint") ctx.fillStyle = "rgba(105,101,219,0.35)";
          ctx.fill();
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  if (s.selectionBox) {
    const b = s.selectionBox;
    ctx.save();
    ctx.fillStyle = "rgba(105,101,219,0.08)";
    ctx.strokeStyle = SELECT_COLOR;
    ctx.lineWidth = lw;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.restore();
  }
};
