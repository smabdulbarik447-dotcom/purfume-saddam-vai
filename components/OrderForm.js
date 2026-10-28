"use client";

import { useRef, useState } from "react";
import { tk } from "@/data/site";

// Facebook er browser cookie (_fbp) ar ad click id (_fbc / fbclid) — confirm er por server event e lage
function fbIds() {
  const cookie = (k) => document.cookie.split("; ").find((c) => c.startsWith(k + "="))?.split("=")[1] || "";
  const fbclid = new URLSearchParams(location.search).get("fbclid");
  return {
    fbp: cookie("_fbp"),
    fbc: cookie("_fbc") || (fbclid ? `fb.1.${Date.now()}.${fbclid}` : ""),
    pageUrl: location.href.split("#")[0],
  };
}

// text: admin > ল্যান্ডিং পেজ টেক্সট er lekha (na thakle nicher default)
export default function OrderForm({ products, delivery, freeBoxes = 0, text = {} }) {
  const T = (k, d) => text[k] || d;
  const [pkg, setPkg] = useState(products[0]?.id);
  const [qty, setQty] = useState(() => Object.fromEntries(products.map((p) => [p.id, 1])));
  const [area, setArea] = useState(delivery[0].id);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const formRef = useRef(null);
  const savedDraft = useRef("");
  const checkoutSent = useRef(false);

  // Customer form e prothom bar click/type korlei Pixel e InitiateCheckout (ekbar i)
  function onStartCheckout() {
    if (checkoutSent.current) return;
    checkoutSent.current = true;
    window.fbq?.("track", "InitiateCheckout", { value: total, currency: "BDT", num_items: totalBoxes });
    window.dataLayer?.push({ event: "begin_checkout", value: total, currency: "BDT" });
  }

  const selected = products.find((p) => p.id === pkg) || products[0];
  // Mot box (package er box × quantity) freeBoxes chhuley delivery free — server o eki niyome hishab kore
  const totalBoxes = selected ? (Number(selected.boxes) || 1) * qty[selected.id] : 0;
  const freeShip = freeBoxes > 0 && totalBoxes >= freeBoxes;
  const charge = freeShip ? 0 : delivery.find((d) => d.id === area).charge;
  const subtotal = selected ? selected.price * qty[selected.id] : 0;
  const total = subtotal + charge;

  const changeQty = (id, diff) => {
    setPkg(id);
    setQty((q) => ({ ...q, [id]: Math.max(1, q[id] + diff) }));
  };

  // Customer phone number likhe order na korle "অসম্পূর্ণ অর্ডার" e save hoy
  function saveDraft() {
    const form = new FormData(formRef.current);
    const phone = String(form.get("phone") || "").trim();
    if (!/^01[3-9]\d{8}$/.test(phone)) return;
    const draft = { phone, website: form.get("website"), name: form.get("name"), address: form.get("address"), product: selected?.name };
    const key = JSON.stringify(draft);
    if (key === savedDraft.current) return;
    savedDraft.current = key;
    fetch("/api/incomplete", { method: "POST", headers: { "Content-Type": "application/json" }, body: key }).catch(() => {});
  }

  async function onSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const phone = String(form.get("phone")).trim();
    if (!/^01[3-9]\d{8}$/.test(phone)) {
      setError("সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন");
      return;
    }
    setError("");
    setStatus("loading");
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website: form.get("website"),
          ...fbIds(),
          name: form.get("name"),
          phone,
          address: form.get("address"),
          productId: selected.id,
          area,
          qty: qty[selected.id],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      // Purchase ekhane pathai na — admin কনফার্ম korle server theke (Conversions API) jay
      window.dataLayer?.push({ event: "order_placed", value: total, currency: "BDT" });
      setStatus("done");
    } catch (err) {
      setStatus("idle");
      setError(err.message || "অর্ডার পাঠানো যায়নি, আবার চেষ্টা করুন বা কল করুন");
    }
  }

  if (!selected) return <p className="checkout">এই মুহূর্তে কোনো পণ্য পাওয়া যাচ্ছে না।</p>;

  if (status === "done") {
    return (
      <div className="checkout success">
        <div className="success-icon">✓</div>
        <h3>{T("success_title", "ধন্যবাদ! আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে")}</h3>
        <p>{T("success_text", "আমাদের প্রতিনিধি খুব শীঘ্রই আপনাকে কল করে অর্ডার কনফার্ম করবেন।")}</p>
        <p className="success-total">Total: ৳ {tk(total)}</p>
      </div>
    );
  }

  return (
    <form className="checkout" onSubmit={onSubmit} ref={formRef} onBlur={saveDraft} onFocus={onStartCheckout}>
      {/* Bot dhorar fad: manush eta dekhe na, bot puron kore */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hp-field" aria-hidden="true" />
      <h3 className="form-head">{T("form_head", "পছন্দের ফ্লেভার কম্বো সিলেক্ট করুন")}</h3>
      <div className="packages">
        {products.map((p) => (
          <label key={p.id} className={`package ${pkg === p.id ? "active" : ""}`}>
            <input type="radio" name="pkg" checked={pkg === p.id} onChange={() => setPkg(p.id)} />
            {p.image && <img src={p.image} alt="" />}
            <div className="package-info">
              <span>{p.name}</span>
              <div className="qty">
                <button type="button" onClick={() => changeQty(p.id, -1)} aria-label="কমান">−</button>
                <span>{qty[p.id]}</span>
                <button type="button" onClick={() => changeQty(p.id, 1)} aria-label="বাড়ান">+</button>
              </div>
            </div>
            <b>৳ {tk(p.price)}</b>
          </label>
        ))}
      </div>

      <div className="checkout-grid">
        <div className="billing">
          <h3>{T("billing_title", "Billing details")}</h3>
          <label>
            {T("name_label", "আপনার নাম")} <i>*</i>
            <input name="name" required placeholder={T("name_ph", "আপনার নাম")} />
          </label>
          <label>
            {T("address_label", "আপনার ঠিকানা")} <i>*</i>
            <input name="address" required placeholder={T("address_ph", "বাসা/রোড, থানা, জেলা")} />
          </label>
          <label>
            {T("phone_label", "মোবাইল নাম্বার")} <i>*</i>
            <input name="phone" required inputMode="numeric" maxLength={11} placeholder="01XXXXXXXXX" />
          </label>
          <h3 className="ship-head">{T("shipping_title", "Shipping")}</h3>
          {freeBoxes > 0 && (
            <p className={`free-ship ${freeShip ? "on" : ""}`}>
              {freeShip ? T("free_done", "🎉 অভিনন্দন! আপনার ডেলিভারি চার্জ সম্পূর্ণ ফ্রি") : T("free_hint", `🚚 ${freeBoxes} বক্স বা বেশি নিলে ডেলিভারি চার্জ ফ্রি!`)}
            </p>
          )}
          {delivery.map((d) => (
            <label key={d.id} className={`radio ${area === d.id ? "active" : ""}`}>
              <input type="radio" name="area" checked={area === d.id} onChange={() => setArea(d.id)} />
              <span>{d.label}: </span>
              {freeShip ? <b><del>৳ {tk(d.charge)}</del> ফ্রি</b> : <b>৳ {tk(d.charge)}</b>}
            </label>
          ))}
        </div>

        <div className="your-order">
          <h3>{T("summary_title", "Your order")}</h3>
          <div className="row head"><span>Product</span><span>Subtotal</span></div>
          <div className="row">
            <span>{selected.name} × {qty[selected.id]}</span>
            <span>৳ {tk(subtotal)}</span>
          </div>
          <div className="row"><span>Subtotal</span><span>৳ {tk(subtotal)}</span></div>
          <div className="row"><span>Shipment</span><span>{freeShip ? "ফ্রি 🎉" : `৳ ${tk(charge)}`}</span></div>
          <div className="row total"><span>Total</span><span>৳ {tk(total)}</span></div>

          <div className="cod-box">
            <label className="radio active">
              <input type="radio" checked readOnly />
              <span>{T("cod_label", "ক্যাশ অন ডেলিভারি")}</span>
            </label>
            <p className="hadith">
              {T("hadith", "রাসুল (সা.) বলেছেন : যদি কোনো ব্যক্তি পণ্য কেনার উদ্দেশ্য ছাড়াই ক্রেতা সেজে বিক্রেতাকে বিপদে ফেলার জন্য পরিস্থিতি তৈরি করে। এটি বিক্রেতা বা সাধারণ ক্রেতা উভয়ের জন্যই ক্ষতিকর। (সহীহ বুখারী : ২১৪০)")}
            </p>
          </div>
          <p className="privacy">
            {T("privacy", "Your personal data will be used to process your order, support your experience throughout this website, and for other purposes described in our privacy policy.")}
          </p>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-block" disabled={status === "loading"}>
            {status === "loading" ? "অপেক্ষা করুন..." : `${T("submit_btn", "অর্ডার করুন")}  ৳ ${tk(total)}`}
          </button>
        </div>
      </div>
    </form>
  );
}
