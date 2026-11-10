import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { calm } from "@/lib/motion";

export const THEMES = [
  { id: "clear", name: "Clear", colors: ["#BFE9E2", "#BFDDF7", "#E7E3FB"] },
  { id: "dawn", name: "Dawn", colors: ["#FFD9A8", "#FFB39C", "#FFE9A8"] },
  { id: "orchid", name: "Orchid", colors: ["#E6C6F7", "#F7B6D2", "#B9BFF7"] },
  { id: "lagoon", name: "Lagoon", colors: ["#9FE0DA", "#8FC4F2", "#BFD0FF"] },
  { id: "meadow", name: "Meadow", colors: ["#CDEBA6", "#A4E3C4", "#F1EDA8"] },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
export const DEFAULT_THEME: ThemeId = "clear";
export const THEME_KEY = "pa-theme";

export function resolveTheme(value: string | null | undefined): ThemeId {
  return THEMES.find((t) => t.id === value)?.id ?? DEFAULT_THEME;
}

/** Runs before the first paint so a saved theme never flashes the default. */
export const THEME_BOOT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

function write(id: ThemeId) {
  document.documentElement.dataset["theme"] = id;
  try {
    localStorage.setItem(THEME_KEY, id);
  } catch {
    // Private windows can block storage. The theme still applies until the page closes.
  }
}

/** The theme is a personal preference, so Reset demo leaves it alone. */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);
  useEffect(() => {
    setThemeState(resolveTheme(document.documentElement.dataset["theme"]));
  }, []);

  /** The new theme washes outward from the swatch that was clicked. */
  const setTheme = (id: ThemeId, origin?: HTMLElement) => {
    const apply = () => {
      write(id);
      flushSync(() => setThemeState(id));
    };
    if (calm() || !origin || !document.startViewTransition) return apply();
    const r = origin.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const root = document.documentElement;
    root.dataset["vt"] = "theme";
    const t = document.startViewTransition(apply);
    void t.ready.then(() =>
      root.animate({ clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] }, { duration: 720, easing: "cubic-bezier(.32,.72,0,1)", pseudoElement: "::view-transition-new(root)" }),
    );
    void t.finished.finally(() => delete root.dataset["vt"]);
  };

  return { theme, setTheme };
}
