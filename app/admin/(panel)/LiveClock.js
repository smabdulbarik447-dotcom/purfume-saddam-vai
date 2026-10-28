"use client";

import { useEffect, useState } from "react";

// Hero r majhkhane widget: analog ghori (Dhaka shomoy) + tarikh, bar ar Dhaka r abohawa
const WX = [
  [0, "☀️", "পরিষ্কার"], [3, "⛅", "মেঘলা"], [48, "🌫️", "কুয়াশা"], [57, "🌦️", "গুঁড়ি বৃষ্টি"],
  [67, "🌧️", "বৃষ্টি"], [77, "🌨️", "তুষার"], [82, "🌧️", "ঝুম বৃষ্টি"], [99, "⛈️", "ঝড়-বৃষ্টি"],
];
const weatherOf = (code) => WX.find(([max]) => code <= max) || WX[0];

const dhakaNow = () => {
  const d = new Date();
  const [h, m, s] = d.toLocaleTimeString("en-GB", { timeZone: "Asia/Dhaka", hour12: false }).split(":").map(Number);
  return {
    h, m, s,
    day: d.toLocaleDateString("bn-BD", { timeZone: "Asia/Dhaka", weekday: "long" }),
    date: d.toLocaleDateString("bn-BD", { timeZone: "Asia/Dhaka", day: "numeric", month: "long", year: "numeric" }),
    digital: d.toLocaleTimeString("en-US", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", hour12: true }),
  };
};

export default function LiveClock() {
  const [now, setNow] = useState(null);
  const [wx, setWx] = useState(null);

  useEffect(() => {
    setNow(dhakaNow());
    const t = setInterval(() => setNow(dhakaNow()), 1000);
    // Open-Meteo: key lage na; 15 minit por por notun kore ane
    const load = () =>
      fetch("https://api.open-meteo.com/v1/forecast?latitude=23.81&longitude=90.41&current=temperature_2m,weather_code,relative_humidity_2m&timezone=Asia%2FDhaka")
        .then((r) => r.json())
        .then((j) => j.current && setWx(j.current))
        .catch(() => {});
    load();
    const w = setInterval(load, 15 * 6e4);
    return () => { clearInterval(t); clearInterval(w); };
  }, []);

  const s = now?.s ?? 0, m = now?.m ?? 0, h = now?.h ?? 0;
  const [, icon, text] = wx ? weatherOf(wx.weather_code) : [0, "🌡️", "লোড হচ্ছে…"];

  return (
    <div className="clock-widget">
      <div className="analog" aria-label={now?.digital}>
        {Array.from({ length: 12 }, (_, i) => (
          <i key={i} className={i % 3 ? "" : "big"} style={{ transform: `rotate(${i * 30}deg)` }} />
        ))}
        <span className="hand h" style={{ transform: `rotate(${(h % 12) * 30 + m * 0.5}deg)` }} />
        <span className="hand m" style={{ transform: `rotate(${m * 6 + s * 0.1}deg)` }} />
        <span className="hand s" style={{ transform: `rotate(${s * 6}deg)` }} />
        <span className="pin" />
      </div>
      <div className="clock-info">
        <b className="clock-time">{now?.digital || "--:--"}</b>
        <span className="clock-day">{now?.day || ""}</span>
        <small>{now?.date || ""}</small>
        <span className="clock-wx">
          <em>{icon}</em>
          <b>{wx ? `${Math.round(wx.temperature_2m)}°C` : "--°C"}</b>
          <small>{text}{wx ? ` • 💧${wx.relative_humidity_2m}%` : ""} • ঢাকা</small>
        </span>
      </div>
    </div>
  );
}
