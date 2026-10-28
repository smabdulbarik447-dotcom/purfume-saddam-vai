"use client";

import { useEffect, useRef, useState } from "react";

// Browser shudhu ei event gulo ke "user er action" dhore audio chalate dey
// (mobile e tap = pointerup/touchend, desktop e click/key)
const EVENTS = ["pointerdown", "pointerup", "touchend", "click", "keydown"];

/**
 * Landing page er voice: page khulle-i bajanor cheshta kore. Browser atkale (beshirbhag
 * browser shobdo shoho autoplay dey na) customer er prothom tap/click e baje.
 * 🔊/🔇 button diye chalu/bondho, ar atka thakle "শুনতে ট্যাপ করুন" hint dekhay.
 */
export default function VoicePlayer({ src }) {
  const audioRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!src) return;
    const audio = new Audio(src);
    audio.preload = "auto";
    audioRef.current = audio;
    audio.onplay = () => { setPlaying(true); setBlocked(false); };
    audio.onpause = audio.onended = () => setPlaying(false);

    let started = false;
    const remove = () => EVENTS.forEach((e) => window.removeEventListener(e, start, true));
    function start(e) {
      // 🔊/🔇 button e chaap dile oi button nijei samlay
      if (started || e?.target?.closest?.(".voice-toggle")) return;
      started = true;
      audio.play().then(remove).catch(() => { started = false; });
    }

    // 1) Page khulle-i cheshta
    audio.play().then(() => { started = true; }).catch(() => {
      // 2) Atkale prothom tap/click/key e
      setBlocked(true);
      EVENTS.forEach((e) => window.addEventListener(e, start, { capture: true, passive: true }));
    });

    return () => {
      remove();
      audio.pause();
      audioRef.current = null;
    };
  }, [src]);

  if (!src) return null;

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.muted = false;
      setMuted(false);
      if (audio.ended) audio.currentTime = 0;
      audio.play().catch(() => {});
      return;
    }
    audio.muted = !audio.muted;
    setMuted(audio.muted);
  }

  const on = playing && !muted;
  return (
    <div className="voice-wrap">
      <button
        type="button"
        className={`voice-toggle ${on ? "on" : ""} ${blocked ? "wait" : ""}`}
        onClick={toggle}
        aria-label={on ? "ভয়েস বন্ধ করুন" : "ভয়েস চালু করুন"}
        title={on ? "ভয়েস বন্ধ করুন" : "ভয়েস শুনুন"}
      >
        {on ? "🔊" : "🔇"}
      </button>
      {blocked && !playing && (
        <button type="button" className="voice-hint" onClick={toggle}>
          🔊 শুনতে ট্যাপ করুন
        </button>
      )}
    </div>
  );
}
