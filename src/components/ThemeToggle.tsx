"use client";

import { useTheme } from "./ThemeProvider";

/**
 * ThemeToggle — Sun/Moon toggle button for the navigation bar.
 *
 * Renders a pill-shaped toggle with a smooth SVG morph between sun and moon
 * icons. On click, triggers the circular-reveal View Transition via ThemeProvider.
 */
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      id="theme-toggle"
      onClick={(e) => toggleTheme(e)}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className={`
        relative flex items-center justify-center
        w-9 h-9 rounded-full
        transition-all duration-300 ease-out
        active:scale-90
        ${
          isDark
            ? "bg-white/[0.08] hover:bg-white/[0.14] text-slate-300 hover:text-amber-300"
            : "bg-black/[0.06] hover:bg-black/[0.12] text-black"
        }
      `}
    >
      {/* Sun icon — visible in dark mode (click to go light) */}
      <svg
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`absolute transition-all duration-300 ${
          isDark
            ? "opacity-100 rotate-0 scale-100"
            : "opacity-0 -rotate-90 scale-0"
        }`}
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </svg>

      {/* Moon icon — visible in light mode (click to go dark) */}
      <svg
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`absolute text-black transition-all duration-300 ${
          isDark
            ? "opacity-0 rotate-90 scale-0"
            : "opacity-100 rotate-0 scale-100 text-black stroke-black"
        }`}
      >
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    </button>
  );
}
