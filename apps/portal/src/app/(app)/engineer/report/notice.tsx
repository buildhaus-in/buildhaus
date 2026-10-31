"use client";
import { useEffect, useRef } from "react";

// Save/Submit/Delete sit at the bottom of a long form and the action's
// redirect keeps the scroll position, so the result banner would land off
// screen. Bring it into view when it appears.
export function Notice({ tone, message }: { tone: "ok" | "error"; message: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "center" });
  }, [message]);
  return (
    <div
      ref={ref}
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl2 border p-4 text-sm ${tone === "ok" ? "border-ok/40 bg-ok/10 text-ok" : "border-danger/40 bg-danger/10 text-danger"}`}
    >
      {message}
    </div>
  );
}
