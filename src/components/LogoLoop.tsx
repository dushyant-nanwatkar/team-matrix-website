"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";

export interface LogoItem {
  node?: React.ReactNode;
  src?: string;
  alt?: string;
  title?: string;
  href?: string;
}

export interface LogoLoopProps {
  logos: LogoItem[];
  speed?: number; // pixels per second
  direction?: "left" | "right" | "up" | "down";
  logoHeight?: number;
  gap?: number;
  hoverSpeed?: number; // 0 pauses auto-scroll on hover
  scaleOnHover?: boolean;
  fadeOut?: boolean;
  fadeOutColor?: string;
  ariaLabel?: string;
  className?: string;
}

// Duplicated enough times that at least one extra copy stays off-screen on
// either side while dragging, even on very wide monitors.
const COPIES = 4;
// Pointer movement (px) below which a press is treated as a click, not a drag —
// keeps sponsor links clickable while still letting the strip be dragged.
const DRAG_THRESHOLD = 6;

export default function LogoLoop({
  logos,
  speed = 65,
  direction = "left",
  logoHeight = 48,
  gap = 48,
  hoverSpeed,
  scaleOnHover = true,
  fadeOut = true,
  fadeOutColor = "#000000",
  ariaLabel = "Sponsors and partners",
  className = "",
}: LogoLoopProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const isHorizontal = direction === "left" || direction === "right";
  const autoSign = direction === "left" || direction === "up" ? -1 : 1;

  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const loopSizeRef = useRef(0);
  const draggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const pointerStartRef = useRef(0);
  const dragStartOffsetRef = useRef(0);

  const duplicatedLogos = Array.from({ length: COPIES }, () => logos).flat();

  const applyTransform = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    track.style.transform = isHorizontal
      ? `translateX(${offsetRef.current}px)`
      : `translateY(${offsetRef.current}px)`;
  }, [isHorizontal]);

  // Measure one copy's footprint so we can wrap the offset seamlessly
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const measure = () => {
      const size = isHorizontal ? track.scrollWidth : track.scrollHeight;
      loopSizeRef.current = size / COPIES;
    };
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(track);
    return () => ro.disconnect();
  }, [isHorizontal, logos]);

  // rAF-driven auto-scroll; also the loop that keeps a dragged offset wrapping
  useEffect(() => {
    let rafId: number;
    let lastTs = 0;

    const tick = (ts: number) => {
      if (lastTs === 0) lastTs = ts;
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      const paused = isHovered && hoverSpeed === 0;
      if (!draggingRef.current && !paused) {
        offsetRef.current += autoSign * speed * dt;
      }

      const loopSize = loopSizeRef.current;
      if (loopSize > 0) {
        // Wrap so the offset always stays within one loop's width of 0,
        // regardless of whether it got there via auto-scroll or a drag.
        offsetRef.current = ((offsetRef.current % loopSize) + loopSize) % loopSize;
        if (autoSign < 0 || direction === "up") {
          offsetRef.current -= loopSize;
        }
      }

      applyTransform();
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [speed, autoSign, isHovered, hoverSpeed, direction, applyTransform]);

  const getPoint = (e: React.PointerEvent) => (isHorizontal ? e.clientX : e.clientY);

  const onPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    dragMovedRef.current = false;
    pointerStartRef.current = getPoint(e);
    dragStartOffsetRef.current = offsetRef.current;
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const delta = getPoint(e) - pointerStartRef.current;
    if (Math.abs(delta) > DRAG_THRESHOLD) dragMovedRef.current = true;
    offsetRef.current = dragStartOffsetRef.current + delta;
    applyTransform();
  };

  const endDrag = () => {
    draggingRef.current = false;
    setIsDragging(false);
  };

  // Suppress the click a sponsor link would otherwise fire right after a drag
  const onClickCapture = (e: React.MouseEvent) => {
    if (dragMovedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      dragMovedRef.current = false;
    }
  };

  return (
    <div
      aria-label={ariaLabel}
      className={`relative w-full overflow-hidden select-none ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        height: isHorizontal ? `${logoHeight + 40}px` : "100%",
      }}
    >
      {/* Edge Fade Overlay */}
      {fadeOut && (
        <>
          {isHorizontal ? (
            <>
              <div
                className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
                style={{
                  background: `linear-gradient(to right, var(--logoloop-fade, ${fadeOutColor}) 0%, transparent 100%)`,
                }}
              />
              <div
                className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
                style={{
                  background: `linear-gradient(to left, var(--logoloop-fade, ${fadeOutColor}) 0%, transparent 100%)`,
                }}
              />
            </>
          ) : (
            <>
              <div
                className="absolute top-0 left-0 right-0 h-16 z-10 pointer-events-none"
                style={{
                  background: `linear-gradient(to bottom, var(--logoloop-fade, ${fadeOutColor}) 0%, transparent 100%)`,
                }}
              />
              <div
                className="absolute bottom-0 left-0 right-0 h-16 z-10 pointer-events-none"
                style={{
                  background: `linear-gradient(to top, var(--logoloop-fade, ${fadeOutColor}) 0%, transparent 100%)`,
                }}
              />
            </>
          )}
        </>
      )}

      {/* Draggable Marquee Track */}
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        className={`flex ${isHorizontal ? "flex-row items-center" : "flex-col items-center"} w-max h-full`}
        style={{
          gap: `${gap}px`,
          touchAction: isHorizontal ? "pan-y" : "pan-x",
          cursor: isDragging ? "grabbing" : "grab",
          willChange: "transform",
        }}
      >
        {duplicatedLogos.map((item, idx) => {
          const content = (
            <div
              className={`flex items-center justify-center transition-transform duration-300 ${
                scaleOnHover ? "hover:scale-105" : ""
              }`}
            >
              {item.node ? (
                item.node
              ) : item.src ? (
                <div
                  className="relative flex items-center justify-center rounded-full bg-white shadow-[0_4px_25px_rgba(255,255,255,0.15)] border border-white/20 overflow-hidden transition-all duration-300 group flex-shrink-0"
                  style={{
                    height: `${logoHeight}px`,
                    width: `${logoHeight}px`,
                    padding: `${logoHeight * 0.16}px`,
                  }}
                >
                  <div className="relative w-full h-full flex items-center justify-center">
                    <Image
                      src={item.src}
                      alt={item.alt || item.title || `Sponsor logo ${idx}`}
                      fill
                      sizes={`${logoHeight}px`}
                      draggable={false}
                      className="object-contain transition-transform duration-300 group-hover:scale-105 pointer-events-none"
                    />
                  </div>
                </div>
              ) : (
                <span className="text-white font-mono text-sm">{item.title}</span>
              )}
            </div>
          );

          if (item.href) {
            return (
              <a
                key={idx}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                title={item.title || item.alt}
                draggable={false}
                className="inline-flex items-center justify-center flex-shrink-0"
              >
                {content}
              </a>
            );
          }

          return (
            <div key={idx} className="inline-flex items-center justify-center flex-shrink-0">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
