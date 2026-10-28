"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createManualOrder } from "../../../actions";

const money = (n) => `৳${Number(n).toLocaleString("en-IN")}`;

export default function ManualOrderForm({ products, delivery, freeBoxes }) {
  const [state, action, pending] = useActionState(createManualOrder, null);
  const [productId, setProductId] = useState(products.find((p) => p.active)?.id ?? products[0]?.id);
  const [qty, setQty] = useState(1);
  const [area, setArea] = useState(delivery[0].id);
  const [custom, setCustom] = useState("");
  // Safol hole notun form (key bodle shob field khali)
  const [formKey, setFormKey] = useState(0);

  const v = (!state?.ok && state?.values) || {};
  const product = products.find((p) => p.id === Number(productId));
  const boxes = (Number(product?.boxes) || 1) * qty;
  const free = freeBoxes > 0 && boxes >= freeBoxes;
  const charge = free ? 0 : delivery.find((d) => d.id === area).charge;
  const autoTotal = (product?.price || 0) * qty + charge;

  if (state?.ok && state.at !== formKey) {
    return (
      <div className="manual-done">
        <div className="success-icon-a">✓</div>
        <h3>অর্ডার {state.code} বসানো হয়েছে — মোট {money(state.total)}</h3>
        {state.auto && (
          <p className={state.auto.error ? "adm-err" : "adm-ok"}>
            {state.auto.error
              ? `কুরিয়ারে অটো পাঠানো যায়নি: ${state.auto.error}`
              : `কুরিয়ারে এন্ট্রি হয়েছে — ট্র্যাকিং ${state.auto.tracking}`}
          </p>
        )}
        <div className="adm-form-foot">
          <button className="adm-btn" onClick={() => setFormKey(state.at)}>➕ আরেকটা অর্ডার বসান</button>
          <Link href="/admin/orders" className="adm-btn ghost">অর্ডার লিস্ট দেখুন</Link>
        </div>
      </div>
    );
  }

  return (
    // Error hole form notun kore boshe, jate likha tottho (defaultValue) abar ashe
    <form action={action} className="adm-form" key={`${formKey}-${state?.error || ""}`}>
      <h3>কাস্টমার</h3>
      <div className="adm-row">
        <label>
          নাম *
          <input name="name" required placeholder="কাস্টমারের নাম" defaultValue={v.name} />
        </label>
        <label>
          মোবাইল নাম্বার *
          <input name="phone" required inputMode="numeric" placeholder="01XXXXXXXXX" defaultValue={v.phone} />
        </label>
      </div>
      <label>
        পূর্ণ ঠিকানা * <small className="adm-muted">(এলাকা, থানা, জেলা — কুরিয়ারের জন্য দরকার)</small>
        <input name="address" required placeholder="বাসা/রোড, এলাকা, থানা, জেলা" defaultValue={v.address} />
      </label>

      <h3>অর্ডার</h3>
      <div className="adm-row">
        <label>
          পণ্য *
          <select name="product_id" value={productId} onChange={(e) => setProductId(Number(e.target.value))}>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {money(p.price)}{p.active ? "" : " (বন্ধ)"}{p.stock <= 0 ? " (স্টক শেষ)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          পরিমাণ *
          <input name="qty" type="number" min="1" max="50" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} />
        </label>
      </div>
      <div className="adm-row">
        <label>
          ডেলিভারি এরিয়া *
          <select name="area" value={area} onChange={(e) => setArea(e.target.value)}>
            {delivery.map((d) => (
              <option key={d.id} value={d.id}>{d.label} — {money(d.charge)}</option>
            ))}
          </select>
        </label>
        <label>
          স্ট্যাটাস
          <select name="status" defaultValue="confirmed">
            <option value="confirmed">✅ কনফার্মড (কলে কনফার্ম হয়েছে)</option>
            <option value="pending">⏳ পেন্ডিং (পরে কনফার্ম করবো)</option>
          </select>
        </label>
      </div>

      <div className="manual-sum">
        <div><span>পণ্য</span><b>{money((product?.price || 0) * qty)}</b></div>
        <div><span>ডেলিভারি</span><b>{free ? "ফ্রি 🎉" : money(charge)}</b></div>
        <div className="total"><span>মোট (COD)</span><b>{money(custom !== "" ? Number(custom) || 0 : autoTotal)}</b></div>
      </div>
      <label>
        মোট টাকা বদলাতে চাইলে <small className="adm-muted">(ডিসকাউন্ট দিলে — খালি রাখলে উপরের হিসাবই থাকবে)</small>
        <input name="custom_total" type="number" min="0" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder={String(autoTotal)} />
      </label>
      <label>
        নোট (ঐচ্ছিক)
        <input name="note" placeholder="যেমন: বিকেলে ডেলিভারি দিতে বলেছে" defaultValue={v.note} />
      </label>

      <div className="adm-form-foot">
        <button className="adm-btn" disabled={pending}>{pending ? "বসানো হচ্ছে..." : "✓ অর্ডার বসান"}</button>
        {state?.error && <span className="adm-err">{state.error}</span>}
      </div>
    </form>
  );
}
