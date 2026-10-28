"use client";

import { useState } from "react";

export default function Gallery({ images, brand, badge = "🎁 +১টি ৬মিলি আতর ফ্রি" }) {
  const [active, setActive] = useState(0);
  if (!images.length) return null;
  return (
    <div className="gallery">
      <div className="gallery-main">
        <img src={images[active]} alt={`${brand} Signature Perfume Combo`} />
        {badge && <span className="gallery-badge">{badge}</span>}
      </div>
      <div className="gallery-thumbs">
        {images.slice(1).map((src, i) => (
          <button
            key={src + i}
            className={active === i + 1 ? "active" : ""}
            onClick={() => setActive(active === i + 1 ? 0 : i + 1)}
            aria-label={`Thumb ${i + 1}`}
          >
            <img src={src} alt="" />
          </button>
        ))}
      </div>
    </div>
  );
}
