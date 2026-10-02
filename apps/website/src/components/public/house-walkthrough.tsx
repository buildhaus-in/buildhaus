"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { colors } from "@buildhaus/brand";

// Scroll-driven cinematic story of a modern villa — the pattern from the
// reference reels: the page pins a full-screen stage and the visitor's scroll
// scrubs one continuous film, with a caption per chapter:
//   architect's drawing → structure rising → finishes & landscape → finished
//   villa at dusk → pivot door → foyer → living & dining → bedroom →
//   infinity-pool terrace.
//
// Footage: two AI-generated concept clips the Owner created in PixVerse
// (Downloads/PixVerse_V6_Transition_540P_Construction_timel.mp4 — a
// drawing-to-built transition whose first frame was traced from the villa —
// followed by PixVerse_V6_Image_Text_540P_Exterior_Slow_cine.mp4, whose
// first frame matches the time-lapse's last, so the join is seamless). It is
// a CONCEPT VISUALISATION, not a completed Buildhaus project — the on-screen
// note says so and copy must never claim otherwise.
//
// Both 5 s, 1024x576 (540p) clips (121 frames each) were AI-upscaled 4x with
// Real-ESRGAN (realesrgan-x4plus) for clarity ("the video is not clarity"),
// joined, resized to 1920x1080, motion-interpolated to 48 fps (481 frames,
// for smoother scrubbing) and cut into WebP frame sequences (public/
// walkthrough/lg at 1920px, /sm at 1080px), because scrubbing a normal video
// on scroll stutters: every frame here decodes on its own. When the Owner
// re-exports from PixVerse at 1080p without the watermark, re-run the same
// pipeline (upscale is then optional) to swap it in.
//
// Progressive enhancement / performance:
//   * SSR renders the first frame as a plain <img> plus the first caption,
//     and every chapter's text in an sr-only list (crawlers + screen readers
//     get all of it; the animated captions are aria-hidden duplicates).
//   * Frames only start downloading when the section is ~1 screen away:
//     every 6th frame first (so the whole film works almost at once), then
//     the gaps; the canvas draws the nearest frame already loaded. Phones
//     (and Save-Data) load every other frame only — half the data, and still
//     smooth at phone size.
//   * Frames are drawn whole — never blended — so every frame stays sharp.
//   * Portrait phones show the landscape footage as a large band fading into
//     the dark panel colour rather than cropping it to the screen's shape,
//     which zoomed it into a blur.
//   * prefers-reduced-motion: no scrubbed camera motion — each chapter holds
//     a single still frame.

const FRAME_COUNT = 481;
/** Scroll distance per chapter, in svh. */
const CHAPTER_SVH = 70;

// Frame indices on the 48 fps timeline: time-lapse source frame k ≈ 2k,
// villa source frame k ≈ 242 + 2k.
const CHAPTERS = [
  {
    start: 0,
    label: "Design",
    title: "Every home begins as a drawing.",
    body: "Architecture and layouts developed for your family and your plot, with every cost visible in the BOQ before you sign.",
  },
  {
    start: 44,
    label: "Structure",
    title: "Built exactly to the drawings.",
    body: "Columns, beams and slabs cast to signed-off structural drawings, with quality checks documented at every stage.",
  },
  {
    start: 88,
    label: "Finish",
    title: "Finishes without compromise.",
    body: "Stone, teak, glazing and landscape — the materials you approved in the BOQ, installed exactly as specified.",
  },
  {
    start: 152,
    label: "Handover",
    title: "Handed over as promised.",
    body: "A final walkthrough comes first. The keys come only when the home matches what was agreed.",
  },
  {
    start: 290,
    label: "Entrance",
    title: "Every detail, drawn before it's built.",
    body: "From the pivot door to the reveal lighting, every element is in the drawings — and in the BOQ — before you sign.",
  },
  {
    start: 334,
    label: "Foyer",
    title: "Warmth in every material.",
    body: "Stone, timber and hidden lighting, checked and documented at every stage.",
  },
  {
    start: 362,
    label: "Living",
    title: "Spaces that open to the garden.",
    body: "Layouts planned around how your family lives — light, ventilation and Vastu considered from day one.",
  },
  {
    start: 402,
    label: "Bedroom",
    title: "Calm, by design.",
    body: "Warm, quiet private spaces — built to the drawing, finished to the detail.",
  },
  {
    start: 452,
    label: "Welcome home",
    title: "Welcome home.",
    body: "Not just construction, but confidence.",
  },
] as const;

const chapterEnd = (i: number) => (i + 1 < CHAPTERS.length ? CHAPTERS[i + 1].start : FRAME_COUNT);
const chapterAt = (frame: number) => {
  let c = 0;
  for (let i = 0; i < CHAPTERS.length; i++) if (frame >= CHAPTERS[i].start) c = i;
  return c;
};
const NAVY = colors.navy;
const frameSrc = (size: "lg" | "sm", i: number) => `/walkthrough/${size}/${String(i).padStart(3, "0")}.webp`;

export function HouseWalkthrough() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<(HTMLImageElement | null)[]>(Array(FRAME_COUNT).fill(null));
  const [chapter, setChapter] = useState(0);
  const [progress, setProgress] = useState(0);
  const [live, setLive] = useState(false); // canvas has drawn at least once

  // Scroll position → target frame (0..FRAME_COUNT-1).
  const targetFrame = useCallback(() => {
    const el = sectionRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    const scrollable = el.offsetHeight - window.innerHeight;
    const p = scrollable > 0 ? Math.min(1, Math.max(0, -r.top / scrollable)) : 0;
    return p * (FRAME_COUNT - 1);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const size: "lg" | "sm" = window.innerWidth < 768 || conn?.saveData ? "sm" : "lg";
    const frames = framesRef.current;

    // ── Loading: coarse pass (every 6th frame), then fill, 6 at a time ──
    let loadingStarted = false;
    let cancelled = false;
    const startLoading = () => {
      if (loadingStarted) return;
      loadingStarted = true;
      const stride = size === "sm" ? 2 : 1;
      const all = Array.from({ length: FRAME_COUNT }, (_, i) => i).filter((i) => i % stride === 0);
      const order = [...all.filter((i) => i % 6 === 0), ...all.filter((i) => i % 6 !== 0)];
      let next = 0;
      const pump = () => {
        if (cancelled || next >= order.length) return;
        const i = order[next++];
        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
          frames[i] = img;
          needsDraw = true;
          pump();
        };
        img.onerror = pump;
        img.src = frameSrc(size, i);
      };
      for (let k = 0; k < 6; k++) pump();
    };

    const nearest = (i: number) => {
      if (frames[i]) return frames[i];
      for (let d = 1; d < FRAME_COUNT; d++) {
        if (frames[i - d]) return frames[i - d];
        if (frames[i + d]) return frames[i + d];
      }
      return null;
    };

    // ── Drawing ──────────────────────────────────────────────────────────
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      needsDraw = true;
    };
    const draw = (img: HTMLImageElement) => {
      const cw = canvas.width;
      const ch = canvas.height;
      ctx.imageSmoothingQuality = "high";
      if (cw >= ch) {
        // Landscape screens: full-bleed cover.
        const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
        const w = img.naturalWidth * s;
        const h = img.naturalHeight * s;
        ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
        return;
      }
      // Portrait: a wide band from just under the header, fading to navy.
      ctx.fillStyle = NAVY;
      ctx.fillRect(0, 0, cw, ch);
      const bandH = ch * 0.6;
      const s = Math.max(cw / img.naturalWidth, bandH / img.naturalHeight);
      const w = img.naturalWidth * s;
      const h = img.naturalHeight * s;
      const top = ch * 0.07;
      ctx.drawImage(img, (cw - w) / 2, top, w, h);
      const g = ctx.createLinearGradient(0, top + h * 0.6, 0, top + h);
      g.addColorStop(0, `${NAVY}00`);
      g.addColorStop(1, NAVY);
      ctx.fillStyle = g;
      ctx.fillRect(0, top + h * 0.6, cw, h * 0.4 + 1);
    };

    let current = targetFrame();
    let needsDraw = true;
    let drawnIndex = -1;
    let lastChapter = -1;
    let lastProgress = -1;
    let raf = 0;
    let lastT = performance.now();
    let visible = false;
    let drewOnce = false;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      // Time-based easing, so slow/throttled devices keep pace with the scroll.
      const dt = Math.min(0.1, (now - lastT) / 1000);
      lastT = now;
      if (!visible) return;
      let target = targetFrame();
      if (reduced) {
        // One still per chapter: the frame a third of the way through it.
        const c = chapterAt(target);
        target = Math.round(CHAPTERS[c].start + (chapterEnd(c) - CHAPTERS[c].start) / 3);
        current = target;
      } else {
        const diff = target - current;
        current = Math.abs(diff) < 0.01 ? target : current + diff * (1 - Math.exp(-dt * 9));
      }
      const index = Math.round(current);
      if (index !== drawnIndex) needsDraw = true;

      if (needsDraw) {
        needsDraw = false;
        const img = nearest(index);
        if (img) {
          draw(img);
          // A late-loading exact frame re-triggers a draw via onload.
          drawnIndex = index;
          if (!drewOnce) {
            drewOnce = true;
            setLive(true);
          }
        }
      }

      const c = chapterAt(current + 0.5);
      if (c !== lastChapter) {
        lastChapter = c;
        setChapter(c);
      }
      const p = Math.round((current / (FRAME_COUNT - 1)) * 200) / 200;
      if (p !== lastProgress) {
        lastProgress = p;
        setProgress(p);
      }
    };

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible) startLoading();
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(section);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, [targetFrame]);

  const jumpTo = (i: number) => {
    const el = sectionRef.current;
    if (!el) return;
    const scrollable = el.offsetHeight - window.innerHeight;
    const top = el.getBoundingClientRect().top + window.scrollY;
    // Land a little into the chapter so its caption is fully in.
    const frame = Math.min(FRAME_COUNT - 1, CHAPTERS[i].start + 4);
    window.scrollTo({ top: top + (frame / (FRAME_COUNT - 1)) * scrollable, behavior: "smooth" });
  };

  const last = chapter === CHAPTERS.length - 1;

  return (
    <section
      ref={sectionRef}
      aria-labelledby="walkthrough-heading"
      className="relative bg-navy"
      style={{ height: `${CHAPTERS.length * CHAPTER_SVH + 60}svh` }}
    >
      {/* Full text for crawlers and screen readers; the visual captions
          below are decorative duplicates. */}
      <div className="sr-only">
        <h2 id="walkthrough-heading">From drawing to a finished villa</h2>
        <ol>
          {CHAPTERS.map((c) => (
            <li key={c.label}>
              <strong>{c.title}</strong> {c.body}
            </li>
          ))}
        </ol>
      </div>

      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        {/* First frame, server-rendered — what no-JS visitors see. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- static first frame; the canvas takes over once JS runs */}
        <img
          src={frameSrc("lg", 0)}
          alt=""
          aria-hidden
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${live ? "opacity-0" : "opacity-100"}`}
        />
        <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />

        {/* Legibility scrims */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/15" aria-hidden />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-full bg-gradient-to-r from-black/30 to-transparent sm:w-1/2" aria-hidden />

        {/* Caption */}
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-5 pb-16 sm:pb-20" aria-hidden>
          <div key={chapter} className="max-w-xl animate-[walkIn_700ms_cubic-bezier(0.2,0.7,0.2,1)_both]">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-brand">
              {String(chapter + 1).padStart(2, "0")} · {CHAPTERS[chapter].label}
            </div>
            <div className="mt-3 text-3xl font-black leading-[1.05] text-white drop-shadow sm:text-5xl lg:text-6xl">
              {CHAPTERS[chapter].title}
            </div>
            <p className="mt-4 max-w-md text-sm text-white/80 sm:text-base">{CHAPTERS[chapter].body}</p>
          </div>
          {last && (
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/cost-estimator" className="pointer-events-auto rounded-lg bg-brand px-5 py-3 font-semibold text-white">
                Estimate your build
              </Link>
              <Link
                href="/request-site-visit"
                className="pointer-events-auto rounded-lg border border-white/40 bg-black/20 px-5 py-3 font-semibold text-white backdrop-blur-sm hover:bg-white/10"
              >
                Book a site visit
              </Link>
            </div>
          )}
        </div>

        {/* Chapter rail */}
        <nav aria-label="Walkthrough chapters" className="absolute right-8 top-1/2 hidden -translate-y-1/2 lg:block">
          <ol className="relative space-y-4 rounded-l-xl2 border-r border-white/20 bg-black/35 py-3 pl-4 pr-4 backdrop-blur-sm">
            <span
              className="absolute -right-px top-0 w-0.5 bg-brand transition-[height] duration-150"
              style={{ height: `${progress * 100}%` }}
              aria-hidden
            />
            {CHAPTERS.map((c, i) => (
              <li key={c.label} className="text-right">
                <button
                  type="button"
                  onClick={() => jumpTo(i)}
                  aria-current={i === chapter ? "step" : undefined}
                  className={`text-xs font-semibold uppercase tracking-widest transition ${
                    i === chapter ? "text-white" : "text-white/45 hover:text-white/80"
                  }`}
                >
                  {c.label}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        {/* Progress bar below lg, where the chapter rail would collide with the captions */}
        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10 lg:hidden" aria-hidden>
          <div className="h-full bg-brand" style={{ width: `${progress * 100}%` }} />
        </div>

        <div className="absolute inset-x-4 bottom-3 text-right text-[10px] leading-tight text-white/50 sm:bottom-4 lg:right-8">
          Concept visualisation — illustrative, not a completed Buildhaus project
        </div>
      </div>
    </section>
  );
}
