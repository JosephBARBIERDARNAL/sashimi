# 🍣 Sashimi

A local-first, hand-drawn style whiteboard in the spirit of Excalidraw — with **every font installed on your computer** and a **much bigger color palette**.

- **Local-first, no server**: the drawing autosaves to IndexedDB in your browser. Save/open `.sashimi` files (File System Access API, with download fallback). Opens `.excalidraw` files too.
- **All system fonts**: the font picker lists every font on your machine via the Local Font Access API (Chromium; click *Show all fonts*). Other browsers get auto-detected fonts, and you can type any installed font name.
- **More colors**: a 22-hue × 11-shade perceptual (OKLCH) palette plus grays, hex input with alpha, native color picker, eyedropper, recent and saved colors.
- Rectangle, diamond, ellipse, arrow (bindable to shapes), line, freehand, text, image, eraser; labels inside shapes; select/move/resize/rotate; groups, lock, layers, align; undo/redo; copy/paste (including styles); grid snapping; dark mode; PNG/SVG export.

## Develop

```sh
bun install
bun run dev        # http://localhost:5173
bun run build      # static site in dist/
bun run ci         # typecheck + biome (lint/format) + tests + build
```

## Architecture

```
src/
  core/         pure domain: types, geometry, colors, fonts, text measurement, constants
  state/        store (elements + app state + undo), element factories, arrow bindings, actions, system font list
  render/       rough.js shape cache, element/scene renderer, selection handles, PNG/SVG export
  interaction/  pointer state machine, resize, multi-point lines, text editing, insert, clipboard, keyboard
  persistence/  IndexedDB, autosave, file open/save, .excalidraw import
  components/   React UI (toolbar, properties panel, color & font pickers, menus, dialogs, canvas)
tests/          bun tests for the pure core
```

Dependencies flow downward: `components → interaction/persistence → render/state → core`.
