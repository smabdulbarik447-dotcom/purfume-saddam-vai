import { site, bn, tk } from "@/data/site";
import { getSettings, getProducts, deliveryOptions } from "@/lib/store";
import { getContent, fillTokens, tokenVars } from "@/lib/content";
import Gallery from "@/components/Gallery";
import Collection from "@/components/Collection";
import OrderForm from "@/components/OrderForm";
import Tracking from "@/components/Tracking";
import Brand from "@/components/Brand";
import VoicePlayer from "@/components/VoicePlayer";
import Reveal from "@/components/Reveal";
import RevealInit from "@/components/RevealInit";
import "./motion.css";

// Admin > ল্যান্ডিং পেজ টেক্সট er lekha + {price} er moto token boshano
async function loadPage() {
  const [s, products] = await Promise.all([getSettings(), getProducts()]);
  const delivery = deliveryOptions(s);
  const main = products[0] || { price: site.price, old_price: site.oldPrice };
  const oldPrice = main.old_price || main.price;
  const vars = tokenVars({ price: main.price, oldPrice, brand: s.brand, delivery, freeBoxes: Number(s.free_delivery_boxes) || 0 });
  const content = getContent(s);
  const t = (k) => fillTokens(content.text[k], vars);
  return { s, products, delivery, main, oldPrice, content, vars, t };
}

// [ ] er bhitorer lekha sonali highlight
function H({ text }) {
  return String(text)
    .split(/(\[[^\]]*\])/)
    .map((part, i) => (part.startsWith("[") && part.endsWith("]") ? <span key={i} className="grad">{part.slice(1, -1)}</span> : part));
}

export async function generateMetadata() {
  const { s, t } = await loadPage();
  return {
    ...(s.logo ? { icons: { icon: s.logo, apple: s.logo } } : {}),
    title: t("meta_title"),
    description: t("meta_desc"),
  };
}

export default async function Home() {
  const { s, products, delivery, main, oldPrice, content, vars, t } = await loadPage();
  const L = content.lists;
  const fill = (str) => fillTokens(str, vars);
  // Mul product er chobi i upore boro kore dekhay, tarpor banner er chobi gulo
  const productImage = main.image || "/images/combo.png";
  const banners = s.gallery.split("\n").map((x) => x.trim()).filter(Boolean);
  const gallery = [productImage, ...banners.filter((src) => src !== productImage)];
  const freeBoxes = Number(s.free_delivery_boxes) || 0;
  const info1 = freeBoxes > 0 ? t("info1_text") : `ঢাকা ${bn(delivery[0].charge)}৳ / বাইরে ${bn(delivery[1].charge)}৳`;

  // Order form er lekha (client component e pathai)
  const formText = Object.fromEntries(
    ["form_head", "billing_title", "name_label", "name_ph", "address_label", "address_ph", "phone_label", "shipping_title",
      "free_hint", "free_done", "summary_title", "cod_label", "hadith", "privacy", "submit_btn", "success_title", "success_text"]
      .map((k) => [k, t(k)])
  );
  const colText = Object.fromEntries(
    ["col_card_sub", "col_volume", "col_notes_label", "col_vibe_label", "col_btn"].map((k) => [k, t(k)])
  );
  const perfumes = L.perfumes.map((p, i) => ({
    ...p,
    image: p.image || site.perfumes[i]?.image || "/images/combo.png",
    notes: String(p.notes || "").split(",").map((x) => x.trim()).filter(Boolean),
  })).filter((p) => p.name || p.short);

  return (
    <>
      <RevealInit />
      <Tracking pixel={s.fb_pixel} gtm={s.gtm_id} />
      <VoicePlayer src={s.voice} />
      <Reveal />
      <div className="topbar">
        <span>{t("topbar")}</span>
        <span className="topbar-cod">{t("topbar_cod")}</span>
      </div>

      <header className="header">
        <div className="container header-inner">
          <Brand s={s} />
          <div className="header-actions">
            <a href={`tel:${s.phone}`} className="header-phone">📞 {s.phone}</a>
            <a href="#order" className="btn btn-sm">{t("header_btn")}</a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="container">
          <div className="offer-strip">
            {t("offer_strip")}
            <span>{t("offer_strip_sub")}</span>
          </div>

          <div className="hero-grid">
            <Gallery images={gallery} brand={s.brand} badge={t("gallery_badge")} />

            <div className="hero-info">
              <span className="eyebrow">{t("hero_eyebrow")}</span>
              <h1><H text={t("hero_title")} /></h1>
              <p className="hero-sub">{t("hero_sub")}</p>
              <div className="rating">
                <span className="stars">★★★★★</span> <b>{t("rating")}</b> <small>{t("rating_note")}</small>
              </div>

              <div className="features">
                {L.features.filter((f) => f.title).map((f, i) => (
                  <div key={i} className="feature">
                    <span className="feature-icon">{f.icon}</span>
                    <div>
                      <b>{fill(f.title)}</b>
                      <p>{fill(f.text)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="price-card">
                <span className="price-label">{t("price_label")}</span>
                <div className="price-row">
                  <span className="price-new">৳{tk(main.price)}</span>
                  <del>৳{tk(oldPrice)}</del>
                </div>
                <span className="save">{t("save_text")}</span>
              </div>

              <div className="gift-note">
                <img src="/images/gift.png" alt="Secret Perfume 6ml" />
                <div>
                  <b>{t("gift_title")}</b>
                  <p>{t("gift_sub")}</p>
                </div>
              </div>

              <a href="#order" className="btn btn-block btn-lg">{t("hero_btn")}</a>
              <a href={`https://wa.me/${s.whatsapp}`} target="_blank" rel="noreferrer" className="btn-wa">{t("wa_btn")}</a>

              <div className="mini-info">
                <div><b>{t("info1_title")}</b><small>{info1}</small></div>
                <div><b>{t("info2_title")}</b><small>{t("info2_text")}</small></div>
                <div><b>{t("info3_title")}</b><small>{t("info3_text")}</small></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Collection */}
      {perfumes.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">{t("col_eyebrow")}</span>
              <h2><H text={t("col_title")} /></h2>
              <p>{t("col_text")}</p>
            </div>
            <Collection perfumes={perfumes} text={colText} />
          </div>
        </section>
      )}

      {/* Free gift */}
      <section className="section alt">
        <div className="container gift-grid">
          <div className="gift-img">
            <img src="/images/gift.png" alt="Secret Perfume 6ml" />
          </div>
          <div>
            <span className="eyebrow">{t("gift_eyebrow")}</span>
            <h2><H text={t("gift_heading")} /></h2>
            <p className="muted">{t("gift_text")}</p>
            <a href="#order" className="btn">{t("gift_btn")}</a>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">{t("cmp_eyebrow")}</span>
            <h2><H text={t("cmp_title")} /></h2>
            <p>{t("cmp_text")}</p>
          </div>

          <div className="compare">
            <div className="compare-col good">
              <div className="compare-head">
                <img src="/images/hawas-ice.avif" alt={t("good_title")} />
                <div>
                  <small>{t("good_small")}</small>
                  <h3>{t("good_title")}</h3>
                </div>
              </div>
              {L.pros.filter((p) => p.title).map((p, i) => (
                <div key={i} className="compare-item">
                  <span className="mark">✓</span>
                  <div><b>{fill(p.title)}</b><p>{fill(p.text)}</p></div>
                </div>
              ))}
              <div className="trust-pill">{t("trust")}</div>
            </div>

            <div className="compare-col bad">
              <div className="compare-head">
                <span className="bad-icon">❌</span>
                <div>
                  <small>{t("bad_small")}</small>
                  <h3>{t("bad_title")}</h3>
                </div>
              </div>
              {L.cons.filter((c) => c.title).map((c, i) => (
                <div key={i} className="compare-item">
                  <span className="mark">✕</span>
                  <div><b>{fill(c.title)}</b><p>{fill(c.text)}</p></div>
                </div>
              ))}
            </div>
          </div>

          <div className="center">
            <a href="#order" className="btn btn-lg">{t("cmp_btn")}</a>
          </div>
        </div>
      </section>

      {/* Package */}
      <section className="section alt">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">{t("pkg_eyebrow")}</span>
            <h2><H text={t("pkg_title")} /></h2>
            <p>{t("pkg_text")}</p>
          </div>

          <div className="package-card">
            <div className="package-img">
              <img src={productImage} alt={t("pkg_name")} />
            </div>
            <div className="package-body">
              <h3>{t("pkg_name")}</h3>
              <p className="muted">{t("pkg_sub")}</p>
              <div className="price-row">
                <span className="price-new">৳{bn(main.price)}.০০</span>
                <del>৳{bn(oldPrice)}.০০</del>
              </div>
              <span className="save">{t("save_text")}</span>
              <ul className="checks">
                {L.checks.filter((c) => c.bold || c.text).map((c, i) => (
                  <li key={i}><b>{fill(c.bold)}</b> {fill(c.text)}</li>
                ))}
              </ul>
              <div className="gift-line">{t("pkg_gift")}</div>
              <a href="#order" className="btn btn-block btn-lg">{t("pkg_btn")}</a>
            </div>
          </div>
        </div>
      </section>

      {/* COD banner */}
      <section className="container">
        <div className="cod-banner">
          <h2>{t("cod_title")}</h2>
          <p>{t("cod_text")}</p>
          <a href="#order" className="btn">{t("cod_btn")}</a>
        </div>
      </section>

      {/* Order */}
      <section className="section" id="order">
        <div className="container">
          <div className="section-head">
            <h2><H text={t("order_title")} /></h2>
          </div>
          <OrderForm products={products} delivery={delivery} freeBoxes={freeBoxes} text={formText} />
        </div>
      </section>

      <footer className="footer">
        <Brand s={s} className="center-brand" />
        <p>{t("footer_call")} <a href={`tel:${s.phone}`}>{s.phone}</a></p>
        <small>{t("footer_copy")}</small>
      </footer>

      {/* Mobile e shudhu WhatsApp er gol button (nicher order bar sorano hoyeche) */}
      <a href={`https://wa.me/${s.whatsapp}`} className="float-wa" target="_blank" rel="noreferrer" aria-label="WhatsApp">💬</a>
    </>
  );
}
