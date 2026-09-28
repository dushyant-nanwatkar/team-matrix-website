"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * MinimalScrollBar - Sleek, futuristic right-side scrollbar and smooth arrow-key navigation.
 *
 * Features:
 * - Minimal, ultra-clean aesthetic matching Team Matrix neon/dark brand
 * - Smooth interactive scrubbing: drag thumb or click track to scroll anywhere
 * - Real-time rAF position sync (0% React re-renders while scrolling, 60/120fps smooth)
 * - Dynamic percentage badge on hover/drag
 * - Keyboard navigation: ArrowUp/ArrowDown, PageUp/PageDown, Home/End, Spacebar
 * - Responsive: automatically adapts to page height and hides when not scrollable
 */
export default function MinimalScrollBar() {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isScrollable, setIsScrollable] = useState(false);
  const [percent, setPercent] = useState(0);

  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartScrollYRef = useRef(0);

  // ── Keyboard Navigation (Arrow Keys, PageUp/Down, Home/End, Space) ─────────
  useEffect(() => {
    const isInputActive = () => {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      return (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        (el as HTMLElement).isContentEditable
      );
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in form controls
      if (isInputActive()) return;

      // Don't interfere if an explicit modal or lightbox has locked overflow
      // (unless it's just the initial intro waiting for first interaction)
      const bodyOverflow = document.body.style.overflow;
      const isModalLocked =
        bodyOverflow === "hidden" &&
        document.querySelector("[data-modal-open='true'], [role='dialog']");
      if (isModalLocked) return;

      // Dispatch global event for any waiting intro sequences (e.g. TubeLightLogo)
      if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", " ", "Spacebar"].includes(e.key)) {
        window.dispatchEvent(new CustomEvent("team-matrix-scroll-trigger"));
        if (document.body.style.overflow === "hidden") {
          document.body.style.overflow = "auto";
        }
      }

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          const step = e.repeat ? 75 : 120;
          window.scrollBy({ top: step, behavior: e.repeat ? "auto" : "smooth" });
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          const step = e.repeat ? 75 : 120;
          window.scrollBy({ top: -step, behavior: e.repeat ? "auto" : "smooth" });
          break;
        }
        case "PageDown": {
          e.preventDefault();
          const step = Math.round(window.innerHeight * 0.85);
          window.scrollBy({ top: step, behavior: "smooth" });
          break;
        }
        case "PageUp": {
          e.preventDefault();
          const step = Math.round(window.innerHeight * 0.85);
          window.scrollBy({ top: -step, behavior: "smooth" });
          break;
        }
        case "Home": {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
          break;
        }
        case "End": {
          e.preventDefault();
          window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: "smooth",
          });
          break;
        }
        case " ": {
          // Space / Shift+Space page jump (skip if focused on a clickable element like a button or link)
          const activeTag = document.activeElement?.tagName.toLowerCase();
          if (activeTag === "button" || activeTag === "a") return;
          e.preventDefault();
          const dir = e.shiftKey ? -1 : 1;
          const step = Math.round(window.innerHeight * 0.85) * dir;
          window.scrollBy({ top: step, behavior: "smooth" });
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // ── Real-Time Scroll Position Sync (rAF Loop) ──────────────────────────────
  useEffect(() => {
    let rafId: number;
    let lastY = -1;
    let lastHeight = -1;

    const update = () => {
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      const maxScroll = scrollHeight - clientHeight;
      const scrollY = window.scrollY;

      const canScroll = maxScroll > 10;
      setIsScrollable(canScroll);

      // On mobile viewports under 768px where the scrollbar is hidden, skip DOM updates
      if (window.innerWidth < 768) {
        rafId = requestAnimationFrame(update);
        return;
      }

      if (canScroll && trackRef.current && thumbRef.current) {
        const trackHeight = trackRef.current.clientHeight;
        // Proportional thumb height with minimum clamp
        const minThumb = 36;
        const thumbHeight = Math.max(
          minThumb,
          Math.min(trackHeight * 0.8, (clientHeight / scrollHeight) * trackHeight)
        );

        const ratio = Math.min(1, Math.max(0, scrollY / maxScroll));
        const maxThumbY = trackHeight - thumbHeight;
        const thumbY = ratio * maxThumbY;

        if (scrollY !== lastY || scrollHeight !== lastHeight) {
          thumbRef.current.style.height = `${thumbHeight}px`;
          thumbRef.current.style.transform = `translate3d(0, ${thumbY}px, 0)`;

          if (badgeRef.current) {
            badgeRef.current.style.transform = `translate3d(0, ${thumbY}px, 0)`;
          }

          setPercent(Math.round(ratio * 100));
          lastY = scrollY;
          lastHeight = scrollHeight;
        }
      }

      rafId = requestAnimationFrame(update);
    };

    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // ── Drag & Click Scrubbing ──────────────────────────────────────────────────
  const handlePointerDownThumb = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    isDraggingRef.current = true;
    setIsDragging(true);
    dragStartYRef.current = e.clientY;
    dragStartScrollYRef.current = window.scrollY;

    const onPointerMove = (moveEv: PointerEvent) => {
      if (!isDraggingRef.current || !trackRef.current || !thumbRef.current) return;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      const maxScroll = scrollHeight - clientHeight;
      if (maxScroll <= 0) return;

      const trackHeight = trackRef.current.clientHeight;
      const thumbHeight = thumbRef.current.clientHeight;
      const maxThumbY = trackHeight - thumbHeight;
      if (maxThumbY <= 0) return;

      const deltaY = moveEv.clientY - dragStartYRef.current;
      const scrollDelta = (deltaY / maxThumbY) * maxScroll;
      const targetScrollY = Math.min(maxScroll, Math.max(0, dragStartScrollYRef.current + scrollDelta));

      window.scrollTo({ top: targetScrollY, behavior: "auto" });
    };

    const onPointerUp = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      document.body.style.removeProperty("user-select");
    };

    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp);
  }, []);

  const handleClickTrack = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Only handle clicks directly on track, not originating from thumb
    if (e.target === thumbRef.current || thumbRef.current?.contains(e.target as Node)) {
      return;
    }
    if (!trackRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const ratio = Math.min(1, Math.max(0, clickY / rect.height));

    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;
    const maxScroll = scrollHeight - clientHeight;

    window.scrollTo({ top: ratio * maxScroll, behavior: "smooth" });
  }, []);

  if (!isScrollable) return null;

  return (
    <aside
      ref={containerRef}
      aria-label="Scroll position and control"
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => {
        if (!isDraggingRef.current) setIsHovered(false);
      }}
      className={`fixed right-1 sm:right-2 top-0 bottom-0 z-[280] hidden md:flex items-center justify-center py-6 sm:py-8 pointer-events-auto select-none transition-opacity duration-300 ${
        isHovered || isDragging ? "opacity-100" : "opacity-60 hover:opacity-100"
      }`}
    >
      {/* Percentage tooltip badge (visible on hover or drag) */}
      <div
        ref={badgeRef}
        aria-hidden="true"
        className={`absolute right-full mr-2.5 top-0 pointer-events-none transition-all duration-200 ${
          isHovered || isDragging ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2"
        }`}
      >
        <span className="font-mono text-[9px] font-bold tracking-wider text-red-300 bg-neutral-950/90 border border-red-500/40 px-2 py-0.5 rounded shadow-[0_0_10px_rgba(239,68,68,0.35)] whitespace-nowrap backdrop-blur-md">
          {percent}%
        </span>
      </div>

      {/* Track rail */}
      <div
        ref={trackRef}
        onPointerDown={handleClickTrack}
        className={`relative h-full rounded-full cursor-pointer transition-all duration-200 ${
          isHovered || isDragging
            ? "w-[6px] sm:w-[7px] bg-red-950/30 border border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.2)]"
            : "w-[3px] sm:w-[4px] bg-white/[0.08] border border-white/[0.05]"
        }`}
      >
        {/* Thumb */}
        <div
          ref={thumbRef}
          onPointerDown={handlePointerDownThumb}
          role="scrollbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-controls="main-content"
          tabIndex={-1}
          className={`absolute left-0 right-0 rounded-full transition-[box-shadow,background] duration-200 cursor-grab active:cursor-grabbing ${
            isDragging
              ? "bg-gradient-to-b from-red-400 via-rose-500 to-red-600 shadow-[0_0_16px_rgba(239,68,68,0.95)]"
              : isHovered
              ? "bg-gradient-to-b from-red-500 via-rose-600 to-red-700 shadow-[0_0_10px_rgba(239,68,68,0.8)]"
              : "bg-gradient-to-b from-red-500/80 via-red-600/80 to-red-700/80 shadow-[0_0_6px_rgba(239,68,68,0.5)]"
          }`}
          style={{
            height: "40px",
            transform: "translate3d(0, 0, 0)",
          }}
        >
          {/* Subtle neon center line inside thumb */}
          <span
            aria-hidden="true"
            className="absolute inset-y-2 left-1/2 -translate-x-1/2 w-[1px] bg-white/40 rounded-full"
          />
        </div>
      </div>
    </aside>
  );
}
