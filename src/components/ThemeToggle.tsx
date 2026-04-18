import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

type ThemeToggleProps = {
  compact?: boolean;
};

export default function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <div className={`theme-toggle ${compact ? "compact" : ""}`.trim()} role="group" aria-label="Theme mode selector">
      <button
        type="button"
        className={`theme-option ${theme === "light" ? "active" : ""}`}
        onClick={() => setTheme("light")}
        aria-label="Use light mode"
        title="Use light mode"
      >
        <Sun size={14} />
      </button>
      <button
        type="button"
        className={`theme-option ${theme === "dark" ? "active" : ""}`}
        onClick={() => setTheme("dark")}
        aria-label="Use dark mode"
        title="Use dark mode"
      >
        <Moon size={14} />
      </button>
      <button
        type="button"
        className={`theme-option ${theme === "system" ? "active" : ""}`}
        onClick={() => setTheme("system")}
        aria-label="Use system theme"
        title="Use system theme"
      >
        <Monitor size={14} />
      </button>
      <span className="theme-label">
        {theme === "system" ? `System (${resolvedTheme})` : theme === "dark" ? "Dark" : "Light"}
      </span>
    </div>
  );
}
