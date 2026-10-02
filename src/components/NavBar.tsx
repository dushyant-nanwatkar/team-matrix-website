"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import GradualBlur from "./GradualBlur";
import ThemeToggle from "./ThemeToggle";

// Runs before paint on the client (no SSR flash of the wrong value), falls
// back to a plain effect on the server where layout effects are a no-op —
// same pattern TubeLightLogo.tsx and AchievementsShowcase.tsx already use.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const NAV_LEFT = [
  { label: "About", href: "/#about" },
  { label: "Members", href: "/members" },
  { label: "Stories", href: "/gallery" },
];

const NAV_RIGHT = [
  { label: "Alumni", href: "/alumni" },
  { label: "Projects", href: "/projects" },
];

const ALL_LINKS = [...NAV_LEFT, ...NAV_RIGHT];

// Each GradualBlur div is its own full-viewport-width backdrop-filter layer —
// real GPU compositing cost, worse on mobile GPUs. Halving the layer count
// below 768px keeps the fade visually similar while cutting that cost
// roughly in half on phones (same fix as TubeLightLogo.tsx's homepage blur).
function useGradualBlurDivCount(breakpointPx = 768) {
  const [divCount, setDivCount] = useState(8);

  useIsomorphicLayoutEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    setDivCount(mql.matches ? 4 : 8);
    const update = (e: MediaQueryListEvent) => setDivCount(e.matches ? 4 : 8);
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [breakpointPx]);

  return divCount;
}

export default function NavBar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const gradualBlurDivCount = useGradualBlurDivCount();

  // Close the mobile menu on route change — adjusted during render (React's
  // recommended way to reset state on a prop change) rather than in an
  // effect, so it takes effect before the stale menu ever paints.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMenuOpen(false);
  }

  // Lock scroll while the mobile menu is open
  useEffect(() => {
    if (!menuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <>
      <header className="fixed top-4 left-0 right-0 z-40 flex items-center justify-between px-5 sm:px-8 pointer-events-none">
        {/* LEFT ISLAND — desktop only */}
        <nav className="hidden md:flex pointer-events-auto items-center gap-0.5 px-2 py-1.5 rounded-full bg-[#0d0d14]/80 backdrop-blur-xl border border-white/[0.07] shadow-[0_8px_32px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]">
          {NAV_LEFT.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className={`px-4 py-1.5 rounded-full text-sm font-sans font-medium transition-all duration-200 active:scale-95 whitespace-nowrap ${
                pathname === href
                  ? "text-white bg-white/[0.10]"
                  : "text-slate-300/80 hover:text-white hover:bg-white/[0.08]"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        {/* Mobile spacer — balances the hamburger button so the logo stays centered */}
        <div className="md:hidden w-11 h-11" aria-hidden="true" />

        {/* CENTER LOGO */}
        <div className="pointer-events-auto relative flex flex-col items-center" style={{ flex: "0 0 auto" }}>
          <Link href="/" className="relative z-10 w-12 sm:w-14 md:w-16 block transition-transform duration-300 hover:scale-110">
            <Image
              src="/tempfiles/matrixlogo (2).png"
              alt="Matrix Logo"
              width={80}
              height={80}
              className="w-full h-auto object-contain"
              priority
            />
          </Link>
        </div>

        {/* RIGHT ISLAND — desktop only */}
        <nav className="hidden md:flex pointer-events-auto items-center gap-0.5 px-2 py-1.5 rounded-full bg-[#0d0d14]/80 backdrop-blur-xl border border-white/[0.07] shadow-[0_8px_32px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]">
          {NAV_RIGHT.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className={`px-4 py-1.5 rounded-full text-sm font-sans font-medium transition-all duration-200 active:scale-95 whitespace-nowrap ${
                pathname === href
                  ? "text-white bg-white/[0.10]"
                  : "text-slate-300/80 hover:text-white hover:bg-white/[0.08]"
              }`}
            >
              {label}
            </Link>
          ))}
          <div className="w-px h-4 bg-white/10 dark:bg-white/10 mx-1" />
          <ThemeToggle />
          <div className="w-px h-4 bg-white/10 dark:bg-white/10 mx-1" />
          <Link
            href="/apply"
            className={`px-4 py-1.5 rounded-full text-sm font-sans font-semibold text-red-300 bg-red-950/50 border border-red-500/30 transition-all duration-200 hover:bg-red-900/60 hover:text-red-200 active:scale-95 whitespace-nowrap ${
              pathname === "/apply" ? "bg-red-900/60 text-red-200" : ""
            }`}
          >
            Apply
          </Link>
        </nav>

        {/* Hamburger — mobile only */}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          className="md:hidden pointer-events-auto flex items-center justify-center w-11 h-11 rounded-full bg-[#0d0d14]/80 backdrop-blur-xl border border-white/[0.07] shadow-[0_8px_32px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] active:scale-95 transition-transform"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="text-slate-200">
            {menuOpen ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </header>

      {/* Mobile menu overlay */}
      <div
        className={`md:hidden fixed inset-0 z-30 transition-opacity duration-300 ${
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
        <nav
          className={`absolute top-20 left-5 right-5 rounded-3xl bg-[#0d0d14]/95 border border-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-2 flex flex-col transition-all duration-300 ${
            menuOpen ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"
          }`}
        >
          {ALL_LINKS.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={`px-4 py-3.5 rounded-2xl text-base font-sans font-medium transition-colors ${
                pathname === href ? "text-white bg-white/[0.08]" : "text-slate-300/85 hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              {label}
            </Link>
          ))}
          {/* Theme Toggle — mobile */}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="font-sans text-base font-medium text-slate-300/85 dark:text-slate-300/85">Theme</span>
            <ThemeToggle />
          </div>
          <Link
            href="/apply"
            onClick={() => setMenuOpen(false)}
            className={`mt-1 px-4 py-3.5 rounded-2xl text-base font-sans font-semibold text-center text-red-300 bg-red-950/50 border border-red-500/30 transition-colors ${
              pathname === "/apply" ? "bg-red-900/60 text-red-200" : "hover:bg-red-900/50 hover:text-red-200"
            }`}
          >
            Apply
          </Link>
        </nav>
      </div>

      {/* TOP GRADUAL BACKDROP BLUR OVERLAY — matches the homepage's treatment */}
      <GradualBlur
        target="page"
        position="top"
        height="5.5rem"
        strength={3}
        divCount={gradualBlurDivCount}
        curve="bezier"
        exponential={true}
        zIndex={35}
      />

      {/* BOTTOM GRADUAL BACKDROP BLUR OVERLAY */}
      <GradualBlur
        target="page"
        position="bottom"
        height="4.5rem"
        strength={3}
        divCount={gradualBlurDivCount}
        curve="bezier"
        exponential={true}
        zIndex={35}
      />
    </>
  );
}
