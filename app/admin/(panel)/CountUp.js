"use client";

import { useEffect, useState } from "react";

// "৳7,783" ba "1টি • ৳1,069" er bhetorer shonkha gulo 0 theke gune gune ashe
const NUM = /\d[\d,]*/g;
const fmt = (n) => n.toLocaleString("en-IN");
const render = (value, p) => value.replace(NUM, (m) => fmt(Math.round(Number(m.replace(/,/g, "")) * p)));

export default function CountUp({ value, ms = 1100 }) {
  const text = String(value);
  const [shown, setShown] = useState(() => render(text, 0));

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return setShown(text);
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / ms);
      setShown(render(text, 1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, ms]);

  return shown;
}
