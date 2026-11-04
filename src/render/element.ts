import type { RoughCanvas } from "roughjs/bin/canvas";
import type { El } from "../core/types";
import { center } from "../core/geometry";
import { LINE_HEIGHT, containerTextLines, containerTextWidth, fontString } from "../core/text";
import { getShape } from "./shapes";
import { getImage } from "./images";

/** Draw a single element onto a 2D canvas context (scene coordinates). */
const drawText = (ctx: CanvasRenderingContext2D, el: El, lines: string[], areaX: number, areaW: number, top: number) => {
  const size = el.fontSize ?? 20;
  ctx.font = fontString(size, el.fontFamily);
  ctx.fillStyle = el.strokeColor;
  ctx.textBaseline = "middle";
  const align = el.textAlign ?? "left";
  ctx.textAlign = align;
  const x = align === "left" ? areaX : align === "center" ? areaX + areaW / 2 : areaX + areaW;
  const lh = size * LINE_HEIGHT;
  lines.forEach((line, i) => {
    ctx.fillText(line, x, top + i * lh + lh / 2);
  });
};

export const renderElement = (
  ctx: CanvasRenderingContext2D,
  rc: RoughCanvas,
  el: El,
  opts: { faded?: boolean; hideText?: boolean } = {},
) => {
  const [cx, cy] = center(el);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(el.angle);
  ctx.translate(-el.width / 2, -el.height / 2);
  ctx.globalAlpha = (el.opacity / 100) * (opts.faded ? 0.25 : 1);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (el.type === "text") {
    if (!opts.hideText) drawText(ctx, el, (el.text ?? "").split("\n"), 0, el.width, 0);
  } else if (el.type === "image") {
    const img = el.src ? getImage(el.src) : null;
    if (img?.complete && img.naturalWidth) ctx.drawImage(img, 0, 0, el.width, el.height);
    else {
      ctx.fillStyle = "rgba(128,128,128,0.15)";
      ctx.fillRect(0, 0, el.width, el.height);
    }
  } else if (el.type === "freedraw") {
    const s = getShape(el);
    if (s.path2d) {
      ctx.fillStyle = el.strokeColor;
      ctx.fill(s.path2d);
    }
  } else {
    for (const d of getShape(el).drawables) rc.draw(d);
    if (el.text && !opts.hideText) {
      const lines = containerTextLines(el);
      const size = el.fontSize ?? 20;
      const total = lines.length * size * LINE_HEIGHT;
      const iw = containerTextWidth(el);
      drawText(ctx, el, lines, (el.width - iw) / 2, iw, el.height / 2 - total / 2);
    }
  }
  ctx.restore();
};
