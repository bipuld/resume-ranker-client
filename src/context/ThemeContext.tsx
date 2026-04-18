import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

const THEME_STORAGE_KEY = "ats.ui.theme";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const resolveInitialTheme = (): ThemeMode => {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === "light" || saved === "dark" || saved === "system") {
    return saved;
  }

  return "system";
};

const resolveSystemTheme = (): ResolvedTheme => {
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(() => resolveInitialTheme());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveSystemTheme());

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      setResolvedTheme(resolveSystemTheme());
    };

    onChange();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    }

    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, []);

  useEffect(() => {
    const activeTheme: ResolvedTheme = theme === "system" ? resolvedTheme : theme;
    document.documentElement.setAttribute("data-theme", activeTheme);
    document.documentElement.setAttribute("data-theme-mode", theme);
    document.documentElement.style.colorScheme = activeTheme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme, resolvedTheme]);

  const value = useMemo<ThemeContextValue>(() => {
    return {
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme: () =>
        setTheme((prev) => {
          if (prev === "system") return "light";
          if (prev === "light") return "dark";
          return "system";
        }),
    };
  }, [theme, resolvedTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}
