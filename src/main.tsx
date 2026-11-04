import { createRoot } from "react-dom/client";
import "@fontsource/caveat/latin-400.css";
import "./styles.css";
import { App } from "./App";
import { store } from "./state/store";
import { warmFonts } from "./state/systemFonts";
import { loadSaved, startAutosave } from "./persistence/autosave";
import { fitContainerToText, measureTextEl } from "./core/text";
import { HAND_FONT } from "./core/fonts";

const remeasureText = () => {
  store.elements = store.elements.map((e) => (e.type === "text" ? measureTextEl(e) : e.text ? fitContainerToText(e) : e));
  store.resetHistory();
  store.emit();
};

(async () => {
  await loadSaved();
  createRoot(document.getElementById("root")!).render(<App />);
  startAutosave();
  warmFonts();
  try {
    await document.fonts.load(`20px "${HAND_FONT}"`);
    remeasureText();
  } catch {
    /* ignore */
  }
})();
