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
 * `max` is the strongest rotation in degrees at the very corner of the
 * element — keep it small (4-8) or the page reads as a gimmick rather than
 * as depth.
 */
export function Tilt({
  children,
  className,
  max = 6,
  lift = 6,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  lift?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    // No cursor to follow on touch — skip the listeners entirely.
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let frame = 0;
    const apply = (rx: number, ry: number, z: number) => {
      el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translate3d(0,${-z}px,0)`;
    };

    const onMove = (e: PointerEvent) => {
      if (frame) return; // one update per frame, not one per event
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = el.getBoundingClientRect();
        // -0.5 .. 0.5 from the element's centre, on both axes.
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        apply(-py * max * 2, px * max * 2, lift);
      });
    };
    const onLeave = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      apply(0, 0, 0);
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reduced, max, lift]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ transition: "transform 300ms cubic-bezier(0.22, 1, 0.36, 1)", willChange: "transform" }}
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
