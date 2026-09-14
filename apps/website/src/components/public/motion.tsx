"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

// Depth/motion primitives for the public marketing site.
//
// Both components below are deliberately conservative:
//   * they degrade to plain, fully-visible markup when JS hasn't run, so the
//     server-rendered HTML a crawler sees is unchanged (nothing here is
//     hidden behind an animation that never fires);
//   * they no-op entirely for `prefers-reduced-motion: reduce`, and the tilt
//     also no-ops on coarse pointers (touch), where there's no cursor to
//     follow and the extra listeners would just cost battery.

/** True when the visitor has asked for reduced motion. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/**
 * Tilts its contents toward the cursor in 3D. Desktop/fine-pointer only.
 *
 * `max` scales the rotation (the corner of the element reaches roughly
 * `max` degrees). The first pass used 4-6 and was invisible in practice
 * ("unable to see it") — these defaults are deliberately assertive enough
 * to notice, paired with a lift, a slight scale and a shadow that tracks
 * the tilt.
 */
export function Tilt({
  children,
  className,
  max = 12,
  lift = 10,
  scale = 1.02,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  lift?: number;
  scale?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    // No cursor to follow on touch — skip the listeners entirely.
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let frame = 0;
    // A shadow that deepens with the tilt is what actually sells the
    // depth — rotation alone, at tasteful angles, is easy to miss.
    const restShadow = getComputedStyle(el).boxShadow;
    const apply = (rx: number, ry: number, z: number, sc: number, active: boolean) => {
      el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translate3d(0,${-z}px,0) scale(${sc})`;
      el.style.boxShadow = active
        ? `${-ry * 1.6}px ${rx * 1.6 + 18}px 40px rgba(11, 38, 58, 0.28)`
        : restShadow;
    };

    const onMove = (e: PointerEvent) => {
      if (frame) return; // one update per frame, not one per event
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = el.getBoundingClientRect();
        // -0.5 .. 0.5 from the element's centre, on both axes. Clamped
        // because the rect is measured a frame after the pointer event:
        // if the page scrolls in between, the stale clientY against a
        // fresh rect can land far outside the element and spin the card
        // (observed: rotateX(-406deg) when a scroll raced a pointermove).
        const clamp = (n: number) => Math.max(-0.5, Math.min(0.5, n));
        const px = clamp((e.clientX - r.left) / r.width - 0.5);
        const py = clamp((e.clientY - r.top) / r.height - 0.5);
        apply(-py * max * 2, px * max * 2, lift, scale, true);
      });
    };
    const onLeave = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      apply(0, 0, 0, 1, false);
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reduced, max, lift, scale]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transition: "transform 260ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 260ms ease",
        willChange: "transform",
        transformStyle: "preserve-3d",
      }}
    >
      {children}
    </div>
  );
}

/**
 * Fades + lifts its contents into place the first time they scroll into
 * view. Renders visible-by-default and only hides once JS confirms an
 * observer is running, so no-JS and crawler views never see blank space.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(true);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || typeof IntersectionObserver === "undefined") return;

    // Already on screen at mount (above the fold) — leave it visible rather
    // than flashing it out and back in.
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.9) return;

    setShown(false);
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translate3d(0, 18px, 0)",
        transition: `opacity 600ms ease ${delay}ms, transform 600ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
