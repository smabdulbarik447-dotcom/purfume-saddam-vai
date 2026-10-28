"use client";

import { useRef, useState } from "react";
import { uploadImage } from "./uploadImage";

// Banner gallery: onek gulo chobi upload, mucha, ar agey-pichone sorano
export default function GalleryInput({ name, defaultValue = [] }) {
  const [list, setList] = useState(defaultValue);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  async function onFiles(e) {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    setError("");
    setBusy(files.length);
    for (const file of files) {
      try {
        const url = await uploadImage(file, "banners");
        setList((l) => [...l, url]);
      } catch (err) {
        setError(err.message);
      }
      setBusy((n) => n - 1);
    }
  }

  const move = (i, d) =>
    setList((l) => {
      const j = i + d;
      if (j < 0 || j >= l.length) return l;
      const next = [...l];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div>
      <input type="hidden" name={name} value={list.join("\n")} />
      <div className="adm-gallery">
        {list.map((src, i) => (
          <figure key={src + i}>
            <img src={src} alt="" />
            <figcaption>{`#${i + 1}`}</figcaption>
            <div className="gal-btns">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="আগে">←</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="পরে">→</button>
              <button type="button" className="del" onClick={() => setList((l) => l.filter((_, k) => k !== i))} aria-label="মুছুন">🗑</button>
            </div>
          </figure>
        ))}
        <button type="button" className="gal-add" disabled={busy > 0} onClick={() => fileRef.current.click()}>
          {busy > 0 ? `আপলোড হচ্ছে (${busy})...` : "📤 ছবি যোগ করুন"}
        </button>
      </div>
      {error && <p className="adm-err">{error}</p>}
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onFiles} />
    </div>
  );
}
