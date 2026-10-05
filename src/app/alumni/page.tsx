"use client";

import { useState, useEffect } from "react";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import DotField from "@/components/DotField";
import AlumniCard from "@/components/AlumniCard";
import { ALUMNI } from "@/data/alumni";

export default function AlumniPage() {
  const [visible, setVisible] = useState(false);
  const [alumniList, setAlumniList] = useState(ALUMNI);

  useEffect(() => {
    fetch("/api/alumni")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAlumniList(data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-black text-white select-none">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <DotField
          dotRadius={1.6} dotSpacing={16} bulgeStrength={70}
          sparkle={true} waveAmplitude={0}
          gradientFrom="rgba(239, 68, 68, 0.25)" gradientTo="rgba(185, 28, 28, 0.10)"
        />
      </div>

      <NavBar />

      <main
        className="relative z-10 pt-28 pb-24 px-6 sm:px-8 max-w-[1400px] mx-auto"
        style={{
          opacity: visible ? 1 : 0,
          transition: "opacity 1.2s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {/* Section header */}
        <div className="relative mb-14 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span
              className="inline-block w-10 h-[2px] rounded-full"
              style={{ background: "#ef4444" }}
            />
            <span className="font-mono text-[0.55rem] tracking-[0.1em] sm:text-[0.7rem] sm:tracking-[0.28em] uppercase font-semibold text-red-400/85 whitespace-nowrap">
              TEAM MATRIX / ALUMNI
            </span>
          </div>

          <h1
            className="leading-[1.05] tracking-[-0.02em] text-slate-50 transition-all duration-700"
            style={{
              fontFamily: "var(--font-black-ops), 'Black Ops One', system-ui, sans-serif",
              fontSize: "clamp(2.4rem, 5vw, 4.2rem)",
              fontWeight: 400,
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(14px)",
            }}
          >
            Our{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(90deg, #f87171 0%, #ef4444 60%, #b91c1c 100%)" }}
            >
              Alumni
            </span>
          </h1>

          <p className="font-sans text-[0.95rem] leading-relaxed text-slate-100/50 max-w-[48ch]">
            Meet the brilliant minds who have been part of our journey.
          </p>
        </div>

        {/* Alumni grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {alumniList.map((a) => (
            <AlumniCard
              key={a.id}
              name={a.name}
              currentOrg={a.currentOrg}
              batch={a.batch}
              avatarUrl={a.avatarUrl}
            />
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
