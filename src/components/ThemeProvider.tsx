"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: (e?: React.MouseEvent | { clientX: number; clientY: number }) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Persisted key
const STORAGE_KEY = "team-matrix-theme";

/**
 * ThemeProvider
 *
 * Manages dark/light theme state and performs a **circular reveal**
 * transition using the View Transitions API when available, falling
 * back to an instant swap on unsupported browsers.
 *
 * The reveal works by:
 * 1. Snapshotting the current page (via `startViewTransition`)
 * 2. Toggling the `dark` class on `<html>` inside the transition callback
 * 3. Animating the new view in with a `clip-path: circle(...)` that
 *    expands from the toggle button's click position outward.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);
  const clickPosRef = useRef<{ x: number; y: number } | null>(null);

  // On mount, read persisted preference (or system preference)
  useIsomorphicLayoutEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
      applyThemeClass(stored);
    } else {
      // Respect system preference on first visit
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      const initial: Theme = prefersDark ? "dark" : "light";
      setTheme(initial);
      applyThemeClass(initial);
    }
    setMounted(true);
  }, []);

  const toggleTheme = useCallback(
    (e?: React.MouseEvent | { clientX: number; clientY: number }) => {
      const next: Theme = theme === "dark" ? "light" : "dark";

      // Record click position for circular reveal origin
      if (e && "clientX" in e) {
        clickPosRef.current = { x: e.clientX, y: e.clientY };
      } else {
        // Fallback to top-right area if no event coordinates
        clickPosRef.current = {
          x: window.innerWidth - 60,
          y: 28,
        };
      }

      // Use View Transitions API if available for circular reveal
      if (
        typeof document !== "undefined" &&
        "startViewTransition" in document
      ) {
        const transition = document.startViewTransition(() => {
          setTheme(next);
          applyThemeClass(next);
          localStorage.setItem(STORAGE_KEY, next);
        });

        const { x, y } = clickPosRef.current!;
        // Calculate the maximum radius needed to cover the entire viewport
        const maxRadius = Math.hypot(
          Math.max(x, window.innerWidth - x),
          Math.max(y, window.innerHeight - y)
        );

        transition.ready.then(() => {
          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${maxRadius}px at ${x}px ${y}px)`,
              ],
            },
            {
              duration: 500,
              easing: "ease-in-out",
              pseudoElement: "::view-transition-new(root)",
            }
          );
        });
      } else {
        // Fallback: instant swap
        setTheme(next);
        applyThemeClass(next);
        localStorage.setItem(STORAGE_KEY, next);
      }
    },
    [theme]
  );

  // Don't render children until mounted to avoid hydration mismatch
  // (the server always renders "dark", but client might flip to "light")
  if (!mounted) return null;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

function applyThemeClass(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
    root.style.colorScheme = "dark";
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
    root.style.colorScheme = "light";
  }
}
