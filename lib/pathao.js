import { sql, orderCode } from "./db";
import { getSettings, saveSettings } from "./store";

const BASE = "https://api-hermes.pathao.com/aladdin/api/v1";

export const pathaoTrackingUrl = (cid, phone) =>
  `https://merchant.pathao.com/tracking?consignment_id=${cid}&phone=${phone}`;

export const pathaoReady = (s) =>
  Boolean(s.pathao_client_id && s.pathao_client_secret && s.pathao_username && s.pathao_password && s.pathao_store_id);
export const pathaoCredsSet = (s) =>
  Boolean(s.pathao_client_id && s.pathao_client_secret && s.pathao_username && s.pathao_password);
export const pathaoKeyInvalid = (s) => s.pathao_key_status === "invalid";
const INVALID_MSG = "Pathao লগইন তথ্য ভুল — অ্যাডমিন → কুরিয়ার থেকে সঠিক তথ্য দিয়ে আবার সেভ করুন";

const errorText = (data, status) => {
  const errors = data?.errors ? Object.values(data.errors).flat().join(", ") : "";
  return errors || data?.message || `Pathao error (${status})`;
};

// Access token ~5 din thake — settings e rekhe dei, meyad sheshe notun nei
async function getToken(s, force = false) {
  if (pathaoKeyInvalid(s)) throw new Error(INVALID_MSG);
  if (!force && s.pathao_token && Number(s.pathao_token_exp) > Date.now() + 60_000) return s.pathao_token;

  const res = await fetch(`${BASE}/issue-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: s.pathao_client_id,
      client_secret: s.pathao_client_secret,
      username: s.pathao_username,
      password: s.pathao_password,
      grant_type: "password",
    }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    // Bhul login e Pathao faka 500 o dey — tai jekono fail e mone rakhi, jate barbar cheshta na kori
    await saveSettings({ pathao_key_status: "invalid" });
    const detail = data?.message ? ` (${errorText(data, res.status)})` : "";
    throw new Error(`Pathao লগইন হয়নি — Client ID, Client Secret, ইমেইল আর পাসওয়ার্ড ঠিক আছে কিনা দেখুন${detail}`);
  }
  const exp = Date.now() + (Number(data.expires_in) || 3600) * 1000;
  await saveSettings({ pathao_token: data.access_token, pathao_token_exp: String(exp) });
  s.pathao_token = data.access_token;
  s.pathao_token_exp = String(exp);
  return data.access_token;
}

async function pt(s, path, body, retried = false) {
  const token = await getToken(s);
  const res = await fetch(`${BASE}${path}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  // Token batil hoye gele ekbar notun token niye abar cheshta
  if (res.status === 401 && !retried) {
    await getToken(s, true);
    return pt(s, path, body, true);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data.code && data.code >= 400)) throw new Error(errorText(data, res.status));
  return data;
}

export async function getPathaoStores(s) {
  const data = await pt(s, "/stores");
  return (data.data?.data || data.data || []).map((x) => ({
    id: String(x.store_id),
    name: x.store_name,
    address: x.store_address,
    active: x.is_active !== 0,
  }));
}

/** Ekta order Pathao te pathay. Safol hole { tracking } ferot dey, na hole Error throw kore. */
export async function sendOrderToPathao(orderId) {
  const s = await getSettings();
  if (!pathaoReady(s)) throw new Error("আগে অ্যাডমিন → কুরিয়ার থেকে Pathao সেট করুন (লগইন তথ্য ও স্টোর)");

  const [o] = await sql`SELECT * FROM orders WHERE id = ${orderId}`;
  if (!o) throw new Error("অর্ডার পাওয়া যায়নি");
  if (o.courier_id) throw new Error(`আগেই কুরিয়ারে পাঠানো হয়েছে (${o.tracking_code})`);
  if (o.status === "cancelled") throw new Error("বাতিল অর্ডার পাঠানো যাবে না");

  // City/zone dei na — Pathao thikana theke nije bujhe ney
  const data = await pt(s, "/orders", {
    store_id: Number(s.pathao_store_id),
    merchant_order_id: orderCode(o.id, s.brand),
    recipient_name: o.name.slice(0, 100),
    recipient_phone: o.phone,
    recipient_address: o.address.slice(0, 220),
    delivery_type: 48,
    item_type: 2,
    item_quantity: o.qty,
    item_weight: 0.5,
    amount_to_collect: o.total,
    item_description: `${o.product} x ${o.qty}`.slice(0, 250),
    special_instruction: o.note || "",
  });
  const c = data.data || {};
  const cid = String(c.consignment_id || "");
  if (!cid) throw new Error("Pathao থেকে কনসাইনমেন্ট আইডি আসেনি");
  await sql`
    UPDATE orders SET courier = 'pathao', courier_id = ${cid}, tracking_code = ${cid},
      courier_status = ${c.order_status || "Pending"}, status = 'shipped'
    WHERE id = ${o.id}`;
  return { tracking: cid };
}

// Pathao status → amader status (shesh obostha holei)
function finalStatus(st) {
  const x = String(st || "").toLowerCase();
  if (x === "delivered" || x === "partial_delivery" || x === "partial delivered") return "delivered";
  if (x.includes("return") || x === "cancelled" || x === "pickup_cancelled") return "returned";
  return null;
}

// orderId dile shudhu oi order (webhook theke), na dile shob shipped order
export async function syncPathao(limit = 100, orderId = null) {
  const s = await getSettings();
  if (!pathaoReady(s) || pathaoKeyInvalid(s)) return { checked: 0, changed: [] };
  const rows = orderId
    ? await sql`
        SELECT id, courier_id, status FROM orders
        WHERE id = ${orderId} AND courier = 'pathao' AND courier_id <> '' AND status IN ('confirmed', 'shipped')`
    : await sql`
        SELECT id, courier_id, status FROM orders
        WHERE courier = 'pathao' AND courier_id <> '' AND status = 'shipped'
        ORDER BY created_at LIMIT ${limit}`;
  const changed = [];
  for (const r of rows) {
    try {
      const data = await pt(s, `/orders/${r.courier_id}/info`);
      const cs = data.data?.order_status || "";
      const next = finalStatus(cs);
      if (next) await sql`UPDATE orders SET courier_status = ${cs}, status = ${next} WHERE id = ${r.id}`;
      else await sql`UPDATE orders SET courier_status = ${cs} WHERE id = ${r.id}`;
      if (next && next !== r.status) changed.push({ id: Number(r.id), status: next });
    } catch (err) {
      console.error("Pathao status failed", r.id, err.message);
    }
  }
  return { checked: rows.length, changed };
}
