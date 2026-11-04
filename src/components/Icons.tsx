import type { ReactNode } from "react";

const I = ({ children, size = 18, fill = "none" }: { children: ReactNode; size?: number; fill?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    {children}
  </svg>
);

export const Icons = {
  lock: (
    <I>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </I>
  ),
  unlock: (
    <I>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 7.5-2" />
    </I>
  ),
  hand: (
    <I>
      <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12" />
      <path d="M11 11.5v-8a1.5 1.5 0 0 1 3 0v8.5" />
      <path d="M14 5.5a1.5 1.5 0 0 1 3 0V12" />
      <path d="M17 7.5a1.5 1.5 0 0 1 3 0V16a6 6 0 0 1-6 6h-2a6 6 0 0 1-5-2.7l-3.3-5a1.5 1.5 0 0 1 2.4-1.8L8 15" />
    </I>
  ),
  selection: (
    <I>
      <path d="M6 3l12 9-5.5 1L16 20l-2.5 1-3-7L6 17z" />
    </I>
  ),
  rectangle: (
    <I>
      <rect x="4" y="5" width="16" height="14" rx="2" />
    </I>
  ),
  diamond: (
    <I>
      <path d="M12 3.5 20.5 12 12 20.5 3.5 12z" />
    </I>
  ),
  ellipse: (
    <I>
      <circle cx="12" cy="12" r="8.5" />
    </I>
  ),
  arrow: (
    <I>
      <path d="M5 19 19 5M10 5h9v9" />
    </I>
  ),
  line: (
    <I>
      <path d="M5 19 19 5" />
    </I>
  ),
  freedraw: (
    <I>
      <path d="M4 20l4-1L19 8a2.1 2.1 0 0 0-3-3L5 16z" />
      <path d="M14 7l3 3" />
    </I>
  ),
  text: (
    <I>
      <path d="M5 7V5h14v2M12 5v14M9 19h6" />
    </I>
  ),
  image: (
    <I>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m20 16-5-5-8 8.5" />
    </I>
  ),
  eraser: (
    <I>
      <path d="M19 20H9l-5-5a1.5 1.5 0 0 1 0-2.1L13 4a1.5 1.5 0 0 1 2.1 0l5 5a1.5 1.5 0 0 1 0 2.1L12 19" />
      <path d="m8 9 7 7" />
    </I>
  ),
  menu: (
    <I>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </I>
  ),
  undo: (
    <I>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </I>
  ),
  redo: (
    <I>
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
    </I>
  ),
  trash: (
    <I>
      <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </I>
  ),
  copy: (
    <I>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </I>
  ),
  help: (
    <I>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01" />
    </I>
  ),
  sun: (
    <I>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </I>
  ),
  moon: (
    <I>
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
    </I>
  ),
  open: (
    <I>
      <path d="M4 19V6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v2" />
      <path d="M4 19l3-8h15l-3 8z" />
    </I>
  ),
  save: (
    <I>
      <path d="M5 4h11l4 4v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
      <path d="M8 4v5h7V4M8 20v-6h8v6" />
    </I>
  ),
  export: (
    <I>
      <path d="M12 15V3M7 8l5-5 5 5" />
      <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </I>
  ),
  grid: (
    <I>
      <path d="M4 9h16M4 15h16M9 4v16M15 4v16" />
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </I>
  ),
  eyedropper: (
    <I>
      <path d="m14 7 3 3M5 19l2-.5 9.5-9.5-2.5-2.5L4.5 16 4 18z" />
      <path d="M16 5l1.5-1.5a2.1 2.1 0 0 1 3 3L19 8" />
    </I>
  ),
  plus: (
    <I>
      <path d="M12 5v14M5 12h14" />
    </I>
  ),
  minus: (
    <I>
      <path d="M5 12h14" />
    </I>
  ),
  group: (
    <I>
      <rect x="3" y="3" width="8" height="8" rx="1" strokeDasharray="2 2" />
      <rect x="13" y="13" width="8" height="8" rx="1" />
      <rect x="3" y="13" width="8" height="8" rx="1" />
    </I>
  ),
  ungroup: (
    <I>
      <rect x="3" y="3" width="8" height="8" rx="1" />
      <rect x="13" y="13" width="8" height="8" rx="1" />
    </I>
  ),
  front: (
    <I>
      <path d="M12 4v12M7 9l5-5 5 5M5 20h14" />
    </I>
  ),
  forward: (
    <I>
      <path d="M12 6v12M7 11l5-5 5 5" />
    </I>
  ),
  backward: (
    <I>
      <path d="M12 18V6M7 13l5 5 5-5" />
    </I>
  ),
  back: (
    <I>
      <path d="M12 20V8M7 15l5 5 5-5M5 4h19" />
    </I>
  ),
  alignLeft: (
    <I>
      <path d="M4 4v16M8 8h10M8 16h6" />
    </I>
  ),
  alignHCenter: (
    <I>
      <path d="M12 4v16M6 8h12M8 16h8" />
    </I>
  ),
  alignRight: (
    <I>
      <path d="M20 4v16M6 8h10M10 16h6" />
    </I>
  ),
  alignTop: (
    <I>
      <path d="M4 4h16M8 8v10M16 8v6" />
    </I>
  ),
  alignVCenter: (
    <I>
      <path d="M4 12h16M8 6v12M16 8v8" />
    </I>
  ),
  alignBottom: (
    <I>
      <path d="M4 20h16M8 6v10M16 10v6" />
    </I>
  ),
  textLeft: (
    <I>
      <path d="M4 6h16M4 12h10M4 18h13" />
    </I>
  ),
  textCenter: (
    <I>
      <path d="M4 6h16M7 12h10M5.5 18h13" />
    </I>
  ),
  textRight: (
    <I>
      <path d="M4 6h16M10 12h10M7 18h13" />
    </I>
  ),
  link: (
    <I>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </I>
  ),
  github: (
    <I>
      <path d="M9 19c-4 1.5-4-2-6-2.5M15 21v-3.5a3 3 0 0 0-1-2.3c3-.3 6-1.5 6-6.5a5 5 0 0 0-1.4-3.5 4.7 4.7 0 0 0-.1-3.5s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.4 1.4 5.3 1.7 5.3 1.7a4.7 4.7 0 0 0-.1 3.5A5 5 0 0 0 3.8 8.7c0 5 3 6.2 6 6.5a3 3 0 0 0-1 2.3V21" />
    </I>
  ),
  font: (
    <I>
      <path d="M4 20 10 4h1l6 16M6.5 14h8" />
      <path d="M17 12h4M19 10v8" />
    </I>
  ),
  check: (
    <I>
      <path d="m5 12 5 5L20 7" />
    </I>
  ),
  reset: (
    <I>
      <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12" />
    </I>
  ),
};

/** Small previews used in the properties panel. */
export const PropIcons = {
  strokeWidth: (w: number) => (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <path d="M3 10h14" stroke="currentColor" strokeWidth={w} strokeLinecap="round" />
    </svg>
  ),
  strokeStyle: (d: string | undefined) => (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <path d="M2 10h16" stroke="currentColor" strokeWidth={2} strokeDasharray={d} strokeLinecap="round" />
    </svg>
  ),
  sloppiness: (r: number) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round">
      {r === 0 && <path d="M2 14c4-6 12-6 16-6" />}
      {r === 1 && <path d="M2 14c3-6 7-5 9-6s5-1 7-1M3 15c4-6 9-7 14-8" />}
      {r === 2 && <path d="M2 15c2-3 3-6 6-5s2 3 5 1 3-4 5-4M2 13c3-4 4-4 7-3s4 1 5-1" />}
    </svg>
  ),
  edges: (round: boolean) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round">
      {round ? <path d="M4 17V10a6 6 0 0 1 6-6h7" /> : <path d="M4 17V4h13" />}
    </svg>
  ),
  fill: (kind: string) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.25}>
      <rect x="3" y="3" width="14" height="14" rx="2" fill={kind === "solid" ? "currentColor" : "none"} />
      {kind === "hachure" && <path d="M3 9 9 3M3 15 15 3M7 17 17 7M13 17l4-4" />}
      {kind === "cross-hatch" && <path d="M3 9 9 3M3 15 15 3M7 17 17 7M13 17l4-4M11 3l6 6M5 3l12 12M3 7l10 10M3 13l4 4" />}
      {kind === "zigzag" && <path d="M5 6l2 8 2-8 2 8 2-8 2 8" />}
      {kind === "dots" && (
        <g fill="currentColor" stroke="none">
          {[6, 10, 14].flatMap((x) => [6, 10, 14].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r={1} />))}
        </g>
      )}
    </svg>
  ),
  arrowhead: (kind: string, flip = false) => (
    <svg
      width="22"
      height="20"
      viewBox="0 0 22 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      <path d="M2 10h16" />
      {kind === "arrow" && <path d="M13 5l6 5-6 5" />}
      {kind === "triangle" && <path d="M13 5l6 5-6 5z" fill="currentColor" />}
      {kind === "triangle_outline" && <path d="M13 5l6 5-6 5z" fill="var(--island)" />}
      {kind === "bar" && <path d="M19 4v12" />}
      {kind === "dot" && <circle cx="17" cy="10" r="3" fill="currentColor" />}
      {kind === "circle_outline" && <circle cx="17" cy="10" r="3" fill="var(--island)" />}
    </svg>
  ),
};
