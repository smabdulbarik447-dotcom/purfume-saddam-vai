"use client";

import { useState } from "react";

// perfumes ar text admin > ল্যান্ডিং পেজ টেক্সট theke ashe
export default function Collection({ perfumes, text }) {
  const [index, setIndex] = useState(0);
  const p = perfumes[index] || perfumes[0];

  return (
    <>
      <div className="collection-grid">
        {perfumes.map((item, i) => (
          <button key={i} className={`ex-card ${i === index ? "active" : ""}`} onClick={() => setIndex(i)}>
            <div className="ex-img">
              <img src={item.image} alt={item.name} />
            </div>
            <span className="ex-badge">{item.badge}</span>
            <h3>{item.short}</h3>
            <small>{text.col_card_sub}</small>
          </button>
        ))}
      </div>

      <div className="spotlight">
        <div className="spot-img">
          <img key={p.image} src={p.image} alt={p.name} />
          <span className="spot-vol">{text.col_volume}</span>
        </div>
        <div className="spot-body">
          <span className="pill">✨ {p.badge}</span>
          <h3>{p.name}</h3>
          <p className="spot-sub">{p.subtitle}</p>
          <p className="spot-desc">{p.description}</p>
          <h4>{text.col_notes_label}</h4>
          <div className="notes">
            {p.notes.map((n) => (
              <span key={n}>{n}</span>
            ))}
          </div>
          <h4>{text.col_vibe_label}</h4>
          <p className="vibe">{p.vibe}</p>
          <a href="#order" className="btn">{text.col_btn}</a>
        </div>
      </div>
    </>
  );
}
