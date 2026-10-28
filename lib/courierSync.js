import { createHmac } from "crypto";
import { sql } from "./db";
import { getSettings, saveSettings } from "./store";
import { syncAllCouriers } from "./courier";
import { syncSteadfast } from "./steadfast";
import { syncPathao } from "./pathao";
import { syncCarrybee } from "./carrybee";
import { syncOrder, statusChangeText } from "./telegram";
import { afterStatusChange } from "./orderHooks";

// Courier status bodlale: Telegram e janano + Facebook (রিটার্ন hole OrderReturned)
export async function applyChanges(changed) {
  for (const c of changed) {
    await syncOrder(c.id, { change: `${statusChangeText(c.status)} (কুরিয়ার)` });
    await afterStatusChange(c.id, c.status);
  }
}

// Webhook URL er gopon key — CRON_SECRET theke banano, tai alada env lage na
export const webhookKey = () =>
  createHmac("sha256", process.env.CRON_SECRET || "").update("courier-webhook").digest("hex").slice(0, 24);

/** Ekta order er courier status ene update kore (webhook ashle) */
export async function syncOneOrder(orderId) {
  const [o] = await sql`SELECT id, courier FROM orders WHERE id = ${orderId}`;
  if (!o) return { checked: 0, changed: [] };
  const fn = o.courier === "pathao" ? syncPathao : o.courier === "carrybee" ? syncCarrybee : syncSteadfast;
  const res = await fn(1, o.id);
  await applyChanges(res.changed);
  return res;
}

/** Webhook er body theke consignment/tracking/invoice ber kore amader order khuje ber kore */
export async function findOrderFromWebhook(body) {
  const pick = (...keys) => keys.map((k) => body?.[k] ?? body?.data?.[k] ?? body?.order?.[k]).filter((v) => v != null && v !== "");
  const ids = pick("consignment_id", "tracking_code", "tracking_id", "cid").map(String);
  for (const id of ids) {
    const [o] = await sql`SELECT id FROM orders WHERE courier_id = ${id} OR tracking_code = ${id} LIMIT 1`;
    if (o) return Number(o.id);
  }
  // merchant_order_id / invoice = amader order code (jemon AV000012)
  for (const code of pick("merchant_order_id", "invoice").map(String)) {
    const num = Number(code.replace(/\D/g, ""));
    if (num) {
      const [o] = await sql`SELECT id FROM orders WHERE id = ${num} AND courier_id <> '' LIMIT 1`;
      if (o) return Number(o.id);
    }
  }
  return null;
}

/** Admin panel khola thakle: shesh check er 4 minute por hole shob shipped order er status ane; koyta bodlalo ferot dey */
export async function maybeAutoSync() {
  const s = await getSettings();
  const last = Number(s.courier_last_sync) || 0;
  if (Date.now() - last < 4 * 60 * 1000) return 0;
  await saveSettings({ courier_last_sync: String(Date.now()) });
  const res = await syncAllCouriers(100);
  await applyChanges(res.changed);
  return res.changed.length;
}
