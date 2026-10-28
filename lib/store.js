import { sql, ensureTables } from "./db";
import { site } from "@/data/site";

// Admin theke change kora jay emon setting — DB te na thakle ei default gulo cholbe
export const DEFAULT_SETTINGS = {
  brand: site.brand,
  domain: site.domain,
  phone: site.phone,
  whatsapp: site.whatsapp,
  delivery_inside: "70",
  delivery_outside: "130",
  // Mot eto box ba beshi nile delivery charge free (0 = bondho)
  free_delivery_boxes: "2",
  fb_pixel: "",
  // Conversions API token — {"pixelId": "token"} JSON; test code dile Events Manager er Test Events e dekhay
  fb_capi: "{}",
  fb_test_code: "",
  gtm_id: "",
  logo: "",
  // Landing page e customer touch korlei baje emon voice (MP3 link)
  voice: "",
  // WhatsApp: order কনফার্ম e customer ke message
  wa_message: "হাই {name}! {brand} থেকে বলছি 😊 আপনার অর্ডার ({product}) কনফার্ম হয়েছে। মোট দাম {total} টাকা। খুব শীঘ্রই ডেলিভারি পাবেন, ধন্যবাদ!",
  wa_auto: "off",
  wa_phone_id: "",
  wa_token: "",
  wa_template: "order_confirmed",
  wa_lang: "bn",
  wa_last_error: "",
  // Landing page er lekha (admin > ল্যান্ডিং পেজ টেক্সট) — JSON { text, lists }
  content: "",
  gallery: site.gallery.join("\n"),
  // Fake order protection — 0 dile oi limit bondho
  fraud_phone_limit: "2",
  fraud_ip_limit: "3",
  fraud_min_text: "on",
  // BD Courier API key — customer er number er courier hishab (রিসিভ/রিটার্ন %)
  bdc_api_key: "",
  // Telegram: connected chat id gulo (comma diye), ar kon notification jabe
  tg_chats: "",
  tg_notify_incomplete: "on",
  tg_notify_status: "on",
  // Steadfast courier API (admin > কুরিয়ার theke deya)
  steadfast_api_key: "",
  steadfast_secret_key: "",
  // "invalid" hole key bhul — notun key save na kora porjonto Steadfast e call kori na (bhul cheshta te account lock hoy)
  steadfast_key_status: "",
  // Steadfast shesh bar ki error diyechilo (admin page e dekhai)
  steadfast_last_error: "",
  // Pathao courier API
  pathao_client_id: "",
  pathao_client_secret: "",
  pathao_username: "",
  pathao_password: "",
  pathao_store_id: "",
  pathao_store_name: "",
  pathao_key_status: "",
  pathao_token: "",
  pathao_token_exp: "",
  // CarryBee courier API
  carrybee_client_id: "",
  carrybee_client_secret: "",
  carrybee_client_context: "",
  carrybee_store_id: "",
  carrybee_store_name: "",
  carrybee_key_status: "",
  // "সব কনফার্মড পাঠান" kon courier e jabe
  default_courier: "steadfast",
  // "on" hole order কনফার্ম করলেই nije theke courier e entry hoy
  auto_courier: "on",
  // Shesh kokhon courier status check hoyeche (admin khulle 10 min por por)
  courier_last_sync: "",
};

export async function getSettings() {
  try {
    await ensureTables();
    const rows = await sql`SELECT key, value FROM settings`;
    const saved = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const s = { ...DEFAULT_SETTINGS, ...saved };
    // wa.me link e 88 lage — 01XXXXXXXXX dile nije theke 8801... kore nei
    const wa = s.whatsapp.replace(/\D/g, "");
    s.whatsapp = /^01\d{9}$/.test(wa) ? "88" + wa : wa;
    return s;
  } catch (err) {
    console.error("Settings load failed", err);
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(values) {
  await ensureTables();
  for (const [key, value] of Object.entries(values)) {
    if (!(key in DEFAULT_SETTINGS)) continue;
    await sql`
      INSERT INTO settings (key, value) VALUES (${key}, ${String(value ?? "").trim()})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
  }
}

// Prothom bar products table khali thakle data/site.js er package gulo boshay
async function seedProducts() {
  const [{ count }] = await sql`SELECT count(*)::int AS count FROM products`;
  if (count > 0) return;
  for (const [i, p] of site.packages.entries()) {
    await sql`
      INSERT INTO products (name, price, old_price, stock, image, sort)
      VALUES (${p.name}, ${p.price}, ${p.oldPrice || 0}, 100, '/images/combo.png', ${i})`;
  }
}

export async function getProducts({ all = false } = {}) {
  try {
    await ensureTables();
    await seedProducts();
    const rows = all
      ? await sql`SELECT * FROM products ORDER BY sort, id`
      : await sql`SELECT * FROM products WHERE active ORDER BY sort, id`;
    return rows.map((p) => ({ ...p, id: Number(p.id) }));
  } catch (err) {
    console.error("Products load failed", err);
    return site.packages.map((p, i) => ({
      id: i + 1, name: p.name, price: p.price, old_price: p.oldPrice || 0,
      stock: 100, image: "/images/combo.png", sort: i, active: true, boxes: p.boxes || 1,
    }));
  }
}

// Mot box (package er box × quantity) free shima chhuley delivery charge 0
export function deliveryCharge(settings, area, product, qty) {
  const min = Number(settings.free_delivery_boxes) || 0;
  const boxes = (Number(product?.boxes) || 1) * qty;
  return min > 0 && boxes >= min ? 0 : area.charge;
}

// Order e delivery charge alada rakha hoy na — area + box theke ekhonkar charge diye hishab (free hole 0)
export function orderDelivery(settings, products, o) {
  const area = deliveryOptions(settings).find((a) => a.id === o.area);
  if (!area) return 0;
  return Math.min(o.total, deliveryCharge(settings, area, products.find((p) => p.name === o.product), o.qty));
}

// Ekadhik Pixel ID — line/comma/space diye alada, shudhu sothik ID (max 10 ta)
export function pixelIds(value) {
  const ids = String(value || "").split(/[\s,]+/).filter((x) => /^\d{5,20}$/.test(x));
  return [...new Set(ids)].slice(0, 10);
}

export function deliveryOptions(settings) {
  return [
    { id: "inside", label: "ঢাকা সিটির ভেতরে", charge: Number(settings.delivery_inside) || 0 },
    { id: "outside", label: "ঢাকা সিটির বাহিরে", charge: Number(settings.delivery_outside) || 0 },
  ];
}
