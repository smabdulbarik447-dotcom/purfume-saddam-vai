"use client";

import { useEffect } from "react";

// Scroll korle kichu bam theke, kichu dan theke uthe ashe. Prothom screen er gulo o (site e dhukar shathe shathe).
// JS na cholle shob shadharon bhabe dekhay — kichu lukay na.
// [selector, dik]: "alt" = ek shari te por por bam/dan, "l" bam, "r" dan, "up" niche theke
// Protiti LEKHA alada — heading ek dik theke, tar nicher lekha ulta dik theke, ek ek kore ese boshe
const GROUPS = [
  [".hero-info > :not(.features)", "alt"],
  [".features .feature", "alt"],
  [".gallery", "r"],
  [".section-head > *", "alt"],
  [".ex-card", "alt"],
  [".spot-img", "l"],
  [".spot-body > *", "alt"],
  [".gift-img", "l"],
  [".gift-grid > div:not(.gift-img) > *", "alt"],
  [".compare-head", "alt"],
  [".compare-item", "alt"],
  [".compare > * > :not(.compare-head):not(.compare-item)", "alt"],
  [".package-img", "l"],
  [".package-body > *", "alt"],
  [".offer-strip", "l"],
  [".compare + .center", "up"],
  [".cod-banner > *", "alt"],
  [".checkout", "up"],
  [".footer > *", "alt"],
];

export default function Reveal() {
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    // Jotobar screen e ashe totobar slide kore ashe; screen theke puro beriye gele abar lukiye jay (porer bar er jonno)
    const timers = new WeakMap();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const el = e.target;
          clearTimeout(timers.get(el));
          if (e.isIntersecting && e.intersectionRatio >= 0.1) {
            if (el.classList.contains("rv-in")) continue;
            el.classList.add("rv-in", "rv-anim");
            // Asha shesh hole slide er transition soriye di — card er nijer hover animation thik moto chole
            const delay = parseInt(el.style.getPropertyValue("--rv-d")) || 0;
            timers.set(el, setTimeout(() => el.classList.remove("rv-anim"), delay + 950));
          } else if (!e.isIntersecting) {
            el.classList.remove("rv-in", "rv-anim");
          }
        }
      },
      { threshold: [0, 0.1] },
    );

    const done = new Set();
    for (const [sel, mode] of GROUPS) {
      const counts = new Map();
      for (const el of document.querySelectorAll(sel)) {
        if (done.has(el)) continue;
        done.add(el);
        const i = counts.get(el.parentElement) || 0;
        counts.set(el.parentElement, i + 1);
        const dir = mode === "alt" ? (i % 2 ? "r" : "l") : mode;
        el.style.setProperty("--rv-d", `${Math.min(i, 7) * 120}ms`);
        el.classList.add("rv", `rv-${dir}`);
        io.observe(el);
      }
    }
    // Ekhon .rv class i lukiye rakhche — agam lukano (RevealInit) ar dorkar nei
    document.documentElement.classList.remove("rv-js");
    return () => io.disconnect();
  }, []);

  return null;
}
