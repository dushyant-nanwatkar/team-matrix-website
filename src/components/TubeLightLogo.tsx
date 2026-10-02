"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import StrokeText from "./StrokeText";
import DotField from "./DotField";
import GradualBlur from "./GradualBlur";
import SponsorsSection from "./SponsorsSection";
import Footer from "./Footer";
import AchievementsShowcase from "./AchievementsShowcase";
import ScrollProgressBar from "./ScrollProgressBar";
import ScrollLineSidebar from "./ScrollLineSidebar";
import ThemeToggle from "./ThemeToggle";
import Reveal from "./Reveal";
import ApplyPopup from "./ApplyPopup";
import { ALUMNI } from "@/data/alumni";
import achievementCaptionsData from "../../public/achievements/captions.json";

interface AchievementCaption {
  file: string;
  caption: string;
  note?: string;
}
const achievementCaptions = achievementCaptionsData as AchievementCaption[];

const DRONE_1_COUNT = 60;

// Labels for the left-edge scroll sidebar, and the scrollY (in viewport
// heights) each one jumps to on click — picked to land inside that stage's
// own "fully visible" hold window rather than right at its fade-in edge.
// Kept in sync by hand with the pin/crossfade constants in the scroll rAF
// loop below (ACH_START_VH/ACH_BUDGET_VH, SPONSORS_START_VH/SPONSORS_BUDGET_VH).
const SCROLL_STAGES = [
  { label: "About", targetVh: 0 },
  { label: "Drone", targetVh: 0.6 },
  { label: "Achievements", targetVh: 1.9 },
  { label: "Sponsors", targetVh: 3.93 },
  { label: "Apply Now", targetVh: 5.6 },
];

// Runs before paint on the client (no SSR flash of the wrong value), falls
// back to a plain effect on the server where layout effects are a no-op.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function TubeLightLogo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const logoGroupRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const applyBtnRef = useRef<HTMLAnchorElement>(null);

  // Magnetic hover for the Apply Now button — nudges it toward the cursor
  // within its own bounds. Uses a ref instead of state so mousemove (which
  // fires far more often than a re-render should) never touches React.
  const handleApplyMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const el = applyBtnRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const relX = (e.clientX - rect.left - rect.width / 2) * 0.25;
    const relY = (e.clientY - rect.top - rect.height / 2) * 0.25;
    el.style.transform = `translate(${relX}px, ${relY}px) scale(1.05)`;
  };
  const handleApplyMouseLeave = () => {
    const el = applyBtnRef.current;
    if (el) el.style.transform = "translate(0px, 0px) scale(1)";
  };
  // Ratchet for the logo's center->nav scroll-scrub: the highest progress
  // reached so far, so scrolling back up doesn't pull the logo back toward
  // center once it has arrived (or partway arrived) at the nav slot.
  const [maxLogoNavT, setMaxLogoNavT] = useState(0);
  // The nav logo's vertical center once docked, measured from the real header
  // instead of hand-copied pixel guesses, so it lines up with the nav links'
  // own text row exactly (the header's height differs — hamburger vs. link
  // pills — below/above the md breakpoint). offsetHeight is used rather than
  // getBoundingClientRect because the header animates in with a CSS
  // translate-y that we don't want reflected in this measurement.
  const [navRowCenterY, setNavRowCenterY] = useState(32);

  const [isMovedToNav, setIsMovedToNav] = useState(false);
  const [readyForScroll, setReadyForScroll] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [droneOpacity, setDroneOpacity] = useState(0);
  const [achievementsProgress, setAchievementsProgress] = useState(0);
  const [sponsorsProgress, setSponsorsProgress] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  // One-time Apply Now popup state
  const [isApplyPopupOpen, setIsApplyPopupOpen] = useState(false);
  const applyPopupTriggeredRef = useRef(false);

  const handleCloseApplyPopup = useCallback(() => {
    setIsApplyPopupOpen(false);
  }, []);

  // Reading window.innerWidth/innerHeight during render (needed for the logo
  // scroll-scrub below) would differ between the server's render (no window)
  // and the client's — a hydration mismatch. `mounted` starts false on both,
  // so the first client render still matches the server, then flips true
  // before paint, well before the user could have scrolled.
  const [mounted, setMounted] = useState(false);
  useIsomorphicLayoutEffect(() => setMounted(true), []);

  // The elaborate fixed-position scroll-crossfade pin (drone -> Achievements
  // -> Sponsors) is desktop-only. On mobile it depended on precise vh-based
  // pin math inside a `fixed inset-0` box, which squeezed Achievements'
  // heading/carousel/caption together (making the caption overlap the
  // image), left it looking off-center, and could leave Sponsors' opacity
  // never actually reaching a visible value depending on exactly how much
  // the browser chrome ate into the real viewport height. Below this
  // breakpoint, Achievements and Sponsors render as ordinary normal-flow
  // sections instead — always visible, sized to their own content, with
  // `scroll-snap-align: center` (global `scroll-snap-type: y proximity` is
  // already set in globals.css) so scrolling still glides each one to
  // center instead of leaving it randomly cropped by the viewport edge.
  const [isDesktopPin, setIsDesktopPin] = useState(false);
  useIsomorphicLayoutEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    setIsDesktopPin(mql.matches);
    const update = (e: MediaQueryListEvent) => setIsDesktopPin(e.matches);
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  // Reached via the standalone NavBar's "About" link (`/#about`, used on every
  // other route) — skip the tubelight flicker replay and land scrolled to the
  // very top instead of jumping to the #about anchor mid-page, since the
  // scroll-scrubbed drone/about animations below assume a continuous scroll
  // from 0, not a cold jump to 100vh. Also true for `prefers-reduced-motion`
  // (same DepthCarousel/StrokeText check elsewhere in this codebase) — a
  // reduced-motion visitor shouldn't get the flicker forced on them either.
  // Read synchronously in a layout effect (not a lazy useState initializer)
  // so it still commits before paint without diverging from the server's
  // hash-less initial render.
  const [skipIntro, setSkipIntro] = useState(false);
  useIsomorphicLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (window.location.hash === "#about" || reducedMotion) {
      setSkipIntro(true);
    }
  }, []);

  // Measure the header's real height (top-4 offset + its own box height) so
  // the docked logo can center on the exact same row as the nav links,
  // instead of a hand-guessed pixel offset that drifts if the header's
  // padding/font-size ever changes.
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const measure = () => setNavRowCenterY(16 + header.offsetHeight / 2);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Preloading & intro transition sync state
  const [isAssetsLoaded, setIsAssetsLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [introFinished, setIntroFinished] = useState(false);

  // Tracks whether scroll animation sections should be visible
  const [worksRawVisible, setWorksRawVisible] = useState(false);

  // Video state & refs for About section video
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => { });
      }
    }
  };

  // In-memory frame buffer for drone 3D animation sequence
  const [seq1Images, setSeq1Images] = useState<HTMLImageElement[]>([]);

  // Reset scroll position to top on page load / refresh & disable browser scroll restoration
  useEffect(() => {
    if (typeof window !== "undefined") {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }
      window.scrollTo(0, 0);

      const handleBeforeUnload = () => {
        window.scrollTo(0, 0);
      };

      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    }
  }, []);

  // Preload transparent RGBA WebP frames for drone sequence + about-video.mp4,
  // plus every member/sponsor/alumni/achievement photo shown further down the
  // page — the loading bar isn't allowed to hit 100% (and the page doesn't
  // unlock) until all of it is actually cached, not just the intro sequence,
  // so those sections never show a broken/half-loaded image on first paint.
  // `totalCount` starts unknown (members/sponsors come from an API call) —
  // `tryFinish` is a no-op until it's set, but `loadedCount` still accrues in
  // the meantime, so drone frames that finish loading before the member/
  // sponsor fetch resolves aren't lost, just not reflected in the percentage
  // yet.
  useEffect(() => {
    let cancelled = false;
    let loadedCount = 0;
    let totalCount: number | null = null;

    const tryFinish = () => {
      if (totalCount === null) return;
      const pct = Math.min(100, Math.round((loadedCount / totalCount) * 100));
      setLoadProgress(pct);
      if (loadedCount >= totalCount) {
        setIsAssetsLoaded(true);
      }
    };

    const incrementLoad = () => {
      loadedCount++;
      tryFinish();
    };

    // 1) Sequence 1: drone.webm (60 frames) — a half-resolution (960x540)
    // tier lives alongside the full 1920x1080 one specifically for narrow
    // viewports: mobile downloads ~1.6MB instead of ~4.1MB for this sequence
    // (measured), and the canvas draws it scaled up anyway on a phone-sized
    // screen so there's no visible quality loss. Read once at load time
    // rather than reactively — this is a one-time asset-selection decision,
    // not something that should refetch everything on an orientation change.
    const droneFrameDir = window.innerWidth < 768 ? "drone_frames_mobile" : "drone_frames";
    const imgs1: HTMLImageElement[] = [];
    for (let i = 1; i <= DRONE_1_COUNT; i++) {
      const img = new window.Image();
      const idx = String(i).padStart(3, "0");
      img.onload = incrementLoad;
      img.onerror = incrementLoad;
      img.src = `/tempfiles/${droneFrameDir}/frame_${idx}.webp`;
      imgs1.push(img);
    }
    setSeq1Images(imgs1);

    // 2) Preload about-video.mp4
    const videoObj = document.createElement("video");
    videoObj.src = "/tempfiles/about-video.mp4";
    videoObj.preload = "auto";
    videoObj.oncanplaythrough = incrementLoad;
    videoObj.onerror = incrementLoad;
    videoObj.load();

    // 3) Members, sponsors, alumni, and achievements photos. Members/sponsors
    // are fs/JSON-backed and only knowable via their API routes; alumni and
    const fallbackAchievementUrls = achievementCaptions.map((c) => `/achievements/${c.file}`);
    const alumniUrls = ALUMNI.map((a) => a.avatarUrl);

    Promise.all([
      fetch("/api/members").then((r) => r.json()).catch(() => []),
      fetch("/api/sponsors").then((r) => r.json()).catch(() => []),
      fetch("/api/achievements").then((r) => r.json()).catch(() => []),
    ]).then(([members, sponsors, achievements]) => {
      if (cancelled) return;
      const memberUrls = (members as { avatarUrl?: string }[])
        .map((m) => m.avatarUrl)
        .filter((u): u is string => Boolean(u));
      const sponsorUrls = (sponsors as { src?: string }[])
        .map((s) => s.src)
        .filter((u): u is string => Boolean(u));
      const dynamicAchUrls = Array.isArray(achievements) && achievements.length > 0
        ? (achievements as { file?: string; image?: string }[])
            .map((a) => a.image || (a.file ? (a.file.startsWith("/") ? a.file : `/achievements/${a.file}`) : ""))
            .filter((u): u is string => Boolean(u))
        : fallbackAchievementUrls;

      const extraUrls = [...memberUrls, ...sponsorUrls, ...alumniUrls, ...dynamicAchUrls];
      totalCount = DRONE_1_COUNT + 1 + extraUrls.length;

      extraUrls.forEach((src) => {
        const img = new window.Image();
        img.onload = incrementLoad;
        img.onerror = incrementLoad;
        img.src = src;
      });

      tryFinish(); // reflects however many of the above already finished while we were fetching
    });

    // Generous fallback — this now waits on a lot more than the intro
    // sequence, so a slow connection gets more runway before we give up and
    // let the user in anyway rather than stranding them on the loading screen.
    const fallbackTimer = setTimeout(() => {
      setIsAssetsLoaded(true);
      setLoadProgress(100);
    }, 20000);

    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
    };
  }, []);

  // Synchronize: after intro + assets + 3s intentional delay → set readyForScroll
  // Then the FIRST scroll/wheel/key event triggers isMovedToNav (task 5 + 5.1)
  useEffect(() => {
    if (introFinished && isAssetsLoaded) {
      const delayTimer = setTimeout(() => {
        setReadyForScroll(true);
      }, 3000); // Intentional 3s loading screen delay

      // Allow user to skip remaining wait immediately by pressing ArrowDown/scroll
      const earlyTrigger = (e?: Event) => {
        if (e instanceof KeyboardEvent && !["ArrowDown", "ArrowUp", "PageDown", "PageUp", " ", "Spacebar"].includes(e.key)) {
          return;
        }
        clearTimeout(delayTimer);
        setReadyForScroll(true);
      };

      window.addEventListener("wheel", earlyTrigger, { once: true, passive: true });
      window.addEventListener("touchmove", earlyTrigger, { once: true, passive: true });
      window.addEventListener("keydown", earlyTrigger, { once: true, passive: true });
      window.addEventListener("team-matrix-scroll-trigger", earlyTrigger, { once: true });

      return () => {
        clearTimeout(delayTimer);
        window.removeEventListener("wheel", earlyTrigger);
        window.removeEventListener("touchmove", earlyTrigger);
        window.removeEventListener("keydown", earlyTrigger);
        window.removeEventListener("team-matrix-scroll-trigger", earlyTrigger);
      };
    }
  }, [introFinished, isAssetsLoaded]);

  // Scroll-triggered transition: first scroll after ready → fly logo to nav
  useEffect(() => {
    if (!readyForScroll || isMovedToNav) return;

    const triggerNav = () => {
      if (typeof document !== "undefined") {
        document.body.style.overflow = "auto";
      }
      setIsMovedToNav(true);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", " ", "Spacebar"].includes(e.key)) {
        triggerNav();
      }
    };

    window.addEventListener("scroll", triggerNav, { once: true, passive: true });
    window.addEventListener("wheel", triggerNav, { once: true, passive: true });
    window.addEventListener("touchmove", triggerNav, { once: true, passive: true });
    window.addEventListener("keydown", handleKeyDown, { once: true, passive: true });
    window.addEventListener("team-matrix-scroll-trigger", triggerNav, { once: true });

    return () => {
      window.removeEventListener("scroll", triggerNav);
      window.removeEventListener("wheel", triggerNav);
      window.removeEventListener("touchmove", triggerNav);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("team-matrix-scroll-trigger", triggerNav);
    };
  }, [readyForScroll, isMovedToNav]);

  // One-time Apply Now popup trigger: pops up as soon as tubelight logo reaches the navigation bar
  useEffect(() => {
    if (applyPopupTriggeredRef.current) return;

    if (maxLogoNavT >= 0.92) {
      applyPopupTriggeredRef.current = true;
      const timer = setTimeout(() => {
        setIsApplyPopupOpen(true);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [maxLogoNavT]);

  // Fallback trigger if logo navigation was initiated via key/touch and settled
  useEffect(() => {
    if (applyPopupTriggeredRef.current) return;

    if (isMovedToNav) {
      const timer = setTimeout(() => {
        if (!applyPopupTriggeredRef.current) {
          applyPopupTriggeredRef.current = true;
          setIsApplyPopupOpen(true);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isMovedToNav]);

  // Tubelight Intro GSAP Sequence — skipped when `skipIntro` is set (see
  // above), jumping straight to the flicker's fully-lit end state instead.
  useGSAP(
    () => {
      const logoGroup = logoGroupRef.current;
      if (!logoGroup) return;

      if (skipIntro) {
        gsap.set(logoGroup, { opacity: 1 });
        setIntroFinished(true);
        return;
      }

      // Lock body scrolling during tubelight flicker intro
      if (typeof document !== "undefined") {
        document.body.style.overflow = "hidden";
      }

      const tl = gsap.timeline({
        onComplete: () => {
          // Signal that tubelight intro has finished
          setIntroFinished(true);
        },
      });

      // Tubelight turn-on flicker sequence
      tl.set(logoGroup, { opacity: 0 })
        .to(logoGroup, { opacity: 0.1, duration: 0.12 })
        .to(logoGroup, { opacity: 0, duration: 0.06 })
        .to(logoGroup, { opacity: 0.85, duration: 0.05 })
        .to(logoGroup, { opacity: 0.15, duration: 0.1 })
        .to(logoGroup, { opacity: 0.95, duration: 0.04 })
        .to(logoGroup, { opacity: 0.2, duration: 0.08 })
        .to(logoGroup, { opacity: 1, duration: 0.12 })
        .to(logoGroup, { opacity: 0.85, duration: 0.06 })
        .to(logoGroup, { opacity: 1, duration: 0.15 });
    },
    { scope: containerRef, dependencies: [skipIntro], revertOnUpdate: true }
  );

  // 3D Canvas Frame Renderer for Drone Sequence
  useEffect(() => {
    if (!seq1Images.length) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Canvas pixel size only needs to change when the viewport itself resizes,
    // not on every animation frame. Measuring it inside the scroll-driven
    // render loop (as this used to) forces a synchronous full-page layout
    // reflow 60x/second for the entire remaining lifetime of the page —
    // increasingly janky ("glitchy") the more DOM sits below the fold
    // (Achievements/Sponsors/Footer), since every reflow has to lay all of
    // it out even though the canvas is long past being relevant there.
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    let rafId: number;
    let canvasCleared = true;
    // This loop runs via requestAnimationFrame for the entire lifetime of
    // the page (never stops), and every call below used to unconditionally
    // run all of P/achievements/sponsors math and call ~6 setState functions
    // — forcing a full re-render of this whole component 60x/sec forever,
    // even while the page isn't actually scrolling at all. That's most
    // visible (reported as "glitching") while horizontally wheel-scrolling
    // through the Achievements carousel: DepthCarousel's own wheel handler
    // calls preventDefault() on that gesture, so window.scrollY never
    // changes during that whole interaction, but this loop kept
    // re-rendering the parent anyway, competing with DepthCarousel's GSAP
    // tweens for the main thread. Skip
    // everything below whenever neither the scroll position nor the
    // viewport size actually changed since the last frame.
    let lastScrollY = -1;
    let lastInnerWidth = -1;
    let lastInnerHeight = -1;

    const render = () => {
      const scrollY = window.scrollY;
      if (scrollY === lastScrollY && window.innerWidth === lastInnerWidth && window.innerHeight === lastInnerHeight) {
        rafId = requestAnimationFrame(render);
        return;
      }
      lastScrollY = scrollY;
      lastInnerWidth = window.innerWidth;
      lastInnerHeight = window.innerHeight;

      // ─── DRONE SCROLL BUDGET (decoupled from total page height) ───────────────
      // P is computed against a 400vh budget: the original 200vh drone timeline
      // (fade-in/play/hold/fade-out, unchanged in duration and relative pacing)
      // plus two extra viewport-heights (200vh) of pure hold added to the very
      // front, so the About section stays on screen for two full extra scrolls
      // before anything starts transitioning to the drone. Every stage below
      // is simply the old 200vh schedule shifted 200vh later.
      const DRONE_VH = 4.0; // 400vh expressed as viewport-height multiples
      const droneMaxPx = DRONE_VH * window.innerHeight;
      const P = Math.min(1, Math.max(0, scrollY / droneMaxPx));
      setScrollProgress(P);
      // Logo center -> nav dock glide: its own short, fixed-vh window,
      // deliberately NOT a fraction of P/DRONE_VH. It used to be (still
      // reads that way below in a couple of comments this doesn't touch),
      // but as the About-hold budget above grew across a couple of "stay on
      // About one more scroll" requests, DRONE_VH grew with it and this being
      // P-relative meant the dock glide silently grew right along with it —
      // up to 224vh of scroll to finish, i.e. the logo visibly crawling
      // toward the nav slot for over two screens' worth of scrolling before
      // settling, most noticeable on mobile where that's many swipes. 15vh
      // is quick enough to read as near-instant on both mobile and desktop
      // while keeping the glide (rather than an abrupt teleport), and no
      // longer moves if the About-hold duration changes again.
      const LOGO_NAV_VH = 0.15;
      const rawLogoNavT = Math.min(1, Math.max(0, scrollY / (LOGO_NAV_VH * window.innerHeight)));
      setMaxLogoNavT((prev) => (rawLogoNavT > prev ? rawLogoNavT : prev));

      // ─── OUR STORIES VISIBILITY ────────────────────────────────────────
      // Visible once drone animation wraps up (P >= 0.975, i.e. 390vh)
      setWorksRawVisible(P >= 0.975);

      let localProgress = 0;
      let opacity = 0;

      // Sequence Stage 1: drone.webm (0.00 -> 1.00)
      // Stage 0 (0.00 -> 0.56, i.e. 0-224vh): About Section held on screen; drone canvas hidden (opacity = 0)
      // Stage 0.5 (0.56 -> 0.59, i.e. 224-236vh): About Section fades out; drone canvas fades in (opacity 0 -> 1), frame 0 static
      // Stage 1 (0.59 -> 0.775, i.e. 236-310vh): drone.webm scroll animation plays (0% to 100% of seq1Images)
      // Stage 1.5 (0.775 -> 0.825, i.e. 310-330vh): Hold drone.webm last frame static
      // Stage 2 (0.825 -> 0.875, i.e. 330-350vh): Fade out drone canvas smoothly — finishes one full
      //   viewport-height of scroll before Achievements' top can reach the bottom edge.
      // Stage 3 (0.875 -> 1.00, i.e. 350-400vh): Fully hidden — nothing left to draw, canvas is inert.
      if (P < 0.56) {
        opacity = 0; // Completely hidden while About Team Matrix box takes over screen
        localProgress = 0;
      } else if (P < 0.59) {
        opacity = (P - 0.56) / 0.03; // Smooth fade in of drone canvas as About box fades out
        localProgress = 0;
      } else if (P < 0.775) {
        opacity = 1;
        localProgress = (P - 0.59) / 0.185; // Plays 100% of drone.webm
      } else if (P < 0.825) {
        // Hold last frame static
        opacity = 1;
        localProgress = 1;
      } else if (P < 0.875) {
        // Fade out drone canvas smoothly
        opacity = Math.max(0, 1 - (P - 0.825) / 0.05);
        localProgress = 1;
      } else {
        opacity = 0;
        localProgress = 1;
      }
      setDroneOpacity(opacity);

      // ─── ACHIEVEMENTS PIN + CROSSFADE ───────────────────────────────────
      // Achievements is `position: fixed` too (see JSX below), driven by its
      // own scroll budget instead of arriving via normal document flow. Its
      // window starts at 330vh — the same point the drone's own stage-2
      // fade-out (P 0.825-0.875, i.e. 330vh-350vh) begins — so the two
      // overlap and genuinely cross-dissolve instead of one finishing before
      // the other starts. No DOM read needed (unlike the old entry guard this
      // replaces): both fades are pure scroll-position math.
      const ACH_START_VH = 3.3;
      const ACH_BUDGET_VH = 2.8; // fade-in (0.6vh) + hold (1.6vh, "a few scrolls") + fade-out (0.6vh)
      const achStartPx = ACH_START_VH * window.innerHeight;
      const achBudgetPx = ACH_BUDGET_VH * window.innerHeight;
      const achP = Math.min(1, Math.max(0, (scrollY - achStartPx) / achBudgetPx));
      setAchievementsProgress(achP);

      // Sponsors pin/crossfade — same recipe as Achievements above. Its window
      // starts at 550vh, exactly where Achievements' own fade-out begins
      // (achStartPx + 0.786*achBudgetPx = 330vh + 220vh = 550vh), so the two
      // genuinely cross-dissolve instead of Sponsors merely sliding up via
      // normal scroll once Achievements has already gone fully transparent.
      const SPONSORS_START_VH = 5.5;
      const SPONSORS_BUDGET_VH = 2.0; // fade-in (0.214) + hold (0.572) + fade-out (0.214), same split as Achievements
      const sponsorsStartPx = SPONSORS_START_VH * window.innerHeight;
      const sponsorsBudgetPx = SPONSORS_BUDGET_VH * window.innerHeight;
      const sponsorsP = Math.min(1, Math.max(0, (scrollY - sponsorsStartPx) / sponsorsBudgetPx));
      setSponsorsProgress(sponsorsP);

      // Once fully faded there is nothing left to draw — clear the canvas
      // once and then leave it alone instead of re-clearing and re-measuring
      // every frame for the rest of the page's scroll range.
      if (opacity <= 0.01) {
        if (!canvasCleared) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          canvasCleared = true;
        }
        rafId = requestAnimationFrame(render);
        return;
      }
      canvasCleared = false;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const frameIdx = Math.min(
        seq1Images.length - 1,
        Math.floor(localProgress * (seq1Images.length - 1))
      );
      const img = seq1Images[frameIdx];

      if (img && img.complete && img.naturalWidth > 0) {
        ctx.globalAlpha = opacity;

        // The drone frames are 16:9 (landscape). On a landscape/desktop
        // canvas, COVER (fill the screen, cropping overflow) looks right.
        // On a portrait mobile canvas, COVER would crop most of the frame
        // away sideways to fill the tall viewport — instead CONTAIN so the
        // whole drone fits on screen, centered, with the page's own
        // background showing through the letterboxed top/bottom.
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const isPortrait = canvas.width < canvas.height;
        const ratio = isPortrait
          ? Math.min(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight)
          : Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);

        const drawW = img.naturalWidth * ratio;
        const drawH = img.naturalHeight * ratio;
        const offsetX = (canvas.width - drawW) / 2;
        const offsetY = (canvas.height - drawH) / 2;

        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

        // On mobile (contain mode), the frame's top/bottom edges land in the
        // middle of the screen as a hard rectangular cutoff. Feather them
        // into transparency so the drone fades into the background instead
        // of showing an obvious box edge.
        if (isPortrait) {
          const fadeHeight = Math.min(90 * dpr, drawH * 0.3);
          ctx.save();
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = "destination-out";

          const topFade = ctx.createLinearGradient(0, offsetY, 0, offsetY + fadeHeight);
          topFade.addColorStop(0, "rgba(0,0,0,1)");
          topFade.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = topFade;
          ctx.fillRect(offsetX, offsetY, drawW, fadeHeight);

          const bottomFade = ctx.createLinearGradient(0, offsetY + drawH - fadeHeight, 0, offsetY + drawH);
          bottomFade.addColorStop(0, "rgba(0,0,0,0)");
          bottomFade.addColorStop(1, "rgba(0,0,0,1)");
          ctx.fillStyle = bottomFade;
          ctx.fillRect(offsetX, offsetY + drawH - fadeHeight, drawW, fadeHeight);

          ctx.restore();
        }
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [seq1Images]);

  const isExplodedCalloutsVisible = scrollProgress >= 0.74 && scrollProgress <= 0.88;
  const pauseProgress = Math.min(1, Math.max(0, (scrollProgress - 0.76) / 0.10));

  let aboutOpacity = 0;
  if (isMovedToNav) {
    if (scrollProgress <= 0.56) {
      aboutOpacity = 1;
    } else if (scrollProgress <= 0.59) {
      aboutOpacity = (0.59 - scrollProgress) / 0.03;
    } else {
      aboutOpacity = 0;
    }
  }

  // Achievements pin/crossfade — see the ACH_START_VH/ACH_BUDGET_VH comment
  // in the scroll rAF loop above. Symmetric 0.6vh fade-in/fade-out either
  // side of a 1.6vh hold, expressed as fractions of the 2.8vh total budget.
  let achievementsOpacity = 0;
  if (achievementsProgress < 0.214) {
    achievementsOpacity = achievementsProgress / 0.214; // crossfades in against the drone's fade-out
  } else if (achievementsProgress < 0.786) {
    achievementsOpacity = 1; // held on screen for a few scrolls
  } else {
    achievementsOpacity = Math.max(0, 1 - (achievementsProgress - 0.786) / 0.214); // crossfades out into Sponsors
  }

  // Sponsors pin/crossfade — see the SPONSORS_START_VH/SPONSORS_BUDGET_VH
  // comment in the scroll rAF loop above. Same fade-in/hold/fade-out split
  // as Achievements.
  let sponsorsOpacity = 0;
  if (sponsorsProgress < 0.214) {
    sponsorsOpacity = sponsorsProgress / 0.214; // crossfades in against Achievements' own fade-out
  } else if (sponsorsProgress < 0.786) {
    sponsorsOpacity = 1; // held on screen
  } else {
    sponsorsOpacity = Math.max(0, 1 - (sponsorsProgress - 0.786) / 0.214); // crossfades out into the Apply CTA
  }

  // Apply CTA "weight" for the scroll sidebar — ramps 0->1 across exactly the
  // same window Sponsors ramps 1->0, so the sidebar hands off cleanly.
  const applyWeight = Math.min(1, Math.max(0, (sponsorsProgress - 0.786) / 0.214));

  // Per-stage weights (0-1) for the scroll-driven sidebar — see ScrollLineSidebar.
  const scrollStageWeights: [number, number, number, number, number] = [
    aboutOpacity,
    droneOpacity,
    achievementsOpacity,
    sponsorsOpacity,
    applyWeight,
  ];

  // Stable reference (no deps — only reads the module-level SCROLL_STAGES
  // constant and window) so ScrollLineSidebar's memo comparator, which checks
  // this by identity, isn't defeated by a new closure every scroll frame.
  const handleScrollStageSelect = useCallback((index: number) => {
    const stage = SCROLL_STAGES[index];
    if (!stage || typeof window === "undefined") return;
    window.scrollTo({ top: stage.targetVh * window.innerHeight, behavior: "smooth" });
  }, []);

  // Auto pause about-video when user scrolls away
  useEffect(() => {
    if (aboutOpacity < 0.05 && videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [aboutOpacity]);

  // Lock scroll + allow Escape while the mobile nav menu is open
  useEffect(() => {
    if (!menuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  // Our Stories visible when: intro done + raw scroll past 2-viewport delay
  const worksVisible = isMovedToNav && worksRawVisible;

  // ─── LOGO CENTER -> NAV SCRUB ─────────────────────────────────────────
  // The logo's move from the centered hero position to the small nav slot is
  // tied directly to scroll distance — its own short LOGO_NAV_VH window (see
  // the rAF loop above), deliberately independent of the About-hold duration
  // — instead of auto-playing on a fixed-duration CSS transition. maxLogoNavT
  // only ever grows, so once the logo has reached — or partly reached — the
  // nav slot, scrolling back up doesn't pull it back toward center; it stays put.
  // Deliberately NOT gated on isMovedToNav: that flag flips on a native event
  // listener while this is driven by the scroll-position rAF loop, and tying
  // this to a second, independently-updated flag is an unnecessary source of
  // desync — maxLogoNavT alone already fully captures "has scrolling started".
  const logoNavT = maxLogoNavT;
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  // Shared crossfade blur: each fixed "slide" (drone/about/achievements/sponsors)
  // blurs out as its own opacity approaches 0 and sharpens back up as it approaches
  // 1, so the old slide fades+blurs while the new one unfades+unblurs at the same
  // scroll-driven rate — same opacity value drives both, just two CSS properties.
  const CROSSFADE_MAX_BLUR_PX = 8;
  const crossfadeBlur = (opacity: number) => `blur(${(1 - opacity) * CROSSFADE_MAX_BLUR_PX}px)`;
  // Fall back to the same fixed numbers on the server and on the client's
  // first (pre-mount) render — see the `mounted` comment above.
  const viewportWidth = mounted ? window.innerWidth : 1024;
  const viewportHeight = mounted ? window.innerHeight : 800;
  // Matches the previous responsive center sizes: w-52/sm:w-72/md:w-88(*)/lg:w-[380px].
  // (*) "w-88" isn't a real Tailwind size, so it silently fell back to the sm value
  // before — 352px is clearly what it meant. Nav (docked) sizes are ~5px smaller than
  // the old w-12/sm:w-14/md:w-16, and centered on navRowCenterY rather than pinned to
  // a fixed top offset, so the logo sits level with the nav links, not just near them.
  const logoGeometry =
    viewportWidth >= 1024
      ? { start: 380, end: 59 }
      : viewportWidth >= 768
        ? { start: 352, end: 59 }
        : viewportWidth >= 640
          ? { start: 288, end: 51 }
          : { start: 208, end: 43 };
  // Each GradualBlur div is its own full-viewport-width backdrop-filter layer
  // — real GPU compositing cost, worse on mobile GPUs. Halving the layer
  // count below the same 768px breakpoint used elsewhere keeps the fade
  // visually similar (still a smooth gradient, just fewer steps) while
  // cutting that cost roughly in half on phones.
  const gradualBlurDivCount = viewportWidth < 768 ? 4 : 8;
  const logoSize = lerp(logoGeometry.start, logoGeometry.end, logoNavT);
  const logoTopEdge = lerp(
    viewportHeight / 2 - logoGeometry.start / 2,
    navRowCenterY - logoGeometry.end / 2,
    logoNavT
  );

  return (
    <div ref={containerRef} className="relative w-full bg-black text-white select-none">
      <ScrollProgressBar />

      {/* Interactive Canvas DotField Background */}
      <div className="fixed inset-0 z-0">
        <DotField
          dotRadius={1.6}
          dotSpacing={16}
          bulgeStrength={70}
          sparkle={true}
          waveAmplitude={0}
          gradientFrom="rgba(239, 68, 68, 0.35)"
          gradientTo="rgba(185, 28, 28, 0.15)"
        />
      </div>

      {/* ── SCROLL ANCHORS ── */}
      {/* #about  → About Team Matrix section (visible 0–1.98vh, anchor at 100vh) */}
      <div id="about"  aria-hidden="true" style={{ position: "absolute", top: "100vh",  left: 0, width: 1, height: 1, pointerEvents: "none" }} />
      {/* #drones → drone animation starts at P≈0.20 of 200vh = ~40vh scroll */}
      <div id="drones" aria-hidden="true" style={{ position: "absolute", top: "200vh",  left: 0, width: 1, height: 1, pointerEvents: "none" }} />

      {/* THREE-ISLAND NAV: Left | Center logo | Right */}
      <header
        ref={headerRef}
        className={`fixed top-4 left-0 right-0 z-40 flex items-center justify-between px-5 sm:px-8 pointer-events-none transition-all duration-700 ${isMovedToNav ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}
      >
        {/* LEFT ISLAND: About Members Gallery — desktop only */}
        <nav className="hidden md:flex pointer-events-auto items-center gap-0.5 px-2 py-1.5 rounded-full bg-[#0d0d14]/80 backdrop-blur-xl border border-white/[0.07] shadow-[0_8px_32px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]">
          {([
            { label: "About",   href: "#about"    },
            { label: "Members", href: "/members"  },
            { label: "Stories", href: "/gallery"  },
          ] as { label: string; href: string }[]).map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="px-4 py-1.5 rounded-full text-sm font-sans font-medium text-slate-300/80 transition-all duration-200 hover:text-white hover:bg-white/[0.08] active:scale-95 whitespace-nowrap"
            >
              {label}
            </Link>
          ))}
        </nav>
        {/* Mobile spacer — balances the hamburger button so the logo stays centered */}
        <div className="md:hidden w-11 h-11" aria-hidden="true" />

        {/* CENTER SPACER — logo is positioned by logoGroupRef */}
        <div className="flex-1" />

        {/* RIGHT ISLAND: Alumni Projects Apply — desktop only */}
        <nav className="hidden md:flex pointer-events-auto items-center gap-0.5 px-2 py-1.5 rounded-full bg-[#0d0d14]/80 backdrop-blur-xl border border-white/[0.07] shadow-[0_8px_32px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]">
          {([
            { label: "Alumni",   href: "/alumni"   },
            { label: "Projects", href: "/projects" },
          ] as { label: string; href: string }[]).map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="px-4 py-1.5 rounded-full text-sm font-sans font-medium text-slate-300/80 transition-all duration-200 hover:text-white hover:bg-white/[0.08] active:scale-95 whitespace-nowrap"
            >
              {label}
            </Link>
          ))}
          <div className="w-px h-4 bg-white/10 mx-1" />
          <ThemeToggle />
          <div className="w-px h-4 bg-white/10 mx-1" />
          <Link
            href="/apply"
            className="px-4 py-1.5 rounded-full text-sm font-sans font-semibold text-red-300 bg-red-950/50 border border-red-500/30 transition-all duration-200 hover:bg-red-900/60 hover:text-red-200 active:scale-95 whitespace-nowrap"
          >
            Apply
          </Link>
        </nav>

        {/* Hamburger — mobile only */}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          className="md:hidden pointer-events-auto flex items-center justify-center w-11 h-11 rounded-full bg-[#0d0d14]/80 backdrop-blur-xl border border-white/[0.07] shadow-[0_8px_32px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] active:scale-95 transition-transform"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="text-slate-200">
            {menuOpen ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </header>

      {/* Mobile menu overlay — z-[60], above the "About Team Matrix" box and
          logo group (both z-50): if the user scrolls back up near the top
          (About visible again, aboutOpacity > 0) and then opens the
          hamburger menu, the menu used to render at z-[45] — BELOW those
          z-50 elements — so About's own semi-transparent panels sat on top
          of the menu, letting its text ghost through instead of showing a
          clean opaque menu. Reported as "menu not rendering properly, only
          on the about page" (i.e. only when About's fade-in window is
          active). NavBar.tsx's mobile menu never hit this because that
          component has nothing else at z-50 on the pages it's used on. */}
      <div
        className={`md:hidden fixed inset-0 z-[60] transition-opacity duration-300 ${
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
        <nav
          className={`absolute top-20 left-5 right-5 rounded-3xl bg-[#0d0d14]/95 border border-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-2 flex flex-col transition-all duration-300 ${
            menuOpen ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"
          }`}
        >
          {([
            { label: "About",    href: "#about"    },
            { label: "Members",  href: "/members"  },
            { label: "Stories",  href: "/gallery"  },
            { label: "Alumni",   href: "/alumni"   },
            { label: "Projects", href: "/projects" },
          ] as { label: string; href: string }[]).map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="px-4 py-3.5 rounded-2xl text-base font-sans font-medium text-slate-300/85 transition-colors hover:text-white hover:bg-white/[0.06]"
            >
              {label}
            </Link>
          ))}
          {/* Theme Toggle — mobile */}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="font-sans text-base font-medium text-slate-300/85">Theme</span>
            <ThemeToggle />
          </div>
          <Link
            href="/apply"
            onClick={() => setMenuOpen(false)}
            className="mt-1 px-4 py-3.5 rounded-2xl text-base font-sans font-semibold text-center text-red-300 bg-red-950/50 border border-red-500/30 transition-colors hover:bg-red-900/50 hover:text-red-200"
          >
            Apply
          </Link>
        </nav>
      </div>

      {/* SCROLL PROGRESS SIDEBAR — About/Drone/Achievements/Sponsors/Apply,
          each item's line + label weighted by that stage's own crossfade
          opacity, fading in once the header itself does. Desktop only. */}
      <ScrollLineSidebar
        stages={SCROLL_STAGES}
        weights={scrollStageWeights}
        visible={isMovedToNav}
        onSelect={handleScrollStageSelect}
      />

      {/* LOGO & TEXT ANIMATION CONTAINER */}
      <div ref={logoGroupRef} className="fixed inset-0 z-50 pointer-events-none">
        {/* CENTER MATRIX LOGO EMBLEM (Transitions to top acrylic navbar center) */}
        <div
          className={
            logoNavT > 0
              ? "fixed left-1/2 pointer-events-none"
              : "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none w-52 sm:w-72 md:w-88 lg:w-[380px]"
          }
          // Before scrolling starts, plain CSS classes above size this correctly on
          // any device from the very first paint (no window read needed). Once
          // logoNavT is above 0 — which can only happen after a real scroll, i.e.
          // always client-side, past hydration — this inline style takes over for
          // the scroll-scrubbed position/size.
          style={
            logoNavT > 0
              ? { top: `${logoTopEdge}px`, transform: "translateX(-50%)", width: `${logoSize}px` }
              : undefined
          }
        >
          <Image
            src="/tempfiles/matrixlogo (2).png"
            alt="Matrix Logo"
            width={500}
            height={500}
            className="w-full h-auto object-contain"
            priority
          />
        </div>

        {/* MOBILE (< sm): stacked ABOVE the logo — the desktop "beside logo" layout
            below needs way more horizontal room than a phone has (it starts
            clipping off the left edge well under 640px). */}
        <div
          className={`sm:hidden fixed left-1/2 -translate-x-1/2 top-[12%] flex flex-col items-center text-center pointer-events-none transition-all duration-500 ease-out ${isMovedToNav ? "opacity-0 scale-90" : "opacity-100 scale-100"
            }`}
        >
          <div className="w-[150px]">
            <StrokeText
              text="TEAM"
              strokeColor="#000000"
              fillColor="#F8FAFC"
              strokeWidth={2}
              drawDuration={1.2}
              fillDelay={0.1}
              stagger={0.07}
              fontSize={28}
              fontWeight={400}
              letterSpacing={8}
              trigger="mount"
              fillMode="fade"
              fontFamily="var(--font-black-ops), 'Black Ops One', system-ui, sans-serif"
            />
          </div>
          <div className="w-[210px] -mt-1">
            <StrokeText
              text="MATRIX"
              strokeColor="#000000"
              fillColor="#EF4444"
              strokeWidth={1.6}
              drawDuration={1.5}
              fillDelay={0.15}
              stagger={0.05}
              fillMode="wipe"
              fontSize={54}
              fontWeight={400}
              letterSpacing={-1}
              trigger="mount"
              fontFamily="var(--font-black-ops), 'Black Ops One', system-ui, sans-serif"
            />
          </div>
        </div>

        {/* sm and up: stacked to the LEFT of the logo */}
        <div
          className={`hidden sm:flex fixed sm:right-[calc(50%+9.5rem)] md:right-[calc(50%+12.5rem)] lg:right-[calc(50%+14.5rem)] top-1/2 -translate-y-1/2 flex-col items-center justify-center text-center pointer-events-none transition-all duration-500 ease-out ${isMovedToNav ? "opacity-0 scale-90" : "opacity-100 scale-100"
            }`}
        >
          <div className="w-[300px] md:w-[380px] lg:w-[460px]">
            <StrokeText
              text="TEAM"
              strokeColor="#000000"
              fillColor="#F8FAFC"
              strokeWidth={2.6}
              drawDuration={1.4}
              fillDelay={0.1}
              stagger={0.07}
              fontSize={58}
              fontWeight={400}
              letterSpacing={14}
              trigger="mount"
              fillMode="fade"
              fontFamily="var(--font-black-ops), 'Black Ops One', system-ui, sans-serif"
            />
          </div>

          <div className="w-[440px] md:w-[580px] lg:w-[680px] -mt-2 sm:-mt-4">
            <StrokeText
              text="MATRIX"
              strokeColor="#000000"
              fillColor="#EF4444"
              strokeWidth={2.2}
              drawDuration={1.8}
              fillDelay={0.2}
              stagger={0.06}
              fillMode="wipe"
              fontSize={115}
              fontWeight={400}
              letterSpacing={-1}
              trigger="mount"
              fontFamily="var(--font-black-ops), 'Black Ops One', system-ui, sans-serif"
            />
          </div>
        </div>

        {/* INITIAL PAGE LOADING INDICATOR BELOW LOGO */}
        {!isMovedToNav && (
          <div
            className={`fixed left-1/2 -translate-x-1/2 top-[70%] sm:top-[74%] flex flex-col items-center justify-center space-y-3.5 pointer-events-none z-50 transition-opacity duration-700`}
          >
            {/* Loading progress — fades once assets ready */}
            <div className={`flex flex-col items-center gap-3 transition-opacity duration-700 ${readyForScroll ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
              <div className="thought-line-shimmer text-center font-mono text-xs sm:text-sm tracking-[0.4em] text-red-500 font-bold uppercase">
                loading {Math.round(loadProgress)}%
              </div>
              {/* Material You Capsule Loading Bar */}
              <div className="w-56 sm:w-72 md:w-80 h-2.5 sm:h-3 bg-slate-950/80 rounded-full overflow-hidden border border-red-500/30 p-0.5 backdrop-blur-md">
                <div
                  className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-red-400 rounded-full transition-all duration-300"
                  style={{ width: `${loadProgress}%` }}
                />
              </div>
            </div>
            {/* SCROLL TO ENTER — appears after 3s delay */}
            <div className={`flex flex-col items-center gap-3 transition-all duration-700 ${readyForScroll ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <div className="px-5 py-2 rounded-full border border-red-500/40 bg-black/50 text-red-300 text-xs font-mono tracking-[0.3em] backdrop-blur-md animate-pulse">
                SCROLL TO ENTER
              </div>
              <div className="w-5 h-9 rounded-full border-2 border-red-500/40 flex items-start justify-center p-1 bg-black/30 backdrop-blur-sm">
                <div className="w-1.5 h-2.5 bg-red-500/80 rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        )}

        {/* ABOUT TEAM MATRIX & VIDEO SECTION - Open layout split only by a neon red line */}
        <div
          className="fixed top-1/2 left-1/2 w-[92vw] max-w-[1380px] transition-all duration-700 ease-out z-50 pointer-events-auto"
          style={{
            opacity: aboutOpacity,
            transform: `translate(-50%, -50%) scale(${0.95 + 0.05 * aboutOpacity}) translateY(${(1 - aboutOpacity) * 20}px)`,
            filter: crossfadeBlur(aboutOpacity),
            pointerEvents: aboutOpacity > 0.05 ? "auto" : "none",
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 lg:gap-10 items-center text-left">

            {/* LEFT HALF: ABOUT TEAM MATRIX */}
            <div className="flex flex-col justify-between space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-y-1.5 border-b border-red-500/30 pb-3">
                <h2 className="text-xs sm:text-sm md:text-base font-mono tracking-[0.08em] sm:tracking-[0.2em] text-red-400 font-bold uppercase whitespace-nowrap">
                  About
                </h2>
              </div>
              <p className="text-xs sm:text-sm md:text-base text-slate-200 leading-relaxed font-sans font-normal tracking-wide max-h-[45vh] lg:max-h-[360px] overflow-y-auto pr-3 scrollbar-thin scrollbar-thumb-red-500/40">
                Team Matrix is the official robotics team at K.K. Wagh Institute of Engineering Education and Research, Nashik (An Autonomous Institute), affiliated with SPPU. Our team unites passionate students from diverse technical branches, including Mechanical, Electronics & Telecommunication, Robotics, and Computer Engineering. By fostering collaboration across disciplines, we develop innovative robotic solutions that highlight the strength of interdisciplinary engineering. Our journey is marked by numerous achievements, including participation in Techfest IIT Bombay 2024, Robotex National Championship 2024, IRoCU-2024 (ISRO Robotics Challenge, URSC Bengaluru), IRoCU-2025 and qualifying for Robotex International 2023 to represent India. We have also showcased our expertise at Robotex National Championship 2023, Robotex Maharashtra Zonal, BITS Goa QUARK, IIT Bombay Techfest, VJTI Roborace, LOGMIEER Roborace, GGSP Technical Fest Roborace, and Sapkal College Roborace.
              </p>
            </div>

            {/* CENTER NEON RED SEPARATING LINE */}
            <div className="hidden lg:block w-[2px] h-[340px] bg-gradient-to-b from-red-500/0 via-red-500 to-red-500/0 rounded-full my-auto" />

            {/* RIGHT HALF: 16:9 VIDEO PLAYBACK */}
            <div className="flex flex-col justify-between space-y-4">
              {/* 16:9 Aspect Ratio Video Container */}
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-red-500/35 bg-black/90 group">
                <video
                  ref={videoRef}
                  src="/tempfiles/about-video.mp4"
                  muted
                  controls
                  preload="metadata"
                  playsInline
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  className="w-full h-full object-cover"
                />
                {!isPlaying && (
                  <button
                    onClick={togglePlay}
                    type="button"
                    className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-[2px] transition-all hover:bg-slate-950/40 cursor-pointer group"
                  >
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-600/90 text-white flex items-center justify-center border border-red-400/80 transition-transform group-hover:scale-110">
                      <svg className="w-7 h-7 sm:w-8 sm:h-8 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    <span className="mt-2.5 text-[11px] sm:text-xs font-mono tracking-widest text-red-300 uppercase font-semibold drop-shadow-md">
                      Click to Play Video
                    </span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* FULL SCREEN 3D DRONE CANVAS ANIMATION */}
      <div
        className="fixed inset-0 z-20 pointer-events-none"
        style={{ filter: crossfadeBlur(droneOpacity) }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full object-cover"
        />
      </div>

      {/* TOP GRADUAL BACKDROP BLUR OVERLAY (Z-35: ABOVE CONTENT AT Z-25, BELOW NAV AT Z-40) */}
      <GradualBlur
        target="page"
        position="top"
        height="5.5rem"
        strength={3}
        divCount={gradualBlurDivCount}
        curve="bezier"
        exponential={true}
        zIndex={35}
      />

      {/* BOTTOM GRADUAL BACKDROP BLUR OVERLAY */}
      <GradualBlur
        target="page"
        position="bottom"
        height="4.5rem"
        strength={3}
        divCount={gradualBlurDivCount}
        curve="bezier"
        exponential={true}
        zIndex={35}
      />

      {/* HERO SCROLL PROMPT — shown after logo reaches nav */}
      <div className="fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-[200] pointer-events-none">
        <div
          className={`flex flex-col items-center gap-3 transition-all duration-700 ${!isMovedToNav || scrollProgress > 0.56 ? "opacity-0 translate-y-6" : "opacity-100 translate-y-0"
            }`}
        >
          <div className="px-4 py-1.5 rounded-full border border-red-500/25 bg-black/50 text-red-300/80 text-center whitespace-nowrap text-[9px] tracking-[0.08em] sm:text-xs sm:tracking-widest font-mono backdrop-blur-md animate-pulse">
            SCROLL DOWN
          </div>
          <div className="w-5 h-9 rounded-full border-2 border-red-500/40 flex items-start justify-center p-1 bg-black/40 backdrop-blur-sm">
            <div className="w-1.5 h-2.5 bg-red-500/80 rounded-full animate-bounce" />
          </div>
        </div>
      </div>


      {isDesktopPin ? (
        <>
          {/* Spacer reserves scroll distance for the whole About-hold -> drone -> Achievements
              -> Sponsors sequence: 330vh before Achievements starts (224vh of About hold +
              drone fade-in/play/hold/fade-out), then the 280vh Achievements pin budget
              (ACH_START_VH + ACH_BUDGET_VH above), then the 200vh Sponsors pin budget
              (SPONSORS_START_VH + SPONSORS_BUDGET_VH above, starting at 550vh so it overlaps
              Achievements' own fade-out) during which Sponsors is fixed on screen, ending at
              750vh where the Apply CTA + Footer sit waiting in normal flow. Desktop only —
              see `isDesktopPin` above for why mobile skips this whole pin/crossfade. */}
          <div style={{ height: "750vh" }} aria-hidden="true" />

          {/* ACHIEVEMENTS SHOWCASE — pinned full-screen like the drone canvas, its opacity
              driven by achievementsOpacity so it cross-dissolves with the drone on the way
              in and with the pinned Sponsors layer (below) on the way out. */}
          <div
            className="fixed inset-0 z-30"
            style={{
              opacity: achievementsOpacity,
              filter: crossfadeBlur(achievementsOpacity),
              // Auto only during fade-in/hold, never during the fade-out
              // tail — this `fixed inset-0` layer covers the full viewport,
              // so leaving pointer-events "auto" through its whole dissolve
              // blocked clicks on whatever crossfades in underneath (first
              // Sponsors, eventually the Apply CTA).
              pointerEvents: achievementsOpacity > 0.05 && achievementsProgress < 0.786 ? "auto" : "none",
              // `visibility: hidden` once fully faded — belt-and-braces on
              // top of the pointer-events gating above. DepthCarousel (used
              // inside AchievementsShowcase) sets its own inline
              // `pointer-events: auto` on whichever cards are "shown" in its
              // local stack, entirely unaware of this wrapper's crossfade
              // state — that explicit per-card override wins over an
              // ancestor's pointer-events: none (inheritance only applies
              // when the descendant doesn't set its own value), so a card
              // could stay clickable, sitting at z-index ~2000, long after
              // this whole section was supposed to be gone. This was the
              // actual reason clicks on the Apply CTA (and everywhere else
              // behind it) kept landing on an invisible carousel slide
              // instead. `visibility: hidden` is the one property that
              // reliably removes a subtree from hit-testing regardless of
              // what a descendant sets on itself.
              visibility: achievementsOpacity > 0.001 ? "visible" : "hidden",
            }}
          >
            <AchievementsShowcase />
          </div>

          {/* SPONSORS — pinned full-screen the same way, crossfading in against
              Achievements' fade-out and back out into the Apply CTA (arriving in
              normal flow right underneath) once its own hold ends. */}
          <div
            className="fixed inset-0 z-32 flex items-center justify-center"
            style={{
              opacity: sponsorsOpacity,
              filter: crossfadeBlur(sponsorsOpacity),
              // Same fix as Achievements above — this is what left the Apply
              // CTA button unclickable: the Apply CTA is already visible in
              // normal flow underneath for most of this section's fade-out
              // (its 42.8vh fade-out window is shorter than the ~1 viewport
              // of scroll the CTA needs to scroll fully into view), so this
              // full-viewport layer intercepted every click meant for it
              // until it dropped nearly all the way to opacity 0.
              pointerEvents: sponsorsOpacity > 0.05 && sponsorsProgress < 0.786 ? "auto" : "none",
              // See the visibility comment on the Achievements layer above —
              // same belt-and-braces guard in case any current or future
              // child here ever sets its own explicit pointer-events: auto.
              visibility: sponsorsOpacity > 0.001 ? "visible" : "hidden",
            }}
          >
            <SponsorsSection />
          </div>
        </>
      ) : (
        <>
          {/* Mobile: a much smaller spacer just covers the drone's own 400vh
              pin budget (see DRONE_VH above) — no reserved space is needed
              for Achievements/Sponsors since they're normal-flow below, not
              pinned. */}
          <div style={{ height: "400vh" }} aria-hidden="true" />

          <div className="relative z-10 w-full" style={{ scrollSnapAlign: "center" }}>
            <AchievementsShowcase variant="flow" />
          </div>

          <div className="relative z-10 w-full flex items-center" style={{ scrollSnapAlign: "center" }}>
            <SponsorsSection />
          </div>
        </>
      )}

      {/* ── FINAL SCREEN — Apply CTA + Footer, arriving in normal flow right as
          the pinned Sponsors layer above finishes crossfading out. */}
      <div
        className="relative z-10 w-full min-h-screen flex flex-col pt-24"
        style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
      >
        <div className="flex-1 flex flex-col justify-center">
          {/* Apply CTA */}
          <section className="relative w-full pt-8 sm:pt-10 pb-16 sm:pb-20 px-6 flex flex-col items-center justify-center text-center gap-3 overflow-hidden">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(239,68,68,0.10) 0%, transparent 70%)",
              }}
            />
            <Reveal>
              <div className="relative flex items-center gap-2.5 px-3 py-1 rounded-full bg-red-950/50 border border-red-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="font-mono text-[9px] tracking-[0.1em] sm:text-[10px] sm:tracking-[0.3em] text-red-400 uppercase whitespace-nowrap">Team Matrix / Recruitment</span>
              </div>
            </Reveal>

            <Reveal delayMs={80}>
              <h2 className="relative font-[family-name:var(--font-black-ops)] text-3xl sm:text-4xl md:text-5xl font-normal text-white leading-tight">
                Ready to Build <span className="text-red-500">With Us?</span>
              </h2>
            </Reveal>

            <Reveal delayMs={160}>
              <p className="relative max-w-md text-sm sm:text-base text-slate-400 font-sans leading-relaxed">
                We&apos;re always looking for passionate engineers, designers, and builders to join Team Matrix.
              </p>
            </Reveal>

            <Reveal delayMs={240}>
              <Link
                ref={applyBtnRef}
                href="/apply"
                onMouseMove={handleApplyMouseMove}
                onMouseLeave={handleApplyMouseLeave}
                className="
                  relative group mt-1
                  inline-block
                  px-10 py-3 rounded-full
                  bg-[#8c1c2b]/90 text-white
                  font-[family-name:var(--font-black-ops)] text-base sm:text-lg tracking-[0.1em]
                  border border-[#c1495a]/60
                  transition-[background-color,transform] duration-200 ease-out
                  hover:bg-[#a3283b]
                  overflow-hidden
                "
              >
                <span className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
                <span className="relative z-10">APPLY NOW</span>
              </Link>
            </Reveal>
          </section>
        </div>

        {/* ── FOOTER ── */}
        <Footer />
      </div>

      {/* ── ONE-TIME APPLY NOW POPUP ── */}
      <ApplyPopup isOpen={isApplyPopupOpen} onClose={handleCloseApplyPopup} />
    </div>
  );
}
