"use client";

import Image from "next/image";
import Link from "next/link";
import { memo } from "react";

// Rendered as a static, prop-less child of TubeLightLogo, which re-renders
// on every scroll frame — memoizing means this whole subtree is skipped on
// every one of those instead of being reconciled 60x/second.
function Footer() {
  return (
    <footer className="relative z-30 w-full bg-[#08080c] border-t border-red-500/20 text-slate-200 overflow-hidden">
      <div className="relative max-w-[1400px] mx-auto px-6 sm:px-8 pt-6 sm:pt-8 pb-20 sm:pb-24">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 lg:gap-8 items-start">

          {/* LEFT COLUMN: Logo & Address */}
          <div className="md:col-span-5 flex flex-col sm:flex-row items-start gap-4">
            {/* Logos Lockup: Team Matrix + K.K. Wagh */}
            <div className="flex items-center gap-3.5 flex-shrink-0">
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0">
                <Image
                  src="/tempfiles/matrix-logo (1).webp"
                  alt="Team Matrix Logo"
                  fill
                  sizes="(max-width: 640px) 56px, 64px"
                  className="object-contain"
                />
              </div>

              <div className="w-[1.5px] h-10 sm:h-12 bg-red-500/30" />

              <a
                href="https://engg.kkwagh.edu.in/"
                target="_blank"
                rel="noopener noreferrer"
                title="K.K. Wagh Institute of Engineering Education & Research"
                className="relative w-24 h-14 sm:w-28 sm:h-16 flex-shrink-0 block hover:opacity-85 transition-opacity"
              >
                {/* Dark mode: White logo */}
                <Image
                  src="/kkw/kkw-logo-white.webp"
                  alt="K.K. Wagh Logo"
                  fill
                  sizes="(max-width: 640px) 96px, 112px"
                  className="object-contain kkw-logo-dark"
                />
                {/* Light mode: Original colored logo */}
                <Image
                  src="/kkw/kkw-logo-original.webp"
                  alt="K.K. Wagh Logo"
                  fill
                  sizes="(max-width: 640px) 96px, 112px"
                  className="object-contain kkw-logo-light"
                />
              </a>
            </div>

            <div className="flex flex-col space-y-1.5">
              <h3 className="font-[family-name:var(--font-black-ops)] text-lg sm:text-xl text-white tracking-wider">
                TEAM MATRIX
              </h3>
              <p className="font-mono text-[11px] sm:text-xs text-slate-300 uppercase leading-relaxed tracking-wide font-medium">
                K.K. WAGH INSTITUTE OF ENGINEERING EDUCATION &amp; RESEARCH, NASHIK
              </p>
              <p className="font-mono text-[11px] text-red-400/90 font-semibold tracking-widest uppercase">
                MAHARASHTRA - 422003, INDIA
              </p>
            </div>
          </div>

          {/* CENTER COLUMN: Quick Links */}
          <div className="md:col-span-4 flex flex-col space-y-2">
            <h4 className="font-[family-name:var(--font-black-ops)] text-xs sm:text-sm tracking-[0.2em] text-red-500 uppercase">
              QUICK LINKS
            </h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-[11px] sm:text-xs tracking-wider uppercase">
              <a
                href="#"
                className="text-slate-300 hover:text-red-400 transition-colors duration-200"
              >
                HOME
              </a>
              <Link
                href="/members"
                className="text-slate-300 hover:text-red-400 transition-colors duration-200"
              >
                MEMBERS
              </Link>
              <a
                href="#about"
                className="text-slate-300 hover:text-red-400 transition-colors duration-200"
              >
                ABOUT
              </a>
              <a
                href="#sponsors"
                className="text-slate-300 hover:text-red-400 transition-colors duration-200"
              >
                SPONSORS
              </a>
              <Link
                href="/gallery"
                className="text-slate-300 hover:text-red-400 transition-colors duration-200"
              >
                STORIES
              </Link>
            </div>
          </div>

          {/* RIGHT COLUMN: Contact Info */}
          <div className="md:col-span-3 flex flex-col space-y-2.5 font-mono text-[11px] sm:text-xs">
            <div className="flex items-center gap-3 text-slate-200 hover:text-red-400 transition-colors">
              <div className="w-7 h-7 rounded-full bg-red-950/60 border border-red-500/30 flex items-center justify-center flex-shrink-0 text-red-400">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              </div>
              <a href="tel:8412843505" className="tracking-wider">
                8412843505 / 8956271193
              </a>
            </div>

            <div className="flex items-center gap-3 text-slate-200 hover:text-red-400 transition-colors">
              <div className="w-7 h-7 rounded-full bg-red-950/60 border border-red-500/30 flex items-center justify-center flex-shrink-0 text-red-400">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <a
                href="mailto:teammatrixofficials@gmail.com"
                className="tracking-wider truncate min-w-0 flex-1 block"
              >
                TEAMMATRIXOFFICIALS@GMAIL.COM
              </a>
            </div>
          </div>

        </div>

        {/* BOTTOM SUB-FOOTER */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-[11px] text-slate-400">
          <p className="tracking-widest uppercase text-center sm:text-left">
            &copy; 2025 TEAM MATRIX. ALL RIGHTS RESERVED.
          </p>

          <div className="flex items-center gap-4">
            {/* Instagram Link */}
            <a
              href="https://www.instagram.com/teammatrix._/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-red-600/30 hover:border-red-500/50 transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>

            {/* LinkedIn Link */}
            <a
              href="https://www.linkedin.com/company/team-matrixs/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-red-600/30 hover:border-red-500/50 transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default memo(Footer);
