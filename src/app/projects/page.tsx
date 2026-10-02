"use client";

import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import DotField from "@/components/DotField";
import ProjectsSection from "@/components/ProjectsSection";

export default function ProjectsPage() {
  return (
    <div className="relative min-h-screen w-full bg-black text-white select-none overflow-x-hidden">
      {/* Background Dot Field */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <DotField
          dotRadius={1.6}
          dotSpacing={16}
          bulgeStrength={70}
          sparkle={true}
          waveAmplitude={0}
          gradientFrom="rgba(239, 68, 68, 0.25)"
          gradientTo="rgba(185, 28, 28, 0.10)"
        />
      </div>

      <NavBar />

      <main className="relative z-10 pt-28 pb-20">
        <ProjectsSection />
      </main>

      <Footer />
    </div>
  );
}
