"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { colors } from "@buildhaus/brand";

// "Plan → site → design" for a REAL Buildhaus project — the residence in
// Nellore (plans dated 21-05-2026, 4,396 sq ft: GF 2,033 + FF 1,941 +
// terrace 422). Scroll-driven, in the same style as <HouseWalkthrough>, but
// rendered live from four stills rather than a frame sequence: every shot is
// a still with a slow camera move, a cross-fade or a reveal sweep, so the
// browser can draw it on the fly — ~1 MB instead of ~47 MB of frames.
//
// Stills (public/site-story/, plus -sm variants for phones):
//   plans.webp       Ground + first floor plans side by side, CROPPED TO THE
//                    DRAWING AREA — the title block names the client, which
//                    must not appear on the public site.
//   site_angle.webp  Site photo IMG_2296 (3/4 view), shadows lifted — it was
//                    shot backlit at dusk.
//   site_front.webp  Site photo IMG_2293 (front view), same treatment.
//   design.webp      The architect's elevation render, extended to 16:9 with
//                    a blurred copy of itself at the sides.
//
// Copy may say this is a real Buildhaus project in Nellore (the plans carry
// the Buildhaus title block); the finished look is the design render, so it
// is captioned as the design, never as the completed house.

const IMAGES = ["plans", "site_angle", "site_front", "design"] as const;
type Still = (typeof IMAGES)[number];

/** Timeline in "frames" (any unit); progress 0..1 maps onto 0..TOTAL. */
const TOTAL = 340;
const CHAPTER_SVH = 90;

const CHAPTERS = [
  {
    start: 0,
    label: "The plan",
    title: "Drawn room by room.",
    body: "Ground and first floor plans for a 4,396 sq ft home in Nellore — courtyard, lift, home theatre and two-car parking, every room sized before work began.",
  },
  {
    start: 80,
    label: "On site",
    title: "Under construction in Nellore.",
    body: "Structure and masonry complete, plastering under way — built to the signed-off drawings, with every stage checked and documented.",
  },
  {
    start: 200,
    label: "The design",
    title: "And this is how it will look.",
    body: "The design for the finished home: stone cladding, terracotta jaali screens, timber soffits and a landscaped frontage.",
  },
] as const;

const chapterAt = (t: number) => {
  let c = 0;
  for (let i = 0; i < CHAPTERS.length; i++) if (t >= CHAPTERS[i].start) c = i;
  return c;
};
const ease = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)));
const seg = (t: number, a: number, b: number) => ease((t - a) / (b - a));
const PANEL = colors.navy;

export function SiteStory() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [chapter, setChapter] = useState(0);
  const [progress, setProgress] = useState(0);
  const [live, setLive] = useState(false);

  const targetT = useCallback(() => {
    const el = sectionRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    const scrollable = el.offsetHeight - window.innerHeight;
    const p = scrollable > 0 ? Math.min(1, Math.max(0, -r.top / scrollable)) : 0;
    return p * TOTAL;
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = window.innerWidth < 768;
    const imgs: Partial<Record<Still, HTMLImageElement>> = {};
    let needsDraw = true;
    let loading = false;
    const load = () => {
      if (loading) return;
      loading = true;
      for (const name of IMAGES) {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
          imgs[name] = img;
          needsDraw = true;
        };
        img.src = `/site-story/${name}${small ? "-sm" : ""}.webp`;
      }
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      needsDraw = true;
    };

    /** Where the picture goes: full-bleed on landscape, a band on portrait. */
    const stage = () => {
      const cw = canvas.width;
      const ch = canvas.height;
      if (cw >= ch) return { x: 0, y: 0, w: cw, h: ch, band: false };
      const h = ch * 0.6;
      return { x: 0, y: ch * 0.07, w: cw, h, band: true };
    };

    /** Draw `img` to cover the stage, zoomed by `z` around (cx, cy). */
    const shot = (img: HTMLImageElement, z: number, cx = 0.5, cy = 0.5, alpha = 1) => {
      const st = stage();
      const s = Math.max(st.w / img.naturalWidth, st.h / img.naturalHeight) * z;
      const w = img.naturalWidth * s;
      const h = img.naturalHeight * s;
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, st.x + (st.w - w) * cx, st.y + (st.h - h) * cy, w, h);
      ctx.globalAlpha = 1;
    };

    const render = (t: number) => {
      const { plans, site_angle: angle, site_front: front, design } = imgs;
      const st = stage();
      ctx.fillStyle = PANEL;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.beginPath();
      ctx.rect(st.x, st.y, st.w, st.h);
      ctx.clip();
      if (t < 80) {
        if (plans) shot(plans, 1 + 0.06 * seg(t, 0, 60));
        if (angle && t > 60) shot(angle, 1, 0.45, 0.45, seg(t, 60, 80));
      } else if (t < 156) {
        if (angle) shot(angle, 1 + 0.08 * seg(t, 80, 140), 0.45, 0.45);
        if (front && t > 140) shot(front, 1, 0.5, 0.5, seg(t, 140, 156));
      } else if (t < 200) {
        if (front) shot(front, 1 + 0.05 * seg(t, 156, 200));
      } else if (t < 280) {
        // Reveal sweep: the design wipes in over the site, left to right.
        if (front) shot(front, 1.05);
        const edge = st.x + seg(t, 200, 280) * st.w;
        if (design) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(st.x, st.y, edge - st.x, st.h);
          ctx.clip();
          shot(design, 1.05);
          ctx.restore();
        }
        ctx.fillStyle = colors.brand;
        ctx.fillRect(edge - 2, st.y, 4, st.h);
      } else if (design) {
        shot(design, 1.05 - 0.05 * seg(t, 280, 340));
      }
      ctx.restore();
      if (st.band) {
        const g = ctx.createLinearGradient(0, st.y + st.h * 0.6, 0, st.y + st.h);
        g.addColorStop(0, `${PANEL}00`);
        g.addColorStop(1, PANEL);
        ctx.fillStyle = g;
        ctx.fillRect(0, st.y + st.h * 0.6, canvas.width, st.h * 0.4 + 1);
      }
    };

    let current = targetT();
    let drawnT = -1;
    let lastChapter = -1;
    let lastProgress = -1;
    let visible = false;
    let drewOnce = false;
    let raf = 0;
    let lastNow = performance.now();

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - lastNow) / 1000);
      lastNow = now;
      if (!visible) return;
      let target = targetT();
      if (reduced) {
        // One still per chapter, no camera motion.
        const c = chapterAt(target);
        target = [30, 110, 320][c];
        current = target;
      } else {
        const diff = target - current;
        current = Math.abs(diff) < 0.01 ? target : current + diff * (1 - Math.exp(-dt * 9));
      }
      if (Math.abs(current - drawnT) > 0.02) needsDraw = true;
      if (needsDraw && imgs.plans) {
        needsDraw = false;
        drawnT = current;
        render(current);
        if (!drewOnce) {
          drewOnce = true;
          setLive(true);
        }
      }
      const c = chapterAt(current + 0.5);
      if (c !== lastChapter) {
        lastChapter = c;
        setChapter(c);
      }
      const p = Math.round((current / TOTAL) * 200) / 200;
      if (p !== lastProgress) {
        lastProgress = p;
        setProgress(p);
      }
    };

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible) load();
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(section);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, [targetT]);

  const jumpTo = (i: number) => {
    const el = sectionRef.current;
    if (!el) return;
    const scrollable = el.offsetHeight - window.innerHeight;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const t = Math.min(TOTAL, CHAPTERS[i].start + 6);
    window.scrollTo({ top: top + (t / TOTAL) * scrollable, behavior: "smooth" });
  };

  const last = chapter === CHAPTERS.length - 1;

  return (
    <section
      ref={sectionRef}
      aria-labelledby="site-story-heading"
      className="relative bg-navy"
      style={{ height: `${CHAPTERS.length * CHAPTER_SVH + 60}svh` }}
    >
      <div className="sr-only">
        <h2 id="site-story-heading">A real Buildhaus home in Nellore: plan, site and design</h2>
        <ol>
          {CHAPTERS.map((c) => (
            <li key={c.label}>
              <strong>{c.title}</strong> {c.body}
            </li>
          ))}
        </ol>
      </div>

      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- static first still; the canvas takes over once JS runs */}
        <img
          src="/site-story/plans.webp"
          alt=""
          aria-hidden
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${live ? "opacity-0" : "opacity-100"}`}
        />
        <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" aria-hidden />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-full bg-gradient-to-r from-black/30 to-transparent sm:w-1/2" aria-hidden />

        <div className="absolute left-5 top-24 rounded-full bg-brand px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white shadow-lg sm:left-8">
          Real Buildhaus project · Nellore
        </div>

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
              <Link href="/enquiry" className="pointer-events-auto rounded-lg bg-brand px-5 py-3 font-semibold text-white">
                Start your project
              </Link>
              <Link
                href="/projects"
                className="pointer-events-auto rounded-lg border border-white/40 bg-black/20 px-5 py-3 font-semibold text-white backdrop-blur-sm hover:bg-white/10"
              >
                See our projects
              </Link>
            </div>
          )}
        </div>

        <nav aria-label="Project story chapters" className="absolute right-8 top-1/2 hidden -translate-y-1/2 lg:block">
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

        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10 lg:hidden" aria-hidden>
          <div className="h-full bg-brand" style={{ width: `${progress * 100}%` }} />
        </div>

        <div className="absolute inset-x-4 bottom-3 text-right text-[10px] leading-tight text-white/50 sm:bottom-4 lg:right-8">
          Site photos taken during construction · finished look shown as the architect&apos;s design render
        </div>
      </div>
    </section>
  );
}
