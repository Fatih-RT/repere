import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSettings, useUpdateSettings } from "@/lib/queries";
import type { Theme } from "@/lib/types";

const STORAGE_KEY = "repere-theme";

interface ThemeContextValue {
  theme: Theme;
  followSystem: boolean;
  setTheme: (t: Theme) => void;
  setFollowSystem: (v: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const [localTheme, setLocalTheme] = useState<Theme>(() => (localStorage.getItem(STORAGE_KEY) as Theme) || "dark");
  const [followSystem, setFollowSystemState] = useState(false);

  useEffect(() => {
    if (settings) {
      setLocalTheme(settings.theme);
      setFollowSystemState(settings.follow_system);
      localStorage.setItem(STORAGE_KEY, settings.theme);
    }
  }, [settings]);

  const effectiveTheme = followSystem ? systemTheme() : localTheme;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", effectiveTheme);
  }, [effectiveTheme]);

  useEffect(() => {
    if (!followSystem) return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => document.documentElement.setAttribute("data-theme", systemTheme());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [followSystem]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: effectiveTheme,
      followSystem,
      setTheme: (t) => {
        setLocalTheme(t);
        localStorage.setItem(STORAGE_KEY, t);
        updateSettings.mutate({ theme: t });
      },
      setFollowSystem: (v) => {
        setFollowSystemState(v);
        updateSettings.mutate({ follow_system: v });
      },
    }),
    [effectiveTheme, followSystem, updateSettings]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
