"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import Image from "next/image";
import gsap from "gsap";

export type DepthCarouselItem = string | { image: string; alt?: string };
type TiltDirection = "left" | "right";

export interface DepthCarouselProps {
  items?: DepthCarouselItem[];
  cardWidth?: number;
  cardHeight?: number;
  radius?: number;
  tint?: string;
  depth?: number;
  spread?: number;
  tilt?: number;
  tiltDirection?: TiltDirection;
  perspective?: number;
  visibleCards?: number;
  falloff?: number;
  blur?: number;
  duration?: number;
  ease?: string;
  autoplay?: boolean;
  autoplayDelay?: number;
  loop?: boolean;
  showControls?: boolean;
  showIndicators?: boolean;
  onChange?: (index: number, item: { image: string; alt?: string }) => void;
  className?: string;
}

interface CarouselConfig {
  count: number;
  depth: number;
  spread: number;
  tilt: number;
  tiltDirection: TiltDirection;
  visibleCards: number;
  falloff: number;
  blur: number;
  duration: number;
  ease: string;
  loop: boolean;
  cardWidth: number;
  autoplayDelay: number;
}

interface DragState {
  x: number;
  y: number;
  startPos: number;
  lastX: number;
  lastT: number;
  v: number;
  moved: boolean;
  isScrolling: boolean;
  id: number;
}

const DEFAULT_ITEMS: DepthCarouselItem[] = [
  { image: "https://picsum.photos/seed/depth1/800/1000", alt: "Slide 1" },
  { image: "https://picsum.photos/seed/depth2/800/1000", alt: "Slide 2" },
  { image: "https://picsum.photos/seed/depth3/800/1000", alt: "Slide 3" },
  { image: "https://picsum.photos/seed/depth4/800/1000", alt: "Slide 4" },
  { image: "https://picsum.photos/seed/depth5/800/1000", alt: "Slide 5" },
  { image: "https://picsum.photos/seed/depth6/800/1000", alt: "Slide 6" },
];

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const normalizeItem = (it: DepthCarouselItem) => (typeof it === "string" ? { image: it, alt: "" } : it);

export default function DepthCarousel({
  items = DEFAULT_ITEMS,
  cardWidth = 300,
  cardHeight = 380,
  radius = 18,
  tint = "#05060a",
  depth = 220,
  spread = 90,
  tilt = 22,
  tiltDirection = "right",
  perspective = 1400,
  visibleCards = 4,
  falloff = 0.2,
  blur = 6,
  duration = 700,
  ease = "power3.out",
  autoplay = false,
  autoplayDelay = 3200,
  loop = true,
  showControls = true,
  showIndicators = true,
  onChange,
  className = "",
}: DepthCarouselProps) {
  const data = useMemo(() => (Array.isArray(items) ? items : []).map(normalizeItem), [items]);
  const count = data.length;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const overlayRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const posRef = useRef(0);
  const focusRef = useRef(0);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const scaleRef = useRef(1);
  const cfgRef = useRef<CarouselConfig>({} as CarouselConfig);
  const onChangeRef = useRef(onChange);

  const dragRef = useRef<DragState | null>(null);
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reducedRef = useRef(false);

  const [active, setActive] = useState(0);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    cfgRef.current = {
      count,
      depth,
      spread,
      tilt,
      tiltDirection,
      visibleCards,
      falloff,
      blur,
      duration,
      ease,
      loop,
      cardWidth,
      autoplayDelay,
    };
  }, [count, depth, spread, tilt, tiltDirection, visibleCards, falloff, blur, duration, ease, loop, cardWidth, autoplayDelay]);

  const layout = useCallback((pos: number) => {
    const cfg = cfgRef.current;
    const n = cfg.count;
    if (!n) return;
    const dir = cfg.tiltDirection === "left" ? -1 : 1;
    const sc = scaleRef.current;

    for (let i = 0; i < n; i++) {
      const el = cardRefs.current[i];
      if (!el) continue;

      let d = i - pos;
      if (cfg.loop && n > 1) {
        d = ((d % n) + n) % n;
        if (d > n / 2) d -= n;
      }

      const back = Math.max(0, d);
      const az = Math.abs(d);
      const shown = az <= cfg.visibleCards + 0.5;

      if (!shown) {
        el.style.display = "none";
        continue;
      }
      el.style.display = "block";

      const tz = -cfg.depth * d;
      const tx = dir * cfg.spread * d;
      const ry = dir * cfg.tilt * clamp(d, 0, 1);

      const opacity = d < 0 ? Math.max(0, 1 + d) : 1;
      const brightness = Math.max(0.18, 1 - back * cfg.falloff);
      const blurPx = cfg.blur > 0 ? Math.min(cfg.blur, (back / Math.max(1, cfg.visibleCards)) * cfg.blur) : 0;
      const zi = Math.round(2000 - d * 20);

      el.style.transform = `translate(-50%, -50%) scale(${sc}) translateX(${tx.toFixed(2)}px) translateZ(${tz.toFixed(2)}px) rotateY(${ry.toFixed(3)}deg)`;
      el.style.opacity = opacity.toFixed(3);
      if (cfg.blur > 0) {
        el.style.filter = `brightness(${brightness.toFixed(3)}) blur(${blurPx.toFixed(2)}px)`;
      } else {
        el.style.filter = `brightness(${brightness.toFixed(3)})`;
      }
      el.style.zIndex = String(zi);
      el.style.pointerEvents = opacity > 0.05 ? "auto" : "none";

      const ov = overlayRefs.current[i];
      if (ov) ov.style.opacity = clamp(back * cfg.falloff * 1.25, 0, 0.86).toFixed(3);
    }
  }, []);

  const notify = useCallback(
    (idx: number) => {
      setActive(idx);
      onChangeRef.current?.(idx, data[idx]);
    },
    [data]
  );

  const tweenTo = useCallback(
    (target: number, animate: boolean) => {
      tweenRef.current?.kill();
      const cfg = cfgRef.current;
      const proxy = { p: posRef.current };
      const dur = animate && !reducedRef.current ? cfg.duration / 1000 : 0;
      tweenRef.current = gsap.to(proxy, {
        p: target,
        duration: dur,
        ease: cfg.ease,
        onUpdate: () => {
          posRef.current = proxy.p;
          layout(proxy.p);
        },
        onComplete: () => {
          const n = cfg.count;
          if (n > 0) posRef.current = ((posRef.current % n) + n) % n;
          layout(posRef.current);
        },
      });
    },
    [layout]
  );

  const setFocus = useCallback(
    (rawIndex: number, animate = true) => {
      const cfg = cfgRef.current;
      const n = cfg.count;
      if (!n) return;
      // `tweenTo` kills the previous tween before starting a new one, which
      // skips its `onComplete` — the only place `posRef.current` normally
      // gets wrapped back into [0, n). Fast repeated navigation (rapid wheel
      // scrolling, or autoplay firing mid-navigation) interrupts tweens
      // before they complete far more often than it lets them finish, so
      // without this, `posRef.current` drifts further from [0, n) with every
      // interruption and never gets reset — compounding floating-point error
      // into every card's `d`/transform/z-index calc in `layout()` until
      // positions visibly glitch after "enough" scrolling. Normalizing here,
      // before computing `delta` off whatever `posRef.current` currently is,
      // means every navigation starts from a small, precise value regardless
      // of how many prior tweens got interrupted.
      if (cfg.loop && n > 1) {
        posRef.current = ((posRef.current % n) + n) % n;
      }
      const idx = cfg.loop ? ((rawIndex % n) + n) % n : clamp(rawIndex, 0, n - 1);
      let delta = idx - posRef.current;
      if (cfg.loop && n > 1) {
        delta = ((delta % n) + n) % n;
        if (delta > n / 2) delta -= n;
      }
      tweenTo(posRef.current + delta, animate);
      if (idx !== focusRef.current) {
        focusRef.current = idx;
        notify(idx);
      }
    },
    [tweenTo, notify]
  );

  const navigateBy = useCallback((step: number) => setFocus(focusRef.current + step, true), [setFocus]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      const cfg = cfgRef.current;
      const needed = cfg.cardWidth + Math.abs(cfg.spread) * 2 + 120;
      scaleRef.current = clamp(w / needed, 0.4, 1);
      layout(posRef.current);
    });
    ro.observe(root);
    return () => ro.disconnect();
  }, [layout]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    // One wheel "gesture" advances exactly one slide, instead of dragging the
    // carousel continuously by the raw scroll delta (which needed several
    // notches to move a single card). A short lock after each trigger
    // absorbs the flurry of small events a single trackpad swipe or mouse
    // notch fires, so that whole gesture only ever counts as one step.
    //
    // Only a horizontal-dominant gesture (trackpad two-finger swipe left/
    // right, or shift+wheel) is treated as carousel navigation — a plain
    // vertical scroll/wheel is ignored here entirely (no preventDefault, no
    // navigateBy) and passes straight through to the page. This component
    // lives on a page that's driven end-to-end by vertical scroll position
    // (pinned crossfade sections elsewhere in TubeLightLogo.tsx); previously
    // ANY wheel input over this carousel — including plain vertical
    // scrolling — called preventDefault() and hijacked it into a horizontal
    // slide change, which silently froze the page's own scroll the moment
    // the cursor was over this carousel.
    let locked = false;
    const onWheel = (e: WheelEvent) => {
      const cfg = cfgRef.current;
      if (cfg.count < 2) return;
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      if (locked) return;
      const raw = e.deltaX;
      if (Math.abs(raw) < 1) return;
      locked = true;
      navigateBy(raw > 0 ? 1 : -1);
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = setTimeout(() => {
        locked = false;
      }, Math.max(cfgRef.current.duration, 350));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
    };
  }, [navigateBy]);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const cfg = cfgRef.current;
    if (cfg.count < 2) return;
    tweenRef.current?.kill();
    if (cfg.loop) {
      posRef.current = ((posRef.current % cfg.count) + cfg.count) % cfg.count;
    }
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      startPos: posRef.current,
      lastX: e.clientX,
      lastT: performance.now(),
      v: 0,
      moved: false,
      isScrolling: false,
      id: e.pointerId,
    };
  }, []);

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      if (drag.isScrolling) return;

      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;

      // Allow natural vertical scroll on mobile if movement is predominantly vertical
      if (!drag.moved) {
        if (Math.abs(dy) > 7 && Math.abs(dy) > Math.abs(dx)) {
          drag.isScrolling = true;
          return;
        }
        if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
          drag.moved = true;
          try {
            rootRef.current?.setPointerCapture(drag.id);
          } catch {
            // Ignore pointer capture errors on mobile
          }
        }
      }

      if (!drag.moved) return;
      const cfg = cfgRef.current;
      const stepPx = Math.max(cfg.cardWidth * 0.55 * scaleRef.current, 40);
      const now = performance.now();
      const dt = Math.max(now - drag.lastT, 1);
      drag.v = (e.clientX - drag.lastX) / dt;
      drag.lastX = e.clientX;
      drag.lastT = now;
      posRef.current = drag.startPos - dx / stepPx;
      layout(posRef.current);
    },
    [layout]
  );

  const onPointerEnd = useCallback(() => {
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.moved && drag.id != null) {
      try {
        rootRef.current?.releasePointerCapture(drag.id);
      } catch {
        // Ignore
      }
    }
    dragRef.current = null;
    if (!drag.moved) return;
    const cfg = cfgRef.current;
    const stepPx = Math.max(cfg.cardWidth * 0.55 * scaleRef.current, 40);
    const projected = posRef.current - (drag.v * 180) / stepPx;
    setFocus(Math.round(projected), true);
  }, [setFocus]);

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        navigateBy(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        navigateBy(1);
      }
    },
    [navigateBy]
  );

  const onCardClick = useCallback(
    (index: number) => {
      if (dragRef.current?.moved) return;
      setFocus(index, true);
    },
    [setFocus]
  );

  useEffect(() => {
    reducedRef.current = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!autoplay || reducedRef.current || count < 2) return;
    const root = rootRef.current;
    let hovered = false;
    let focused = false;
    let inView = true;
    const stop = () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    };
    const start = () => {
      stop();
      if (!inView) return;
      autoTimerRef.current = setInterval(
        () => {
          // `hovered`/`focused` only ever get set by mouse/keyboard events —
          // a touch drag on mobile fires neither, so without this check
          // autoplay's navigateBy(1) can fire mid-drag. That starts a GSAP
          // tween whose onUpdate writes posRef.current on every tick at the
          // same time the drag's own onPointerMove is ALSO writing
          // posRef.current directly every touchmove — two independent
          // writers fighting over the same ref, which is what visibly
          // glitches/jitters the carousel the longer you drag through it
          // (more time = higher chance the fixed autoplay interval lands
          // mid-gesture).
          if (!hovered && !focused && !dragRef.current && inView) navigateBy(1);
        },
        Math.max(cfgRef.current.autoplayDelay, 600)
      );
    };
    const onEnter = () => {
      hovered = true;
    };
    const onLeave = () => {
      hovered = false;
    };
    const onFocusIn = () => {
      focused = true;
    };
    const onFocusOut = () => {
      focused = false;
    };

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined" && root) {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          inView = entry ? entry.isIntersecting : true;
          if (inView) {
            start();
          } else {
            stop();
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(root);
    }

    root?.addEventListener("mouseenter", onEnter);
    root?.addEventListener("mouseleave", onLeave);
    root?.addEventListener("focusin", onFocusIn);
    root?.addEventListener("focusout", onFocusOut);
    start();
    return () => {
      stop();
      observer?.disconnect();
      root?.removeEventListener("mouseenter", onEnter);
      root?.removeEventListener("mouseleave", onLeave);
      root?.removeEventListener("focusin", onFocusIn);
      root?.removeEventListener("focusout", onFocusOut);
    };
  }, [autoplay, autoplayDelay, count, navigateBy]);

  useEffect(() => {
    layout(posRef.current);
  }, [layout, depth, spread, tilt, tiltDirection, visibleCards, falloff, blur, cardWidth, cardHeight, radius, count]);

  useEffect(
    () => () => {
      tweenRef.current?.kill();
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    },
    []
  );

  return (
    <div
      ref={rootRef}
      className={`relative flex h-full min-h-[220px] sm:min-h-[320px] w-full cursor-grab touch-pan-y select-none items-center justify-center outline-none [perspective-origin:50%_50%] active:cursor-grabbing focus-visible:rounded-xl focus-visible:outline-2 focus-visible:outline-white/50 focus-visible:[outline-offset:4px] ${className}`.trim()}
      style={{ perspective: `${perspective}px` }}
      role="group"
      aria-roledescription="carousel"
      aria-label="Depth carousel"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onKeyDown={onKeyDown}
    >
      <div className="absolute inset-0 [transform-style:preserve-3d]" ref={stageRef}>
        {data.map((item, i) => (
          <div
            key={i}
            className="absolute left-1/2 top-1/2 cursor-pointer overflow-hidden bg-[#0b0d12] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.65),0_8px_20px_-10px_rgba(0,0,0,0.5)] [transform:translate(-50%,-50%)] [transform-origin:center]"
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            style={{ width: cardWidth, height: cardHeight, borderRadius: radius }}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            aria-hidden={active !== i}
            onClick={() => onCardClick(i)}
          >
            <Image
              className="pointer-events-none block h-full w-full select-none object-cover [-webkit-user-drag:none]"
              src={item.image}
              alt={item.alt || ""}
              fill
              sizes={`${cardWidth}px`}
              draggable={false}
            />
            <span
              className="pointer-events-none absolute inset-0 opacity-0"
              ref={(el) => {
                overlayRefs.current[i] = el;
              }}
              style={{ background: "#000000" }}
            />
          </div>
        ))}
      </div>

      {showControls && count > 1 && (
        <>
          <button
            type="button"
            className="absolute left-4 top-1/2 z-[3000] hidden sm:grid h-[42px] w-[42px] -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-[rgba(18,20,26,0.55)] text-white backdrop-blur-md transition-[background,border-color,transform,box-shadow] duration-200 hover:border-red-400/50 hover:bg-[rgba(28,31,40,0.85)] hover:scale-110 active:scale-95"
            aria-label="Previous slide"
            onClick={() => navigateBy(-1)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                d="M15 5l-7 7 7 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className="absolute right-4 top-1/2 z-[3000] hidden sm:grid h-[42px] w-[42px] -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-[rgba(18,20,26,0.55)] text-white backdrop-blur-md transition-[background,border-color,transform,box-shadow] duration-200 hover:border-red-400/50 hover:bg-[rgba(28,31,40,0.85)] hover:scale-110 active:scale-95"
            aria-label="Next slide"
            onClick={() => navigateBy(1)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                d="M9 5l7 7-7 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </>
      )}

      {showIndicators && count > 1 && (
        <div
          className="absolute bottom-4 left-1/2 z-[3000] flex max-w-[90%] -translate-x-1/2 flex-wrap justify-center gap-2 rounded-full bg-[rgba(14,16,22,0.4)] px-3 py-2 backdrop-blur-sm"
          role="tablist"
          aria-label="Slides"
        >
          {data.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={active === i}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-[7px] cursor-pointer rounded-full transition-[width,background] duration-[250ms] ${
                active === i ? "w-5 bg-white" : "w-[7px] bg-white/30"
              }`}
              onClick={() => setFocus(i, true)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
