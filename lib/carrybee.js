import { sql, orderCode } from "./db";
import { getSettings, saveSettings } from "./store";

const BASE = "https://developers.carrybee.com/api/v2";

export const carrybeeTrackingUrl = (cid) => `https://carrybee.com/track?id=${cid}`;

export const carrybeeCredsSet = (s) =>
  Boolean(s.carrybee_client_id && s.carrybee_client_secret && s.carrybee_client_context);
export const carrybeeReady = (s) => carrybeeCredsSet(s) && Boolean(s.carrybee_store_id);
export const carrybeeKeyInvalid = (s) => s.carrybee_key_status === "invalid";
const INVALID_MSG = "CarryBee API তথ্য ভুল — অ্যাডমিন → কুরিয়ার থেকে সঠিক তথ্য দিয়ে আবার সেভ করুন";

async function cb(s, path, body) {
  if (carrybeeKeyInvalid(s)) throw new Error(INVALID_MSG);
  const res = await fetch(`${BASE}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      "Client-ID": s.carrybee_client_id,
      "Client-Secret": s.carrybee_client_secret,
      "Client-Context": s.carrybee_client_context,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 || res.status === 403) {
    await saveSettings({ carrybee_key_status: "invalid" });
    throw new Error(INVALID_MSG);
  }
  if (!res.ok || data.error === true) {
    const errors = data.errors && typeof data.errors === "object" ? Object.values(data.errors).flat().join(", ") : "";
    const err = new Error(errors || data.message || `CarryBee error (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function getCarrybeeStores(s) {
  const data = await cb(s, "/stores");
  return (data.data?.stores || []).map((x) => ({ id: String(x.id), name: x.name, address: x.address || "" }));
}

/** Ekta order CarryBee te pathay. Safol hole { tracking } ferot dey, na hole Error throw kore. */
export async function sendOrderToCarrybee(orderId) {
  const s = await getSettings();
  if (!carrybeeReady(s)) throw new Error("আগে অ্যাডমিন → কুরিয়ার থেকে CarryBee সেট করুন (API তথ্য ও স্টোর)");

  const [o] = await sql`SELECT * FROM orders WHERE id = ${orderId}`;
  if (!o) throw new Error("অর্ডার পাওয়া যায়নি");
  if (o.courier_id) throw new Error(`আগেই কুরিয়ারে পাঠানো হয়েছে (${o.tracking_code})`);
  if (o.status === "cancelled") throw new Error("বাতিল অর্ডার পাঠানো যাবে না");

  // CarryBee te city/zone lagbei — customer er thikana theke CarryBee nijei ber kore dey
  const addr = await cb(s, "/address-details", { query: o.address });
  const { city_id, zone_id, area_id } = addr.data || {};
  if (!city_id || !zone_id) {
    throw new Error("ঠিকানা থেকে শহর/এলাকা বোঝা যায়নি — অর্ডারের ঠিকানায় থানা ও জেলা লিখে আবার পাঠান");
  }

  const data = await cb(s, "/orders", {
    store_id: s.carrybee_store_id,
    merchant_order_id: orderCode(o.id, s.brand),
    delivery_type: 1,
    product_type: 1,
    recipient_phone: o.phone,
    recipient_name: o.name.slice(0, 100),
    recipient_address: o.address.slice(0, 250),
    city_id: Number(city_id),
    zone_id: Number(zone_id),
    ...(area_id ? { area_id: Number(area_id) } : {}),
    item_weight: 500,
    item_quantity: o.qty,
    collectable_amount: o.total,
    product_description: `${o.product} x ${o.qty}`.slice(0, 250),
    ...(o.note ? { special_instruction: o.note.slice(0, 250) } : {}),
  });
  const c = data.data?.order || {};
  const cid = String(c.consignment_id || "");
  if (!cid) throw new Error("CarryBee থেকে কনসাইনমেন্ট আইডি আসেনি");
  await sql`
    UPDATE orders SET courier = 'carrybee', courier_id = ${cid}, tracking_code = ${cid},
      courier_status = ${c.transfer_status || "Pending"}, status = 'shipped'
    WHERE id = ${o.id}`;
  return { tracking: cid };
}

// CarryBee status → amader status (shesh obostha holei)
function finalStatus(st) {
  const x = String(st || "").toLowerCase().replace(/[\s_]+/g, "-");
  if (x === "delivered" || x === "partial-delivered" || x === "partially-delivered") return "delivered";
  if (x.includes("return") || x === "cancelled") return "returned";
  return null;
}

// orderId dile shudhu oi order (webhook theke), na dile shob shipped order
export async function syncCarrybee(limit = 100, orderId = null) {
  const s = await getSettings();
  if (!carrybeeReady(s) || carrybeeKeyInvalid(s)) return { checked: 0, changed: [] };
  const rows = orderId
    ? await sql`
        SELECT id, courier_id, status FROM orders
        WHERE id = ${orderId} AND courier = 'carrybee' AND courier_id <> '' AND status IN ('confirmed', 'shipped')`
    : await sql`
        SELECT id, courier_id, status FROM orders
        WHERE courier = 'carrybee' AND courier_id <> '' AND status = 'shipped'
        ORDER BY created_at LIMIT ${limit}`;
  const changed = [];
  for (const r of rows) {
    try {
      const data = await cb(s, `/orders/${r.courier_id}/details`);
      const cs = data.data?.transfer_status || "";
      const next = finalStatus(cs);
      if (next) await sql`UPDATE orders SET courier_status = ${cs}, status = ${next} WHERE id = ${r.id}`;
      else await sql`UPDATE orders SET courier_status = ${cs} WHERE id = ${r.id}`;
      if (next && next !== r.status) changed.push({ id: Number(r.id), status: next });
    } catch (err) {
      console.error("CarryBee status failed", r.id, err.message);
    }
  }
  return { checked: rows.length, changed };
}
