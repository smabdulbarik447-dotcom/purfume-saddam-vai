import { sql, orderCode } from "./db";
import { getSettings, saveSettings } from "./store";

const BASE = "https://portal.packzy.com/api/v1";

export const trackingUrl = (code) => `https://steadfast.com.bd/t/${code}`;

export const COURIER_STATUS = {
  in_review: "রিভিউতে",
  pending: "পথে আছে",
  hold: "হোল্ড",
  delivered_approval_pending: "ডেলিভারড (অনুমোদন বাকি)",
  partial_delivered_approval_pending: "আংশিক ডেলিভারড (অনুমোদন বাকি)",
  cancelled_approval_pending: "বাতিল (অনুমোদন বাকি)",
  unknown_approval_pending: "অজানা (অনুমোদন বাকি)",
  delivered: "ডেলিভারড",
  partial_delivered: "আংশিক ডেলিভারড",
  cancelled: "বাতিল/রিটার্ন",
  unknown: "অজানা",
};

// Courier er status theke amader order status
const FINAL = {
  delivered: "delivered",
  partial_delivered: "delivered",
  delivered_approval_pending: "delivered",
  partial_delivered_approval_pending: "delivered",
  cancelled: "returned",
  cancelled_approval_pending: "returned",
};

export const sfReady = (s) => Boolean(s.steadfast_api_key && s.steadfast_secret_key);
export const sfKeyInvalid = (s) => s.steadfast_key_status === "invalid";
const INVALID_MSG = "Steadfast API Key ভুল — অ্যাডমিন → কুরিয়ার থেকে সঠিক Key দিয়ে আবার সেভ করুন";

async function sf(s, path, body) {
  if (sfKeyInvalid(s)) throw new Error(INVALID_MSG);
  const res = await fetch(`${BASE}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      "Api-Key": s.steadfast_api_key,
      "Secret-Key": s.steadfast_secret_key,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  let data = {};
  try { data = JSON.parse(text); } catch {}
  // Key thik kintu Steadfast account e order neya ekhono chalu hoyni — eta bhul key na
  if (/not active/i.test(text)) {
    throw new Error("Steadfast অ্যাকাউন্ট এখনো অর্ডার নেওয়ার জন্য চালু (active) হয়নি — Steadfast এর সাথে যোগাযোগ করে অ্যাকাউন্ট active করান। API Key ঠিক আছে।");
  }
  // Bhul key: mone rakhi, jate barbar cheshta kore account lock na hoy
  if (res.status === 401 || data.status === 401) {
    const left = data.attempts_left != null ? ` (আর ${data.attempts_left} বার ভুল করলে Steadfast লক করতে পারে)` : "";
    const msg = `${data.message || "Unauthorized"}${left}`;
    await saveSettings({ steadfast_key_status: "invalid", steadfast_last_error: msg });
    throw new Error(msg);
  }
  if (!res.ok || (data.status && data.status !== 200)) {
    const errors = data.errors ? Object.values(data.errors).flat().join(", ") : "";
    throw new Error(errors || data.message || `Steadfast error (${res.status})`);
  }
  return data;
}

export async function getBalance(s) {
  const data = await sf(s, "/get_balance");
  return data.current_balance;
}

/** Ekta order Steadfast e pathay. Safol hole { tracking } ferot dey, na hole Error throw kore. */
export async function sendOrderToSteadfast(orderId) {
  const s = await getSettings();
  if (!sfReady(s)) throw new Error("আগে অ্যাডমিন → কুরিয়ার থেকে Steadfast API Key দিন");

  const [o] = await sql`SELECT * FROM orders WHERE id = ${orderId}`;
  if (!o) throw new Error("অর্ডার পাওয়া যায়নি");
  if (o.courier_id) throw new Error(`আগেই পাঠানো হয়েছে (ট্র্যাকিং ${o.tracking_code})`);
  if (o.status === "cancelled") throw new Error("বাতিল অর্ডার পাঠানো যাবে না");

  const data = await sf(s, "/create_order", {
    invoice: orderCode(o.id, s.brand),
    recipient_name: o.name.slice(0, 100),
    recipient_phone: o.phone,
    recipient_address: o.address.slice(0, 250),
    cod_amount: o.total,
    item_description: `${o.product} x ${o.qty}`.slice(0, 250),
    note: o.note || "",
    delivery_type: 0,
  });
  const c = data.consignment;
  await sql`
    UPDATE orders SET courier_id = ${String(c.consignment_id)}, tracking_code = ${c.tracking_code || ""},
      courier = 'steadfast', courier_status = ${c.status || "in_review"}, status = 'shipped'
    WHERE id = ${o.id}`;
  return { tracking: c.tracking_code };
}

/** Shipped order gulor Steadfast status ene amader status update kore. */
// orderId dile shudhu oi order (webhook theke), na dile shob shipped order
export async function syncSteadfast(limit = 100, orderId = null) {
  const s = await getSettings();
  if (!sfReady(s) || sfKeyInvalid(s)) return { checked: 0, changed: [] };
  const rows = orderId
    ? await sql`
        SELECT id, courier_id, status FROM orders
        WHERE id = ${orderId} AND courier_id <> '' AND courier IN ('steadfast', '') AND status IN ('confirmed', 'shipped')`
    : await sql`
        SELECT id, courier_id, status FROM orders
        WHERE courier_id <> '' AND courier IN ('steadfast', '') AND status = 'shipped'
        ORDER BY created_at LIMIT ${limit}`;
  const changed = [];
  for (const r of rows) {
    try {
      const data = await sf(s, `/status_by_cid/${r.courier_id}`);
      const cs = data.delivery_status || "";
      const next = FINAL[cs];
      if (next) await sql`UPDATE orders SET courier_status = ${cs}, status = ${next} WHERE id = ${r.id}`;
      else await sql`UPDATE orders SET courier_status = ${cs} WHERE id = ${r.id}`;
      if (next && next !== r.status) changed.push({ id: Number(r.id), status: next });
    } catch (err) {
      console.error("Steadfast status failed", r.id, err.message);
    }
  }
  return { checked: rows.length, changed };
}
