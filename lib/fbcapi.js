import { createHash } from "crypto";
import { sql } from "./db";
import { getSettings, getProducts, pixelIds } from "./store";

// Facebook Conversions API — Purchase browser theke na giye, admin confirm korle server theke jay.
// Return hole "OrderReturned" custom event jay, jeta diye Ads e oi customer der exclude kora jay.
const GRAPH = "https://graph.facebook.com/v24.0";

const sha = (v) => createHash("sha256").update(String(v).trim().toLowerCase()).digest("hex");

export function capiTokens(s) {
  try {
    return JSON.parse(s.fb_capi || "{}") || {};
  } catch {
    return {};
  }
}

// Token deya ache emon pixel gulo
export const capiPixels = (s) => {
  const tokens = capiTokens(s);
  return pixelIds(s.fb_pixel).filter((id) => tokens[id]);
};

function userData(o) {
  const phone = "88" + o.phone; // 8801XXXXXXXXX
  const first = String(o.name || "").trim().split(/\s+/)[0];
  return {
    ph: [sha(phone)],
    external_id: [sha(phone)],
    ...(first ? { fn: [sha(first)] } : {}),
    country: [sha("bd")],
    ...(o.ip ? { client_ip_address: o.ip } : {}),
    ...(o.user_agent ? { client_user_agent: o.user_agent } : {}),
    ...(o.fbp ? { fbp: o.fbp } : {}),
    ...(o.fbc ? { fbc: o.fbc } : {}),
  };
}

async function send(s, event) {
  const tokens = capiTokens(s);
  const pixels = capiPixels(s);
  if (!pixels.length) return { sent: 0, errors: ["Conversions API token দেওয়া নেই"] };
  let sent = 0;
  const errors = [];
  for (const id of pixels) {
    try {
      const res = await fetch(`${GRAPH}/${id}/events?access_token=${encodeURIComponent(tokens[id])}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [event], ...(s.fb_test_code ? { test_event_code: s.fb_test_code } : {}) }),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error?.error_user_msg || data.error?.message || `HTTP ${res.status}`);
      sent++;
    } catch (err) {
      errors.push(`${id}: ${err.message}`);
      console.error("FB CAPI failed", id, event.event_name, err.message);
    }
  }
  return { sent, errors };
}

function baseEvent(o, name, s) {
  // Website order e browser er tottho (user agent) thake. Call e boshano/অসম্পূর্ণ theke bana/purono order e
  // ta nei — Facebook "website" event e user agent chhara reject kore, tai oi gulo "phone_call" hishebe jay.
  const fromWebsite = Boolean(o.user_agent);
  return {
    event_name: name,
    event_time: Math.floor(Date.now() / 1000),
    event_id: `${name.toLowerCase()}-${o.id}`, // ek order er ek event ekbar-i dhora hoy
    action_source: fromWebsite ? "website" : "phone_call",
    ...(fromWebsite
      ? { event_source_url: o.page_url || (s.domain ? `https://${s.domain.replace(/^https?:\/\//, "")}` : undefined) }
      : {}),
    user_data: userData(o),
  };
}

/** Order কনফার্ম (ba শিপড/ডেলিভারড) hole Purchase — ekbar-i jay */
export async function sendPurchase(orderId) {
  const s = await getSettings();
  if (!capiPixels(s).length) return null;
  const [o] = await sql`SELECT * FROM orders WHERE id = ${orderId}`;
  if (!o || o.fb_purchase_sent) return null;
  const products = await getProducts({ all: true });
  const p = products.find((x) => x.name === o.product);
  const r = await send(s, {
    ...baseEvent(o, "Purchase", s),
    custom_data: {
      currency: "BDT",
      value: o.total,
      content_name: o.product,
      content_type: "product",
      ...(p ? { content_ids: [String(p.id)], contents: [{ id: String(p.id), quantity: o.qty, item_price: p.price }] } : {}),
      num_items: o.qty,
      order_id: String(o.id),
    },
  });
  if (r.sent > 0) await sql`UPDATE orders SET fb_purchase_sent = true WHERE id = ${o.id}`;
  return r;
}

/** Customer product nilo na (রিটার্ন) — custom event, Ads e exclude audience banate */
export async function sendReturned(orderId) {
  const s = await getSettings();
  if (!capiPixels(s).length) return null;
  const [o] = await sql`SELECT * FROM orders WHERE id = ${orderId}`;
  if (!o || o.fb_return_sent) return null;
  const r = await send(s, {
    ...baseEvent(o, "OrderReturned", s),
    custom_data: { currency: "BDT", value: o.total, order_id: String(o.id) },
  });
  if (r.sent > 0) await sql`UPDATE orders SET fb_return_sent = true WHERE id = ${o.id}`;
  return r;
}

/** Je kono jaygay status bodlale eta call hoy */
export async function fbOnStatus(orderId, status) {
  if (["confirmed", "shipped", "delivered"].includes(status)) return sendPurchase(orderId);
  if (status === "returned") return sendReturned(orderId);
  return null; // বাতিল/পেন্ডিং e kichu jay na
}
