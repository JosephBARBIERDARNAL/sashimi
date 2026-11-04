import type { ReactNode } from "react";
import type { Arrowhead, El, ItemStyle, TextAlign, Tool } from "../core/types";
import { QUICK_BG, QUICK_STROKE } from "../core/colors";
import { useApp, useElements } from "../state/store";
import { actions } from "../state/actions";
import { canHoldText, isLinear } from "../core/geometry";
import { ColorPicker } from "./ColorPicker";
import { FontPicker } from "./FontPicker";
import { Icons, PropIcons } from "./Icons";

const Opt = <T extends string | number | boolean>({
  value,
  current,
  onClick,
  title,
  children,
}: {
  value: T;
  current: T;
  onClick: (v: T) => void;
  title: string;
  children: ReactNode;
}) => (
  <button type="button" className={`opt-btn ${value === current ? "active" : ""}`} title={title} onClick={() => onClick(value)}>
    {children}
  </button>
);

const Section = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="prop">
    <div className="prop-label">{label}</div>
    <div className="btn-row">{children}</div>
  </div>
);

const SHAPE_TOOLS: Tool[] = ["rectangle", "diamond", "ellipse"];
const ARROWHEADS: Arrowhead[] = ["none", "arrow", "triangle", "triangle_outline", "bar", "dot", "circle_outline"];
const FONT_SIZES = [
  { label: "S", size: 16 },
  { label: "M", size: 20 },
  { label: "L", size: 28 },
  { label: "XL", size: 36 },
];

export function PropertiesPanel() {
  const tool = useApp((s) => s.tool);
  const selectedIds = useApp((s) => s.selectedIds);
  const item = useApp((s) => s.currentItem);
  const editingId = useApp((s) => s.editingId);
  const elements = useElements();
  const selected = elements.filter((e) => selectedIds[e.id]);

  const drawing = !["selection", "hand", "eraser", "image"].includes(tool);
  if (!selected.length && !drawing) return null;

  const types = new Set<string>(selected.length ? selected.map((e) => e.type) : [tool]);
  const has = (...t: string[]) => t.some((x) => types.has(x));
  const first: Partial<El> & ItemStyle = selected.length ? { ...item, ...stripUndefined(selected[0]!) } : item;

  const hasShape = has(...SHAPE_TOOLS);
  const hasLinear = has("arrow", "line");
  const hasText =
    has("text") ||
    selected.some((e) => canHoldText(e) && e.text) ||
    (editingId != null && selected.some(canHoldText)) ||
    (!selected.length && SHAPE_TOOLS.includes(tool));
  const onlyImages = selected.length > 0 && selected.every((e) => e.type === "image");
  const set = actions.setStyle;

  return (
    <div className="properties island" onPointerDown={(e) => e.stopPropagation()}>
      {!onlyImages && (
        <ColorPicker
          label="Stroke"
          value={first.strokeColor}
          quick={QUICK_STROKE}
          onChange={(c) => set("strokeColor", c)}
          allowTransparent
        />
      )}
      {(hasShape || has("image")) && (
        <ColorPicker
          label="Background"
          value={first.backgroundColor}
          quick={QUICK_BG}
          onChange={(c) => set("backgroundColor", c)}
          allowTransparent
        />
      )}
      {hasShape && first.backgroundColor !== "transparent" && (
        <Section label="Fill">
          {(["hachure", "cross-hatch", "solid", "zigzag", "dots"] as const).map((f) => (
            <Opt key={f} value={f} current={first.fillStyle} onClick={(v) => set("fillStyle", v)} title={f}>
              {PropIcons.fill(f)}
            </Opt>
          ))}
        </Section>
      )}
      {(hasShape || hasLinear || has("freedraw")) && (
        <Section label="Stroke width">
          {[1, 2, 4, 6].map((w) => (
            <Opt key={w} value={w} current={first.strokeWidth} onClick={(v) => set("strokeWidth", v)} title={`${w}px`}>
              {PropIcons.strokeWidth(Math.min(w, 5))}
            </Opt>
          ))}
        </Section>
      )}
      {(hasShape || hasLinear) && (
        <>
          <Section label="Stroke style">
            <Opt value="solid" current={first.strokeStyle} onClick={(v) => set("strokeStyle", v)} title="Solid">
              {PropIcons.strokeStyle(undefined)}
            </Opt>
            <Opt value="dashed" current={first.strokeStyle} onClick={(v) => set("strokeStyle", v)} title="Dashed">
              {PropIcons.strokeStyle("5 4")}
            </Opt>
            <Opt value="dotted" current={first.strokeStyle} onClick={(v) => set("strokeStyle", v)} title="Dotted">
              {PropIcons.strokeStyle("0.5 4")}
            </Opt>
          </Section>
          <Section label="Sloppiness">
            {[
              [0, "Architect"],
              [1, "Artist"],
              [2, "Cartoonist"],
            ].map(([r, t]) => (
              <Opt key={r} value={r as number} current={first.roughness} onClick={(v) => set("roughness", v)} title={t as string}>
                {PropIcons.sloppiness(r as number)}
              </Opt>
            ))}
          </Section>
        </>
      )}
      {(has("rectangle", "diamond") || hasLinear) && (
        <Section label={hasLinear && !hasShape ? "Line type" : "Edges"}>
          <Opt
            value={false}
            current={first.roundness}
            onClick={(v) => set("roundness", v)}
            title={hasLinear && !hasShape ? "Straight" : "Sharp"}
          >
            {PropIcons.edges(false)}
          </Opt>
          <Opt
            value={true}
            current={first.roundness}
            onClick={(v) => set("roundness", v)}
            title={hasLinear && !hasShape ? "Curved" : "Round"}
          >
            {PropIcons.edges(true)}
          </Opt>
        </Section>
      )}
      {has("arrow") && (
        <>
          <ArrowheadRow label="Start arrowhead" value={first.startArrowhead ?? "none"} flip onChange={(v) => set("startArrowhead", v)} />
          <ArrowheadRow label="End arrowhead" value={first.endArrowhead ?? "arrow"} onChange={(v) => set("endArrowhead", v)} />
        </>
      )}
      {hasText && (
        <>
          <FontPicker value={first.fontFamily ?? item.fontFamily} onChange={(f) => set("fontFamily", f)} />
          <div className="prop">
            <div className="prop-label">Font size</div>
            <div className="btn-row">
              {FONT_SIZES.map((f) => (
                <Opt
                  key={f.size}
                  value={f.size}
                  current={Math.round(first.fontSize ?? 20)}
                  onClick={(v) => set("fontSize", v)}
                  title={`${f.size}px`}
                >
                  <span className="txt-opt">{f.label}</span>
                </Opt>
              ))}
              <input
                className="num-input"
                type="number"
                min={4}
                max={400}
                value={Math.round(first.fontSize ?? 20)}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (v >= 1 && v <= 1000) set("fontSize", v);
                }}
                title="Custom size"
              />
            </div>
          </div>
          <Section label="Text align">
            {(["left", "center", "right"] as TextAlign[]).map((a) => (
              <Opt key={a} value={a} current={first.textAlign ?? "left"} onClick={(v) => set("textAlign", v)} title={a}>
                {a === "left" ? Icons.textLeft : a === "center" ? Icons.textCenter : Icons.textRight}
              </Opt>
            ))}
          </Section>
        </>
      )}
      <div className="prop">
        <div className="prop-label">Opacity</div>
        <div className="range-row">
          <input type="range" min={0} max={100} step={5} value={first.opacity} onChange={(e) => set("opacity", Number(e.target.value))} />
          <span>{first.opacity}</span>
        </div>
      </div>
      {selected.length > 0 && (
        <>
          <Section label="Layers">
            <button type="button" className="opt-btn" title="Send to back (Ctrl+Shift+[)" onClick={() => actions.zOrder("back")}>
              {Icons.back}
            </button>
            <button type="button" className="opt-btn" title="Send backward (Ctrl+[)" onClick={() => actions.zOrder("backward")}>
              {Icons.backward}
            </button>
            <button type="button" className="opt-btn" title="Bring forward (Ctrl+])" onClick={() => actions.zOrder("forward")}>
              {Icons.forward}
            </button>
            <button type="button" className="opt-btn" title="Bring to front (Ctrl+Shift+])" onClick={() => actions.zOrder("front")}>
              {Icons.front}
            </button>
          </Section>
          {selected.length > 1 && (
            <Section label="Align">
              {(
                [
                  ["left", Icons.alignLeft],
                  ["hcenter", Icons.alignHCenter],
                  ["right", Icons.alignRight],
                  ["top", Icons.alignTop],
                  ["vcenter", Icons.alignVCenter],
                  ["bottom", Icons.alignBottom],
                ] as const
              ).map(([k, icon]) => (
                <button key={k} type="button" className="opt-btn" title={`Align ${k}`} onClick={() => actions.align(k)}>
                  {icon}
                </button>
              ))}
            </Section>
          )}
          <Section label="Actions">
            <button type="button" className="opt-btn" title="Duplicate (Ctrl+D)" onClick={() => actions.duplicateSelected()}>
              {Icons.copy}
            </button>
            <button type="button" className="opt-btn" title="Delete (Del)" onClick={() => actions.deleteSelected()}>
              {Icons.trash}
            </button>
            {selected.length > 1 && (
              <button type="button" className="opt-btn" title="Group (Ctrl+G)" onClick={() => actions.group()}>
                {Icons.group}
              </button>
            )}
            {selected.some((e) => e.groupIds.length) && (
              <button type="button" className="opt-btn" title="Ungroup (Ctrl+Shift+G)" onClick={() => actions.ungroup()}>
                {Icons.ungroup}
              </button>
            )}
            <button type="button" className="opt-btn" title="Lock / unlock (Ctrl+Shift+L)" onClick={() => actions.toggleLock()}>
              {selected.every((e) => e.locked) ? Icons.unlock : Icons.lock}
            </button>
          </Section>
        </>
      )}
      {selected.some(isLinear) && selected.length === 1 && (
        <div className="hint-small">Drag the dots to edit points · drag a midpoint to add one</div>
      )}
    </div>
  );
}

function ArrowheadRow({
  label,
  value,
  onChange,
  flip,
}: {
  label: string;
  value: Arrowhead;
  onChange: (v: Arrowhead) => void;
  flip?: boolean;
}) {
  return (
    <Section label={label}>
      {ARROWHEADS.map((h) => (
        <Opt key={h} value={h} current={value} onClick={onChange} title={h.replace("_", " ")}>
          {PropIcons.arrowhead(h === "none" ? "none" : h, flip)}
        </Opt>
      ))}
    </Section>
  );
}

const stripUndefined = (el: El) => {
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(el)) if (v !== undefined) o[k] = v;
  return o as Partial<El>;
};
