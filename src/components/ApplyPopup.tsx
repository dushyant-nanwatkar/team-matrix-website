"use client";

import { useEffect, useState, useCallback } from "react";

interface ApplyPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * ApplyPopup - One-time recruitment modal popup
 *
 * Appears after initial scroll animation when the TubeLight logo reaches
 * the navigation bar. Replicates the Apply Now CTA section design with
 * glassmorphism, cybernetic neon red styling, and redirects to www.google.com.
 */
export default function ApplyPopup({ isOpen, onClose }: ApplyPopupProps) {
  const [isRendered, setIsRendered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      const raf = requestAnimationFrame(() => {
        setIsAnimating(true);
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setIsRendered(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle ESC key to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  if (!isRendered) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="apply-popup-title"
      onClick={handleBackdropClick}
      className={`fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 transition-all duration-300 ease-out ${
        isAnimating
          ? "bg-black/75 backdrop-blur-md opacity-100"
          : "bg-black/0 backdrop-blur-none opacity-0 pointer-events-none"
      }`}
    >
      {/* Modal Container */}
      <div
        className={`apply-popup-card relative w-full max-w-lg rounded-2xl sm:rounded-3xl border border-red-500/40 bg-[#090910]/95 p-6 sm:p-8 md:p-10 shadow-[0_0_60px_rgba(239,68,68,0.3)] overflow-hidden transition-all duration-300 ease-out ${
          isAnimating
            ? "scale-100 translate-y-0 opacity-100"
            : "scale-95 translate-y-4 opacity-0"
        }`}
        style={{
          backgroundColor: "#090910",
          boxShadow:
            "0 0 50px rgba(239, 68, 68, 0.25), 0 20px 40px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Background ambient red cyber gradient */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 10%, rgba(239, 68, 68, 0.25) 0%, transparent 70%)",
          }}
        />

        {/* Close Button */}

        <button
          type="button"
          onClick={onClose}
          aria-label="Close recruitment popup"
          className="absolute top-4 right-4 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-600/30 hover:border-red-500/50 transition-all duration-200 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Modal Body Content (Copied from Apply Now Section) */}
        <div className="relative z-10 flex flex-col items-center text-center gap-3.5 sm:gap-4 pt-1 sm:pt-2">
          {/* Label Badge */}
          <div className="flex items-center gap-2.5 px-3 py-1 rounded-full bg-red-950/60 border border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span
              className="font-mono text-[9px] tracking-[0.1em] sm:text-[10px] sm:tracking-[0.25em] text-red-400 uppercase whitespace-nowrap"
              style={{ color: "#f87171" }}
            >
              Team Matrix / Recruitment
            </span>
          </div>

          {/* Heading */}
          <h2
            id="apply-popup-title"
            className="font-[family-name:var(--font-black-ops)] text-2xl sm:text-3xl md:text-4xl font-normal text-white leading-tight"
            style={{ color: "#ffffff" }}
          >
            Ready to Build <span className="text-red-500" style={{ color: "#ef4444" }}>With Us?</span>
          </h2>

          {/* Paragraph */}
          <p
            className="max-w-sm text-xs sm:text-sm md:text-base font-sans leading-relaxed"
            style={{ color: "#cbd5e1" }}
          >
            We&apos;re always looking for passionate engineers, designers, and builders to join Team Matrix.
          </p>

          {/* Apply Now Button Redirecting to Recruitment Form */}
          <a
            href="https://forms.gle/tnaLeUBTJMj23GQS8"
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="
              relative group mt-2 sm:mt-3
              inline-flex items-center justify-center
              px-10 sm:px-12 py-3 sm:py-3.5 rounded-full
              bg-[#8c1c2b]/95 text-white
              font-[family-name:var(--font-black-ops)] text-base sm:text-lg tracking-[0.1em]
              border border-[#c1495a]/70
              shadow-[0_0_20px_rgba(239,68,68,0.4)]
              transition-all duration-200 ease-out
              hover:bg-[#a3283b] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] hover:scale-[1.02]
              overflow-hidden
            "
          >
            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
            <span className="relative z-10 flex items-center gap-2">
              APPLY NOW
              <svg
                className="w-4 h-4 text-white/90 group-hover:translate-x-0.5 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
          </a>

          {/* Dismiss note */}
          <button
            type="button"
            onClick={onClose}
            className="mt-1 font-mono text-[10px] tracking-widest text-slate-500 hover:text-slate-300 uppercase transition-colors cursor-pointer"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
