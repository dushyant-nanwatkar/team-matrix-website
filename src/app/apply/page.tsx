"use client";

import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import DotField from "@/components/DotField";

export default function ApplyPage() {
  return (
    <div className="relative min-h-screen w-full bg-black text-white select-none overflow-hidden">
      {/* Background dot field */}
      <div className="fixed inset-0 z-0">
        <DotField
          dotRadius={1.6} dotSpacing={16} bulgeStrength={70}
          sparkle={true} waveAmplitude={0}
          gradientFrom="rgba(239, 68, 68, 0.25)" gradientTo="rgba(185, 28, 28, 0.10)"
        />
      </div>

      <NavBar />

      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-4">
        <div className="flex flex-col items-center gap-8">
          {/* Label */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/50 border border-red-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="font-mono text-[9px] tracking-[0.1em] sm:text-[10px] sm:tracking-[0.3em] text-red-400 uppercase whitespace-nowrap">Team Matrix / Recruitment</span>
          </div>

          {/* Heading */}
          <div className="flex flex-col items-center gap-2">
            <h1 className="font-[family-name:var(--font-black-ops)] text-6xl sm:text-8xl text-slate-100 leading-none">
              Apply
            </h1>
            <p className="text-slate-400 font-sans text-sm sm:text-base tracking-wide max-w-xs">
              Join the matrix. Recruitment is now live.
            </p>
          </div>

          {/* CTA Button — applications open */}
          <div className="flex flex-col items-center gap-2">
            <a
              href="https://forms.gle/tnaLeUBTJMj23GQS8"
              target="_blank"
              rel="noopener noreferrer"
              className="
                relative group mt-2
                inline-flex items-center justify-center gap-2.5
                px-10 py-4 rounded-full
                bg-[#8c1c2b]/95 text-white
                font-[family-name:var(--font-black-ops)] text-base sm:text-lg tracking-[0.1em]
                border border-[#c1495a]/70
                shadow-[0_0_30px_rgba(239,68,68,0.45)]
                transition-all duration-300 ease-out
                hover:bg-[#a3283b] hover:shadow-[0_0_45px_rgba(239,68,68,0.7)] hover:scale-105 active:scale-95
                overflow-hidden
              "
            >
              <span className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
              <span className="relative z-10 flex items-center gap-2">
                APPLY NOW
                <svg
                  className="w-4 h-4 text-white/90 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </span>
            </a>

            <p className="font-mono text-[10px] tracking-widest text-emerald-400 uppercase flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Applications are live
            </p>
          </div>

          {/* Social Links */}
          <div className="flex flex-col items-center gap-3 mt-2">
            <span className="font-mono text-[10px] tracking-[0.2em] text-slate-500 uppercase">
              Stay Connected
            </span>
            <div className="flex flex-wrap items-center justify-center gap-3.5">
              {/* Instagram Button */}
              <a
                href="https://www.instagram.com/teammatrix._/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Team Matrix on Instagram"
                className="group inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/[0.04] hover:bg-gradient-to-r hover:from-purple-950/50 hover:via-pink-950/50 hover:to-red-950/50 border border-white/10 hover:border-pink-500/50 text-slate-300 hover:text-white transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:shadow-[0_0_25px_rgba(236,72,153,0.3)] hover:scale-105 active:scale-95"
              >
                <svg className="w-4 h-4 text-pink-400 group-hover:text-pink-300 transition-colors" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
                <span className="font-mono text-xs sm:text-sm font-semibold tracking-wider">Instagram</span>
              </a>

              {/* LinkedIn Button */}
              <a
                href="https://www.linkedin.com/company/team-matrixs/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Team Matrix on LinkedIn"
                className="group inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/[0.04] hover:bg-sky-950/50 border border-white/10 hover:border-sky-500/50 text-slate-300 hover:text-white transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:shadow-[0_0_25px_rgba(14,165,233,0.3)] hover:scale-105 active:scale-95"
              >
                <svg className="w-4 h-4 text-sky-400 group-hover:text-sky-300 transition-colors" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
                <span className="font-mono text-xs sm:text-sm font-semibold tracking-wider">LinkedIn</span>
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
