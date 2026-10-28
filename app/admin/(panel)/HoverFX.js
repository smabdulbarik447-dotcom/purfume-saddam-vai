"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Shudhu DASHBOARD e: card e mouse rakhle .fx-on + mouse er jayga (--mx/--my) — alo mouse er sathe chole.
// Card nore na; baki shob page e kichui hoy na.
const TARGETS = ".kpi, .dash-grid .panel, .dash-big";

export default function HoverFX() {
  const onDashboard = usePathname() === "/admin";

  useEffect(() => {
    if (!onDashboard) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let el = null;
    let raf = 0;
    let last = null;

    const leave = () => {
      if (!el) return;
      el.classList.remove("fx-on");
      el.style.removeProperty("--mx");
      el.style.removeProperty("--my");
      el.querySelector(":scope > .fx-spot")?.remove();
      el = null;
    };

    const paint = () => {
      raf = 0;
      if (!el || !last) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${(((last.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
      el.style.setProperty("--my", `${(((last.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
    };

    const move = (e) => {
      if (e.pointerType !== "mouse") return;
      const next = e.target.closest?.(TARGETS);
      if (next !== el) {
        leave();
        if (next) {
          el = next;
          el.classList.add("fx-on");
          const spot = document.createElement("span");
          spot.className = "fx-spot";
          spot.setAttribute("aria-hidden", "true");
          el.appendChild(spot);
        }
      }
      last = e;
      if (el && !raf) raf = requestAnimationFrame(paint);
    };

    document.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      document.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(raf);
      leave();
    };
  }, [onDashboard]);

  return null;
}
