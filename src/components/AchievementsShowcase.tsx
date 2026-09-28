"use client";

import { memo, useEffect, useLayoutEffect, useMemo, useState } from "react";
import DepthCarousel, { type DepthCarouselItem } from "./DepthCarousel";
import Reveal from "./Reveal";
import captionsData from "../../public/achievements/captions.json";

interface AchievementCaption {
  file: string;
  caption: string;
  note?: string;
}

const captions = captionsData as AchievementCaption[];

// Runs before paint on the client (no SSR flash of the wrong size), falls
// back to a plain effect on the server where layout effects are a no-op.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// DepthCarousel's own ResizeObserver only ever scales *down* to a floor of
// 0.4x — on a mobile viewport the desktop card/spread numbers below hit that
// floor and render as a tiny, oddly-offset thumbnail with a lot of dead
// space around it (reported on Android). Pick proportionally smaller props
// on narrow viewports instead of relying on that floor to save it.
const DESKTOP_CAROUSEL_PROPS = {
  cardWidth: 672,
  cardHeight: 432,
  radius: 58,
  depth: 120,
  spread: 312,
  visibleCards: 4,
  blur: 4,
};

const MOBILE_CAROUSEL_PROPS = {
  cardWidth: 280,
  cardHeight: 185,
  radius: 18,
  depth: 35,
  spread: 35,
  visibleCards: 2,
  blur: 0,
};

function useIsDesktop(breakpointPx = 640) {
  const [isDesktop, setIsDesktop] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const mql = window.matchMedia(`(min-width: ${breakpointPx}px)`);
    setIsDesktop(mql.matches);
    const update = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [breakpointPx]);

  return isDesktop;
}

interface AchievementsShowcaseProps {
  /** "pinned" (default): fills a `fixed inset-0` ancestor whose own height is
   * the viewport, so `h-full` is correct — used on desktop's scroll-crossfade
   * pin. "flow": renders as an ordinary `min-h-screen` block in normal
   * document flow instead — used on mobile, where the pin/crossfade is
   * skipped in favor of normal scrolling (see TubeLightLogo.tsx), and where
   * `h-full` had nothing definite to size against, squeezing the heading,
   * carousel and caption together and making the caption overlap the image. */
  variant?: "pinned" | "flow";
}

// On desktop, rendered inside a `fixed inset-0` wrapper in TubeLightLogo
// whose opacity is scroll-driven (the achievements pin/crossfade) — this
// component takes only the `variant` prop, so memo still skips reconciling
// this subtree on every one of TubeLightLogo's scroll-frame re-renders as
// long as variant hasn't changed; only the wrapper's inline opacity style
// changes each frame while the pin is active.
function AchievementsShowcase({ variant = "pinned" }: AchievementsShowcaseProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = captions[activeIndex];
  const isDesktop = useIsDesktop();
  const carouselProps = isDesktop ? DESKTOP_CAROUSEL_PROPS : MOBILE_CAROUSEL_PROPS;
  const isFlow = variant === "flow";

  const items: DepthCarouselItem[] = useMemo(
    () => captions.map((c) => ({ image: `/achievements/${c.file}`, alt: c.caption })),
    []
  );

  return (
    <section
      className={`relative z-auto w-full flex flex-col items-center justify-center overflow-x-hidden ${
        isFlow ? "min-h-screen py-10 sm:py-16" : "h-full pt-16 sm:pt-24 pb-6 sm:pb-8"
      }`}
    >
      <Reveal>
        <h2 className="shiny-text relative font-[family-name:var(--font-black-ops)] text-3xl sm:text-6xl md:text-7xl lg:text-8xl font-normal leading-tight text-center mb-3 sm:mb-5 px-4 tracking-normal sm:tracking-wide">
          Achievements
        </h2>
      </Reveal>

      {/* DepthCarousel centers its cards vertically within this box's full height */}
      <div className={`w-full overflow-hidden ${isDesktop ? "h-[480px] md:h-[504px]" : isFlow ? "h-[250px] sm:h-[300px]" : "h-[240px] sm:h-[300px]"}`}>
        <DepthCarousel
          items={items}
          tilt={0}
          autoplay={true}
          showIndicators={false}
          onChange={(index) => setActiveIndex(index)}
          {...carouselProps}
        />
      </div>

      {/* Caption readout for the active card with stable min-height to avoid mobile layout jumps */}
      <div className={`w-full max-w-2xl sm:max-w-[84rem] mx-auto text-center px-4 min-h-[4rem] sm:min-h-[5.5rem] flex items-center justify-center ${isFlow ? "mt-4 sm:mt-6" : "mt-4 sm:mt-4"}`}>
        <p
          key={activeIndex}
          className="font-mono tracking-wide text-sm sm:text-xl md:text-2xl text-white leading-snug"
          style={{ animation: "fadeInUp 350ms cubic-bezier(0.16,1,0.3,1)" }}
        >
          {active?.caption}
        </p>
      </div>
    </section>
  );
}

export default memo(AchievementsShowcase);
