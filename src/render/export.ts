import rough from "roughjs";
import type { El } from "../core/types";
import { center, getCommonBounds } from "../core/geometry";
import { LINE_HEIGHT, containerTextLines, containerTextWidth } from "../core/text";
import { fontStack } from "../core/fonts";
import { getShape } from "./shapes";
import { renderElement } from "./element";

/** PNG / SVG export of a set of elements. */
export const exportToCanvas = (elements: El[], opts: { background: string | null; scale: number; padding?: number }) => {
  const pad = opts.padding ?? 20;
  const [minX, minY, maxX, maxY] = getCommonBounds(elements);
  const w = Math.ceil(maxX - minX + pad * 2),
    h = Math.ceil(maxY - minY + pad * 2);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * opts.scale));
  canvas.height = Math.max(1, Math.round(h * opts.scale));
  const ctx = canvas.getContext("2d")!;
  ctx.scale(opts.scale, opts.scale);
  if (opts.background) {
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.translate(pad - minX, pad - minY);
  const rc = rough.canvas(canvas);
  for (const el of elements) renderElement(ctx, rc, el);
  return canvas;
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const exportToSvg = (elements: El[], opts: { background: string | null; padding?: number }): string => {
  const pad = opts.padding ?? 20;
  const [minX, minY, maxX, maxY] = getCommonBounds(elements);
  const w = Math.ceil(maxX - minX + pad * 2),
    h = Math.ceil(maxY - minY + pad * 2);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("width", String(w));
  svg.setAttribute("height", String(h));
  const rs = rough.svg(svg);
  if (opts.background) {
    const bg = document.createElementNS(svg.namespaceURI, "rect");
    bg.setAttribute("width", "100%");
    bg.setAttribute("height", "100%");
    bg.setAttribute("fill", opts.background);
    svg.appendChild(bg);
  }
  const textSvg = (el: El, lines: string[], areaX: number, areaW: number, top: number) => {
    const size = el.fontSize ?? 20;
    const lh = size * LINE_HEIGHT;
    const align = el.textAlign ?? "left";
    const x = align === "left" ? areaX : align === "center" ? areaX + areaW / 2 : areaX + areaW;
    const anchor = align === "left" ? "start" : align === "center" ? "middle" : "end";
    return lines
      .map(
        (line, i) =>
          `<text x="${x}" y="${top + i * lh + lh / 2}" font-family="${esc(fontStack(el.fontFamily))}" font-size="${size}" fill="${esc(el.strokeColor)}" text-anchor="${anchor}" dominant-baseline="central" style="white-space:pre">${esc(line)}</text>`,
      )
      .join("");
  };
  for (const el of elements) {
    const [cx, cy] = center(el);
    const g = document.createElementNS(svg.namespaceURI, "g");
    const tx = cx - minX + pad,
      ty = cy - minY + pad;
    g.setAttribute(
      "transform",
      `translate(${tx} ${ty}) rotate(${(el.angle * 180) / Math.PI}) translate(${-el.width / 2} ${-el.height / 2})`,
    );
    g.setAttribute("opacity", String(el.opacity / 100));
    g.setAttribute("stroke-linecap", "round");
    if (el.type === "text") {
      g.innerHTML = textSvg(el, (el.text ?? "").split("\n"), 0, el.width, 0);
    } else if (el.type === "image") {
      g.innerHTML = `<image href="${esc(el.src ?? "")}" width="${el.width}" height="${el.height}" preserveAspectRatio="none"/>`;
    } else if (el.type === "freedraw") {
      g.innerHTML = `<path d="${getShape(el).path ?? ""}" fill="${esc(el.strokeColor)}"/>`;
    } else {
      for (const d of getShape(el).drawables) g.appendChild(rs.draw(d));
      if (el.text) {
        const lines = containerTextLines(el);
        const size = el.fontSize ?? 20;
        const total = lines.length * size * LINE_HEIGHT;
        const iw = containerTextWidth(el);
        g.insertAdjacentHTML("beforeend", textSvg(el, lines, (el.width - iw) / 2, iw, el.height / 2 - total / 2));
      }
    }
    svg.appendChild(g);
  }
  return new XMLSerializer().serializeToString(svg);
};
