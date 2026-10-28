"use client";

import { useRef, useState } from "react";
import { uploadImage } from "./uploadImage";

// Voice (MP3) upload: shune dekha + notun upload + mucha. Form e `name` diye link jay.
export default function AudioInput({ name, defaultValue = "" }) {
  const [url, setUrl] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      setUrl(await uploadImage(file, "voice"));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="audio-input">
      <input type="hidden" name={name} value={url} />
      {url ? <audio controls src={url} preload="none" /> : <span className="adm-muted">কোনো ভয়েস নেই</span>}
      <div className="img-btns">
        <button type="button" className="adm-btn sm" disabled={busy} onClick={() => fileRef.current.click()}>
          {busy ? "আপলোড হচ্ছে..." : url ? "🎙️ নতুন ভয়েস আপলোড" : "🎙️ ভয়েস আপলোড (MP3)"}
        </button>
        {url && (
          <button type="button" className="adm-btn sm danger" disabled={busy} onClick={() => setUrl("")}>
            🗑 ভয়েস মুছুন
          </button>
        )}
        {error && <span className="adm-err">{error}</span>}
      </div>
      <input ref={fileRef} type="file" accept="audio/*" hidden onChange={onFile} />
    </div>
  );
}
