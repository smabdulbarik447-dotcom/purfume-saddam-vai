"use client";

import { useState } from "react";

// Mash er calendar: protidin koyta order ar koto bikri; ‹ › diye ager/porer mash
const WEEK = ["শনি", "রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র"];
const tk = (n) => `৳${n.toLocaleString("en-IN")}`;
const short = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 1e4 ? 0 : 1)}k` : String(n));

export default function OrderCalendar({ days, today }) {
  const [ym, setYm] = useState(today.slice(0, 7));
  const [y, m] = ym.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const total = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const pad = (first.getUTCDay() + 1) % 7; // shonibar theke shuru
  const key = (d) => `${ym}-${String(d).padStart(2, "0")}`;
  const max = Math.max(1, ...Array.from({ length: total }, (_, i) => days[key(i + 1)]?.n || 0));
  const monthN = Array.from({ length: total }, (_, i) => days[key(i + 1)]?.n || 0).reduce((a, b) => a + b, 0);
  const monthS = Array.from({ length: total }, (_, i) => days[key(i + 1)]?.s || 0).reduce((a, b) => a + b, 0);
  const move = (k) => {
    const d = new Date(Date.UTC(y, m - 1 + k, 1));
    setYm(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  };
  const title = first.toLocaleDateString("bn-BD", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div className="cal">
      <div className="cal-head">
        <button type="button" onClick={() => move(-1)} aria-label="আগের মাস">‹</button>
        <div>
          <b>{title}</b>
          <small>{monthN}টি অর্ডার • {tk(monthS)} বিক্রি</small>
        </div>
        <button type="button" onClick={() => move(1)} disabled={ym >= today.slice(0, 7)} aria-label="পরের মাস">›</button>
      </div>
      <div className="cal-grid" key={ym}>
        {WEEK.map((w) => <span key={w} className="cal-w">{w}</span>)}
        {Array.from({ length: pad }, (_, i) => <span key={`p${i}`} />)}
        {Array.from({ length: total }, (_, i) => {
          const k = key(i + 1);
          const d = days[k];
          const lvl = d?.n ? Math.min(4, Math.ceil((d.n / max) * 4)) : 0;
          return (
            <div
              key={k}
              className={`cal-d l${lvl}${k === today ? " today" : ""}${k > today ? " future" : ""}`}
              style={{ animationDelay: `${i * 15}ms` }}
              title={d ? `${k}: ${d.n}টি অর্ডার • ${tk(d.s)} বিক্রি` : `${k}: কোনো অর্ডার নেই`}
            >
              <em>{(i + 1).toLocaleString("bn-BD")}</em>
              {d?.n ? <><b>{d.n}টি</b><small>৳{short(d.s)}</small></> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
