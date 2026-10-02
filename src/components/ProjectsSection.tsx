"use client";

import { useEffect, useState, useMemo } from "react";
import ModelViewer from "@/components/ModelViewer";
import type { ProjectItem } from "@/data/projects";

interface ProjectsSectionProps {
  initialProjects?: ProjectItem[];
}

export default function ProjectsSection({ initialProjects = [] }: ProjectsSectionProps) {
  const [projects, setProjects] = useState<ProjectItem[]>(initialProjects);
  const [loading, setLoading] = useState(initialProjects.length === 0);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [inspectingProject, setInspectingProject] = useState<ProjectItem | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.projects)) {
          setProjects(data.projects);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch projects:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ["All", ...Array.from(set)];
  }, [projects]);

  const filteredProjects = useMemo(() => {
    if (selectedCategory === "All") return projects;
    return projects.filter((p) => p.category === selectedCategory);
  }, [projects, selectedCategory]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* ── SECTION HEADER ─────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/40 border border-red-500/30 text-red-400 font-mono text-xs uppercase tracking-widest mb-4">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Interactive 3D Fleet & CAD Lab
        </div>

        <h2 className="font-[family-name:var(--font-black-ops)] text-4xl sm:text-6xl text-white tracking-tight mb-4">
          Engineering <span className="text-red-500">Projects</span>
        </h2>

        <p className="max-w-2xl text-slate-400 text-sm sm:text-base leading-relaxed font-sans">
          Explore Team Matrix&apos;s custom-engineered robotics prototypes, RoboCup strikers, and heavyweight sumo combatants.
          Tap or click any model to initiate interactive real-time 3D orbit inspection.
        </p>

        {/* ── CATEGORY FILTER TABS ─────────────────────────────────────────── */}
        {categories.length > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8 p-1.5 rounded-2xl bg-[#0d0d16]/90 border border-white/10 backdrop-blur-md">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-mono tracking-wider transition-all duration-200 ${
                  selectedCategory === cat
                    ? "bg-red-600 text-white font-semibold shadow-[0_0_16px_rgba(239,68,68,0.4)]"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── LOADING SKELETON ───────────────────────────────────────────────── */}
      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="rounded-2xl bg-[#0d0d16]/60 border border-white/10 p-6 animate-pulse flex flex-col gap-4"
            >
              <div className="w-full h-80 rounded-xl bg-white/5" />
              <div className="h-6 w-1/3 bg-white/10 rounded" />
              <div className="h-4 w-full bg-white/5 rounded" />
              <div className="h-4 w-2/3 bg-white/5 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* ── EMPTY STATE ────────────────────────────────────────────────────── */}
      {!loading && filteredProjects.length === 0 && (
        <div className="text-center py-16 px-4 rounded-3xl bg-[#0d0d16]/50 border border-white/10">
          <p className="font-mono text-sm text-slate-400 mb-2">No projects found in this category.</p>
          <button
            onClick={() => setSelectedCategory("All")}
            className="text-xs font-mono text-red-400 underline hover:text-red-300"
          >
            Reset filter
          </button>
        </div>
      )}

      {/* ── PROJECTS GRID ──────────────────────────────────────────────────── */}
      {!loading && filteredProjects.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="group relative flex flex-col rounded-3xl bg-[#0c0c16]/80 border border-white/10 hover:border-red-500/40 p-5 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_20px_50px_rgba(239,68,68,0.12)]"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider bg-red-950/60 text-red-300 border border-red-500/30">
                    {project.category}
                  </span>
                  {project.year && (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-mono text-slate-400 bg-white/5 border border-white/10">
                      {project.year}
                    </span>
                  )}
                </div>

                {project.featured && (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-widest uppercase bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    ★ Featured
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 className="font-[family-name:var(--font-black-ops)] text-2xl sm:text-3xl text-white tracking-wide mb-3 group-hover:text-red-400 transition-colors">
                {project.title}
              </h3>

              {/* Description */}
              <p className="text-slate-300/90 text-sm leading-relaxed mb-6 font-sans">
                {project.description}
              </p>

              {/* 3D Model Viewer Container */}
              <div className="relative w-full mb-6">
                <ModelViewer
                  url={project.modelUrl}
                  mtlUrl={project.mtlUrl}
                  previewImage={project.previewImage}
                  title={project.title}
                  height={380}
                  interactiveOnlyOnClick={true}
                  defaultRotationX={-30}
                  defaultRotationY={35}
                />
              </div>

              {/* Engineering Stats Grid */}
              {project.stats && project.stats.length > 0 && (
                <div className="grid grid-cols-3 gap-2.5 mb-6 py-3 px-4 rounded-2xl bg-black/40 border border-white/5">
                  {project.stats.map((stat, i) => (
                    <div key={i} className="flex flex-col">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                        {stat.label}
                      </span>
                      <span className="text-sm sm:text-base font-mono font-bold text-white mt-0.5">
                        {stat.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Footer */}
              <div className="mt-auto pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-500">
                  Interactive 3D Available
                </span>

                <button
                  type="button"
                  onClick={() => setInspectingProject(project)}
                  className="px-4 py-2 rounded-xl text-xs font-mono tracking-wider font-semibold text-white bg-white/10 hover:bg-red-600 border border-white/15 hover:border-red-500 transition-all flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                  </svg>
                  <span>Expand Inspector</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── FULLSCREEN INSPECTOR MODAL ─────────────────────────────────────── */}
      {inspectingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl">
          <div className="relative w-full max-w-5xl h-[90vh] flex flex-col rounded-3xl bg-[#090912] border border-red-500/40 shadow-[0_25px_80px_rgba(0,0,0,0.9)] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/60">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <h3 className="font-[family-name:var(--font-black-ops)] text-lg sm:text-xl text-white tracking-wide">
                  {inspectingProject.title} — CAD Inspector
                </h3>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-red-950/60 text-red-300 border border-red-500/30">
                  {inspectingProject.category}
                </span>
              </div>

              <button
                onClick={() => setInspectingProject(null)}
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 border border-white/15 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
                title="Close Inspector"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="relative flex-1 w-full bg-gradient-to-b from-[#0a0a14] to-black overflow-hidden flex flex-col md:flex-row">
              {/* 3D Viewport in Modal (autostarted) */}
              <div className="relative flex-1 h-full min-h-[350px]">
                <ModelViewer
                  url={inspectingProject.modelUrl}
                  mtlUrl={inspectingProject.mtlUrl}
                  previewImage={inspectingProject.previewImage}
                  title={inspectingProject.title}
                  height="100%"
                  className="rounded-none border-none h-full"
                  interactiveOnlyOnClick={false}
                  autoRotate={true}
                  autoRotateSpeed={0.5}
                />
              </div>

              {/* Sidebar with CAD Details */}
              <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-white/10 bg-black/70 p-6 flex flex-col gap-4 overflow-y-auto">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-red-400">
                    Model Architecture
                  </span>
                  <p className="text-slate-300 text-xs sm:text-sm mt-1 leading-relaxed">
                    {inspectingProject.description}
                  </p>
                </div>

                {inspectingProject.stats && inspectingProject.stats.length > 0 && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                      Technical Specs
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {inspectingProject.stats.map((stat, i) => (
                        <div key={i} className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                          <span className="block text-[10px] font-mono text-slate-400 uppercase">
                            {stat.label}
                          </span>
                          <span className="block text-xs font-mono font-bold text-white mt-0.5">
                            {stat.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                    File Reference
                  </span>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 font-mono text-[11px] text-slate-300 break-all">
                    <span className="text-slate-500">OBJ: </span>
                    {inspectingProject.modelUrl.split("/").pop()}
                  </div>
                  {inspectingProject.mtlUrl && (
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 font-mono text-[11px] text-slate-300 break-all">
                      <span className="text-slate-500">MTL: </span>
                      {inspectingProject.mtlUrl.split("/").pop()}
                    </div>
                  )}
                </div>

                <div className="mt-auto pt-4">
                  <button
                    onClick={() => setInspectingProject(null)}
                    className="w-full py-2.5 rounded-xl bg-red-600/90 hover:bg-red-500 text-white font-mono text-xs uppercase tracking-wider font-semibold transition-colors"
                  >
                    Done Inspecting
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
