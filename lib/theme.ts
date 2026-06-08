export type Theme = "light" | "dark";

export const THEME_KEY = "theme";

/** Reads the saved theme; defaults to dark. Safe to call on the server. */
export function getTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

/** Reflects the theme onto <html> (the .dark class drives the CSS variables). */
export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/** Persists and applies the theme. */
export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* storage unavailable — still apply for this session */
  }
  applyTheme(theme);
}
