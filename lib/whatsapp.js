import { createHmac } from "crypto";
import { sql } from "./db";
import { getSettings, saveSettings } from "./store";

// WhatsApp Business Cloud API — order কনফার্ম holei customer ke template message
const GRAPH = "https://graph.facebook.com/v24.0";

export const waReady = (s) => s.wa_auto === "on" && Boolean(s.wa_phone_id && s.wa_token && s.wa_template);

const bnDigits = (n) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);

/** Message er lekha (manual button er jonno) — {name} {product} {total} {brand} boshay */
export function confirmText(s, o) {
  return String(s.wa_message || "")
    .replaceAll("{name}", o.name)
    .replaceAll("{product}", o.qty > 1 ? `${o.product} × ${o.qty}` : o.product)
    .replaceAll("{total}", bnDigits(Number(o.total).toLocaleString("en-IN")))
    .replaceAll("{brand}", s.brand);
}

export const waLink = (s, o) => `https://wa.me/88${o.phone}?text=${encodeURIComponent(confirmText(s, o))}`;

// Telegram button er choto link (/wa/ID?k=...) er gopon key — onno keu order er tottho dekhte na pare
export const waConfirmKey = (id) =>
  createHmac("sha256", process.env.CRON_SECRET || "").update(`wa-confirm:${id}`).digest("hex").slice(0, 16);

/**
 * Template e 4 ta variable: {{1}} nam, {{2}} product, {{3}} mot taka, {{4}} brand.
 * Customer er WhatsApp na thakle Meta error dey — tokhon chupchap bad.
 */
export async function sendConfirmWhatsApp(orderId) {
  const s = await getSettings();
  if (!waReady(s)) return null;
  const [o] = await sql`SELECT id, name, phone, product, qty, total, wa_sent FROM orders WHERE id = ${orderId}`;
  if (!o || o.wa_sent) return null;

  const params = [o.name, o.qty > 1 ? `${o.product} × ${o.qty}` : o.product, String(o.total), s.brand]
    .map((text) => ({ type: "text", text: String(text).slice(0, 200) }));
  try {
    const res = await fetch(`${GRAPH}/${s.wa_phone_id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${s.wa_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: `88${o.phone}`,
        type: "template",
        template: { name: s.wa_template, language: { code: s.wa_lang || "bn" }, components: [{ type: "body", parameters: params }] },
      }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) throw new Error(data.error?.error_data?.details || data.error?.message || `HTTP ${res.status}`);
    await sql`UPDATE orders SET wa_sent = true WHERE id = ${o.id}`;
    await saveSettings({ wa_last_error: "" });
    return { ok: true };
  } catch (err) {
    console.error("WhatsApp send failed", o.id, err.message);
    await saveSettings({ wa_last_error: `${new Date().toISOString().slice(0, 16)} — অর্ডার #${o.id}: ${err.message}` });
    return { error: err.message };
  }
}
