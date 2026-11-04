import { useSyncExternalStore } from "react";
import { localFontPermission, probeFonts, queryAllSystemFonts } from "../core/fonts";

/** The list of fonts installed on this machine (loaded lazily, shared by all pickers). */
let systemFonts: string[] = [];
export type FontStatus = "idle" | "loading" | "full" | "probed" | "denied";
let status: FontStatus = "idle";
const subs = new Set<() => void>();
let snapshot: { systemFonts: string[]; status: FontStatus } = { systemFonts, status };
const emit = () => {
  snapshot = { systemFonts, status };
  for (const f of subs) f();
};
export const useSystemFonts = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => snapshot,
  );

export const loadFonts = async (interactive: boolean) => {
  if (status === "loading" || status === "full") return;
  const perm = await localFontPermission();
  if (perm === "unsupported" || perm === "denied" || (perm === "prompt" && !interactive)) {
    if (status === "idle") {
      systemFonts = probeFonts();
      status = perm === "denied" ? "denied" : "probed";
      emit();
    }
    return;
  }
  status = "loading";
  emit();
  try {
    systemFonts = await queryAllSystemFonts();
    status = "full";
  } catch {
    if (!systemFonts.length) systemFonts = probeFonts();
    status = "denied";
  }
  emit();
};

/** Pre-load system fonts silently if permission was already granted. */
export const warmFonts = () => {
  localFontPermission().then((p) => {
    if (p === "granted") void loadFonts(false);
  });
};
