import { sql } from "./db";
import { getSettings } from "./store";
import { sfReady, sfKeyInvalid, sendOrderToSteadfast, syncSteadfast } from "./steadfast";
import { pathaoReady, pathaoKeyInvalid, sendOrderToPathao, syncPathao, pathaoTrackingUrl } from "./pathao";
import { carrybeeReady, carrybeeKeyInvalid, sendOrderToCarrybee, syncCarrybee, carrybeeTrackingUrl } from "./carrybee";

// Shob courier ek jaygay — order page, Telegram, cron shob ekhan theke use kore
export const COURIERS = {
  steadfast: { id: "steadfast", name: "Steadfast", icon: "📮" },
  pathao: { id: "pathao", name: "Pathao", icon: "🛵" },
  carrybee: { id: "carrybee", name: "CarryBee", icon: "🐝" },
};

const READY = {
  steadfast: (s) => sfReady(s) && !sfKeyInvalid(s),
  pathao: (s) => pathaoReady(s) && !pathaoKeyInvalid(s),
  carrybee: (s) => carrybeeReady(s) && !carrybeeKeyInvalid(s),
};
export const courierReady = (id, s) => Boolean(READY[id]?.(s));

export const readyCouriers = (s) => Object.keys(COURIERS).filter((id) => courierReady(id, s));

const SEND = { steadfast: sendOrderToSteadfast, pathao: sendOrderToPathao, carrybee: sendOrderToCarrybee };
export function sendOrderToCourier(orderId, courier) {
  if (!SEND[courier]) throw new Error("অজানা কুরিয়ার");
  return SEND[courier](orderId);
}

export async function syncAllCouriers(limit = 100) {
  const results = await Promise.all([syncSteadfast(limit), syncPathao(limit), syncCarrybee(limit)]);
  return {
    checked: results.reduce((n, r) => n + r.checked, 0),
    changed: results.flatMap((r) => r.changed),
  };
}

export function trackingLink(o) {
  if (!o.courier_id) return "";
  if (o.courier === "pathao") return pathaoTrackingUrl(o.courier_id, o.phone);
  if (o.courier === "carrybee") return carrybeeTrackingUrl(o.courier_id);
  return `https://steadfast.com.bd/t/${o.tracking_code}`;
}

export const courierName = (o) => COURIERS[o.courier || "steadfast"]?.name || "Courier";
export const courierIcon = (o) => COURIERS[o.courier || "steadfast"]?.icon || "📦";

// Auto entry kon courier e: default ta chalu thakle sheta, na hole je ta chalu
export function autoCourierFor(s) {
  if (s.auto_courier !== "on") return null;
  const ready = readyCouriers(s);
  if (!ready.length) return null;
  return ready.includes(s.default_courier) ? s.default_courier : ready[0];
}

/**
 * Order কনফার্ম holei call hoy: auto chalu thakle courier e pathay.
 * null = auto bondho / courier nei / age i pathano; na hole { courier, tracking } ba { courier, error }
 */
export async function autoSendOnConfirm(orderId) {
  const s = await getSettings();
  const courier = autoCourierFor(s);
  if (!courier) return null;
  const [o] = await sql`SELECT courier_id FROM orders WHERE id = ${orderId}`;
  if (!o || o.courier_id) return null;
  try {
    const { tracking } = await sendOrderToCourier(orderId, courier);
    return { courier, tracking };
  } catch (err) {
    return { courier, error: err.message };
  }
}

// Telegram/alert e dekhanor lekha
export function autoSendText(r) {
  if (!r) return "";
  const c = COURIERS[r.courier];
  return r.error
    ? `⚠️ ${c.name} এ অটো পাঠানো যায়নি: ${r.error}`
    : `${c.icon} ${c.name} এ অটো এন্ট্রি হয়েছে — ট্র্যাকিং ${r.tracking}`;
}
