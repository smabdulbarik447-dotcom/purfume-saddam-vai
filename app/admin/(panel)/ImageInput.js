"use client";

import { useRef, useState } from "react";
import { uploadImage } from "./uploadImage";

// Ekta chobi: preview + "ছবি আপলোড" + "মুছুন". Form e `name` diye URL jay.
export default function ImageInput({ name, defaultValue = "", folder = "products" }) {
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
      setUrl(await uploadImage(file, folder));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="img-input">
      <input type="hidden" name={name} value={url} />
      <div className="img-box">
        {url ? <img src={url} alt="" /> : <span>কোনো ছবি নেই</span>}
        {busy && <div className="img-busy">আপলোড হচ্ছে...</div>}
      </div>
      <div className="img-btns">
        <button type="button" className="adm-btn sm" disabled={busy} onClick={() => fileRef.current.click()}>
          📤 {url ? "নতুন ছবি আপলোড" : "ছবি আপলোড"}
        </button>
        {url && (
          <button type="button" className="adm-btn sm danger" disabled={busy} onClick={() => setUrl("")}>
            🗑 ছবি মুছুন
          </button>
        )}
        <small className="adm-muted">সেভ করলে পুরনো ছবি স্টোরেজ থেকেও মুছে যাবে</small>
        {error && <span className="adm-err">{error}</span>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
    </div>
  );
}
