"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { sql, ensureTables, STATUSES, orderCode } from "@/lib/db";
import { saveSettings, getProducts, getSettings, deliveryOptions, deliveryCharge, pixelIds } from "@/lib/store";
import { checkPassword, login, logout, requireAdmin } from "@/lib/auth";
import { deleteImages } from "@/lib/images";
import { getBalance } from "@/lib/steadfast";
import { getPathaoStores } from "@/lib/pathao";
import { getCarrybeeStores } from "@/lib/carrybee";
import { COURIERS, sendOrderToCourier, syncAllCouriers, autoSendOnConfirm, autoSendText } from "@/lib/courier";
import { capiTokens } from "@/lib/fbcapi";
import { checkPhone } from "@/lib/bdcourier";
import { maybeAutoSync } from "@/lib/courierSync";
import { afterStatusChange } from "@/lib/orderHooks";
import { notifyNewOrder, syncOrder, statusChangeText, markDeleted, sendToAll, removeChat, tg } from "@/lib/telegram";

const refreshAdmin = () => revalidatePath("/admin", "layout");
// Landing page o abar notun data diye toiri hobe
const refreshAll = () => revalidatePath("/", "layout");

export async function loginAction(_prev, formData) {
  if (!checkPassword(formData.get("password"))) {
    return { error: "পাসওয়ার্ড ভুল হয়েছে" };
  }
  await login();
  redirect("/admin");
}

export async function logoutAction() {
  await logout();
  redirect("/admin/login");
}

/* ---------- Orders ---------- */

export async function updateStatus(id, status) {
  await requireAdmin();
  if (!STATUSES.some((s) => s.id === status)) return;
  await sql`UPDATE orders SET status = ${status} WHERE id = ${id}`;
  // কনফার্ম korle nije theke courier e entry (বাতিল/onno status e kichu hoy na)
  const auto = status === "confirmed" ? await autoSendOnConfirm(id) : null;
  refreshAdmin();
  const change = [statusChangeText(status), autoSendText(auto)].filter(Boolean).join("\n");
  after(() => syncOrder(id, { change }));
  // কনফার্ম e Facebook Purchase, রিটার্ন e OrderReturned (বাতিল e kichu na)
  after(() => afterStatusChange(id, status));
  return auto;
}

// Call e customer thik thikana/nam/number dile order e bodlano
export async function updateOrderInfo(id, info) {
  await requireAdmin();
  const name = String(info?.name || "").trim().slice(0, 100);
  const phone = String(info?.phone || "").replace(/\D/g, "").replace(/^880/, "0");
  const address = String(info?.address || "").trim().slice(0, 500);
  if (!name || !address) return { error: "নাম আর ঠিকানা খালি রাখা যাবে না" };
  if (!/^01[3-9]\d{8}$/.test(phone)) return { error: "সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন" };

  const [o] = await sql`SELECT name, phone, address, area, product, qty, total, courier_id, courier FROM orders WHERE id = ${id}`;
  if (!o) return { error: "অর্ডার পাওয়া যায়নি" };

  // ঢাকার ভেতরে/বাইরে bodlale: purono delivery charge bad, notun ta jog (discount thakle seta thik thake)
  const settings = await getSettings();
  const areas = deliveryOptions(settings);
  const newArea = areas.find((a) => a.id === info?.area) || areas.find((a) => a.id === o.area);
  let total = o.total;
  if (newArea && newArea.id !== o.area) {
    const product = (await getProducts({ all: true })).find((p) => p.name === o.product);
    const oldArea = areas.find((a) => a.id === o.area);
    const oldCharge = oldArea ? deliveryCharge(settings, oldArea, product, o.qty) : 0;
    total = Math.max(0, o.total - oldCharge + deliveryCharge(settings, newArea, product, o.qty));
  }
  const area = newArea?.id || o.area;

  await sql`UPDATE orders SET name = ${name}, phone = ${phone}, address = ${address}, area = ${area}, total = ${total} WHERE id = ${id}`;
  refreshAdmin();

  const changed = [
    o.name !== name && "নাম",
    o.phone !== phone && "নাম্বার",
    o.address !== address && "ঠিকানা",
    o.area !== area && `এলাকা (${newArea.label}, মোট ৳${total})`,
  ].filter(Boolean);
  if (changed.length) after(() => syncOrder(id, { change: `✏️ <b>${changed.join(", ")} আপডেট হয়েছে</b>` }));
  // Courier e age i pathano thakle sekhane nijer theke bodlay na — janiye dei
  return {
    ok: true,
    total,
    totalChanged: total !== o.total,
    warning: o.courier_id
      ? `অর্ডারটা আগেই ${COURIERS[o.courier || "steadfast"]?.name || "কুরিয়ার"} এ পাঠানো হয়েছে (${o.courier_id}) — ওখানে ঠিকানা/টাকা কুরিয়ারের প্যানেল থেকে বা কল করে বদলাতে হবে।`
      : "",
  };
}

export async function updateNote(id, note) {
  await requireAdmin();
  await sql`UPDATE orders SET note = ${String(note).slice(0, 500)} WHERE id = ${id}`;
  refreshAdmin();
  after(() => syncOrder(id));
}

export async function deleteOrder(id) {
  await requireAdmin();
  const [s] = await Promise.all([getSettings(), sql`DELETE FROM orders WHERE id = ${id}`]);
  refreshAdmin();
  after(() => markDeleted(id, orderCode(id, s.brand)));
}

/* ---------- Incomplete orders ---------- */

export async function deleteIncomplete(phone) {
  await requireAdmin();
  await sql`DELETE FROM incomplete_orders WHERE phone = ${phone}`;
  refreshAdmin();
}

// Call kore confirm korle ek click e অসম্পূর্ণ → আসল অর্ডার
export async function convertIncomplete(phone) {
  await requireAdmin();
  const [draft] = await sql`SELECT * FROM incomplete_orders WHERE phone = ${phone}`;
  if (!draft) return;
  const [products, settings] = await Promise.all([getProducts(), getSettings()]);
  const product = products.find((p) => p.name === draft.product) || products[0];
  const area = deliveryOptions(settings)[0];
  const [row] = await sql`
    INSERT INTO orders (name, phone, address, product, area, qty, total, status, note)
    VALUES (${draft.name || "—"}, ${draft.phone}, ${draft.address || "—"}, ${product?.name || draft.product},
            ${area.id}, 1, ${(product?.price || 0) + deliveryCharge(settings, area, product, 1)}, 'confirmed', 'অসম্পূর্ণ থেকে কনভার্ট')
    RETURNING id`;
  await sql`DELETE FROM incomplete_orders WHERE phone = ${phone}`;
  // Call kore confirm kora order — auto courier chalu thakle eta o chole jay
  const auto = await autoSendOnConfirm(row.id);
  refreshAdmin();
  after(() => notifyNewOrder(row.id));
  after(() => afterStatusChange(row.id, "confirmed"));
  return auto;
}

/* ---------- Products ---------- */

export async function saveProduct(_prev, formData) {
  await requireAdmin();
  await ensureTables();
  const id = Number(formData.get("id")) || null;
  const name = String(formData.get("name") || "").trim().slice(0, 200);
  const price = Math.round(Number(formData.get("price")));
  const oldPrice = Math.round(Number(formData.get("old_price")) || 0);
  const stock = Math.round(Number(formData.get("stock")) || 0);
  const sort = Math.round(Number(formData.get("sort")) || 0);
  const boxes = Math.max(1, Math.round(Number(formData.get("boxes")) || 1));
  const image = String(formData.get("image") || "").trim();
  const active = formData.get("active") === "on";

  if (!name || !(price > 0)) return { error: "নাম আর সঠিক দাম দিন" };

  if (id) {
    const [old] = await sql`SELECT image FROM products WHERE id = ${id}`;
    if (old && old.image !== image) await deleteImages([old.image]);
    await sql`
      UPDATE products SET name = ${name}, price = ${price}, old_price = ${oldPrice}, stock = ${stock},
        image = ${image}, sort = ${sort}, active = ${active}, boxes = ${boxes}
      WHERE id = ${id}`;
  } else {
    await sql`
      INSERT INTO products (name, price, old_price, stock, image, sort, active, boxes)
      VALUES (${name}, ${price}, ${oldPrice}, ${stock}, ${image}, ${sort}, ${active}, ${boxes})`;
  }
  refreshAll();
  redirect("/admin/products");
}

export async function deleteProduct(id) {
  await requireAdmin();
  const [old] = await sql`DELETE FROM products WHERE id = ${id} RETURNING image`;
  if (old) await deleteImages([old.image]);
  refreshAll();
}

/* ---------- Settings / Banner / Tracking ---------- */

export async function saveSettingsAction(_prev, formData) {
  await requireAdmin();
  const values = Object.fromEntries([...formData.entries()].filter(([k]) => !k.startsWith("$")));
  // Banner theke je chobi soriye deya hoyeche, sheta storage theke o muche
  if ("gallery" in values) {
    const lines = (v) => String(v).split("\n").map((x) => x.trim()).filter(Boolean);
    const keep = new Set(lines(values.gallery));
    const before = lines((await getSettings()).gallery);
    await deleteImages(before.filter((u) => !keep.has(u)));
  }
  // Logo/voice bodlale ba muchle purono file storage theke muche
  for (const key of ["logo", "voice"]) {
    if (!(key in values)) continue;
    const old = (await getSettings())[key];
    if (old !== values[key]) await deleteImages([old]);
  }
  if ("gtm_id" in values) values.gtm_id = String(values.gtm_id).trim().toUpperCase();
  // Pixel: bhul ID thakle save na kore janai, na hole proti line e ekta kore rakhi
  if ("fb_pixel" in values) {
    const parts = String(values.fb_pixel).split(/[\s,]+/).filter(Boolean);
    const bad = parts.filter((x) => !/^\d{5,20}$/.test(x));
    if (bad.length) return { error: `এগুলো সঠিক Pixel ID না: ${bad.join(", ")} — শুধু সংখ্যা দিন` };
    values.fb_pixel = pixelIds(values.fb_pixel).join("\n");
  }
  // Conversions API token: "capi_<pixelId>" field gulo JSON e — khali rakhle purono token thake
  const capiFields = Object.keys(values).filter((k) => k.startsWith("capi_"));
  if (capiFields.length) {
    const tokens = capiTokens(await getSettings());
    for (const k of capiFields) {
      const token = String(values[k]).trim();
      if (token) tokens[k.slice(5)] = token;
      delete values[k];
    }
    for (const k of Object.keys(values).filter((x) => x.startsWith("capidel_"))) {
      delete tokens[k.slice(8)];
      delete values[k];
    }
    values.fb_capi = JSON.stringify(tokens);
  }
  // WhatsApp token khali rakhle purono ta i thake
  if ("wa_token" in values && !String(values.wa_token).trim()) delete values.wa_token;
  if ("bdc_api_key" in values) {
    values.bdc_api_key = String(values.bdc_api_key).trim();
    if (!values.bdc_api_key) delete values.bdc_api_key;
  }
  if ("fb_test_code" in values) values.fb_test_code = String(values.fb_test_code).trim().toUpperCase();
  await saveSettings(values);
  refreshAll();
  return { ok: true, at: Date.now() };
}

/* ---------- Fake order protection ---------- */

export async function blockValue(kind, value, reason = "") {
  await requireAdmin();
  if (!["phone", "ip"].includes(kind) || !String(value).trim()) return;
  await sql`
    INSERT INTO blocked (kind, value, reason) VALUES (${kind}, ${String(value).trim()}, ${String(reason).slice(0, 200)})
    ON CONFLICT (kind, value) DO UPDATE SET reason = EXCLUDED.reason`;
  refreshAdmin();
}

// Order card er "কুরিয়ার হিস্টরি" button — BD Courier theke notun kore ane
// Admin khola thakle courier status ana (CourierAutoSync); kichu bodlale page refresh hoy
export async function courierAutoSyncAction() {
  await requireAdmin();
  try {
    const n = await maybeAutoSync();
    if (n) refreshAdmin();
    return n;
  } catch (err) {
    console.error("Auto courier sync failed", err);
    return 0;
  }
}

export async function checkPhoneAction(phone) {
  await requireAdmin();
  try {
    const h = await checkPhone(String(phone), { force: true });
    if (!h) return { error: "BD Courier API key দিন (ফেক অর্ডার পেজে)" };
    refreshAdmin();
    return { ok: true };
  } catch (err) {
    return { error: err.message };
  }
}

export async function unblock(kind, value) {
  await requireAdmin();
  await sql`DELETE FROM blocked WHERE kind = ${kind} AND value = ${value}`;
  refreshAdmin();
}

// Order theke ek click e: phone + IP block, order বাতিল
export async function blockOrder(id) {
  await requireAdmin();
  const [o] = await sql`SELECT phone, ip FROM orders WHERE id = ${id}`;
  if (!o) return;
  const reason = `ফেক অর্ডার #${id}`;
  await sql`INSERT INTO blocked (kind, value, reason) VALUES ('phone', ${o.phone}, ${reason}) ON CONFLICT DO NOTHING`;
  if (o.ip) await sql`INSERT INTO blocked (kind, value, reason) VALUES ('ip', ${o.ip}, ${reason}) ON CONFLICT DO NOTHING`;
  await sql`UPDATE orders SET status = 'cancelled' WHERE id = ${id}`;
  refreshAdmin();
  after(() => syncOrder(id, { change: "🚫 <b>ফেক — ব্লক ও বাতিল</b>" }));
}

export async function addBlockAction(_prev, formData) {
  await requireAdmin();
  const value = String(formData.get("value") || "").trim();
  const kind = /^01[3-9]\d{8}$/.test(value) ? "phone" : /^[\d.:a-fA-F]{3,64}$/.test(value) ? "ip" : null;
  if (!kind) return { error: "সঠিক মোবাইল নাম্বার (01XXXXXXXXX) বা IP দিন" };
  await blockValue(kind, value, formData.get("reason") || "");
  return { ok: true, at: Date.now() };
}

/* ---------- Telegram ---------- */

const TG_COMMANDS = [
  { command: "orders", description: "সর্বশেষ ১০টি অর্ডার (বাটনসহ)" },
  { command: "pending", description: "পেন্ডিং অর্ডার — কনফার্ম করতে" },
  { command: "confirmed", description: "কনফার্মড অর্ডার — শিপ করতে" },
  { command: "shipped", description: "শিপড অর্ডার — ডেলিভারি আপডেট" },
  { command: "order", description: "নির্দিষ্ট অর্ডার: /order VE000012 বা মোবাইল" },
  { command: "today", description: "আজকের হিসাব" },
  { command: "stats", description: "সব মিলিয়ে হিসাব" },
  { command: "stop", description: "নোটিফিকেশন বন্ধ" },
];

// Telegram ke bole dey kothay update pathabe (amader /api/telegram e, gopon secret shoho)
export async function setupTelegramWebhook(_prev, formData) {
  await requireAdmin();
  const base = String(formData.get("base") || "").replace(/\/+$/, "");
  if (!/^https:\/\//.test(base)) return { error: "লাইভ সাইটের https লিংক লাগবে" };
  const res = await tg("setWebhook", {
    url: `${base}/api/telegram`,
    secret_token: process.env.TELEGRAM_SECRET,
    allowed_updates: ["message", "callback_query"],
  });
  await tg("setMyCommands", {
    commands: TG_COMMANDS,
  });
  if (!res?.ok) return { error: res?.description || "Telegram এ কানেক্ট হয়নি" };
  refreshAdmin();
  return { ok: true, at: Date.now() };
}

export async function sendTestMessage() {
  await requireAdmin();
  await sendToAll("✅ <b>টেস্ট মেসেজ</b> — Telegram নোটিফিকেশন ঠিকমতো কাজ করছে!");
}

export async function disconnectChat(chatId) {
  await requireAdmin();
  await tg("sendMessage", { chat_id: chatId, text: "🔕 অ্যাডমিন প্যানেল থেকে এই চ্যাট ডিসকানেক্ট করা হয়েছে।" });
  await removeChat(chatId);
  refreshAdmin();
}

/* ---------- Courier (Steadfast / Pathao) ---------- */

const sentText = (courier, tracking) =>
  `${COURIERS[courier].icon} <b>${COURIERS[courier].name} এ পাঠানো হয়েছে</b> — ট্র্যাকিং ${tracking}`;

export async function sendToCourier(id, courier) {
  await requireAdmin();
  try {
    const { tracking } = await sendOrderToCourier(id, courier);
    refreshAdmin();
    after(() => syncOrder(id, { change: sentText(courier, tracking) }));
    return { ok: true, tracking };
  } catch (err) {
    return { error: err.message };
  }
}

// Shob কনফার্মড (ekhono na pathano) order ekshathe beche neya courier e
export async function sendConfirmedToCourier(courier) {
  await requireAdmin();
  const rows = await sql`
    SELECT id FROM orders WHERE status = 'confirmed' AND courier_id = '' ORDER BY created_at LIMIT 50`;
  let sent = 0;
  const errors = [];
  for (const r of rows) {
    try {
      const { tracking } = await sendOrderToCourier(r.id, courier);
      sent++;
      after(() => syncOrder(r.id, { change: sentText(courier, tracking) }));
    } catch (err) {
      errors.push(`#${r.id}: ${err.message}`);
    }
  }
  refreshAdmin();
  return { sent, total: rows.length, errors };
}

export async function syncCouriersAction() {
  await requireAdmin();
  const res = await syncAllCouriers();
  refreshAdmin();
  for (const c of res.changed) {
    after(() => syncOrder(c.id, { change: statusChangeText(c.status) + " (কুরিয়ার)" }));
    after(() => afterStatusChange(c.id, c.status));
  }
  return res;
}

export async function saveDefaultCourier(_prev, formData) {
  await requireAdmin();
  const c = formData.get("default_courier");
  if (COURIERS[c]) await saveSettings({ default_courier: c });
  const auto = formData.get("auto_courier");
  if (auto === "on" || auto === "off") await saveSettings({ auto_courier: auto });
  refreshAdmin();
  return { ok: true, at: Date.now() };
}

export async function savePathaoAction(_prev, formData) {
  await requireAdmin();
  const get = (k) => String(formData.get(k) || "").trim();
  const values = { pathao_client_id: get("pathao_client_id"), pathao_username: get("pathao_username") };
  // Secret/password khali rakhle purono ta i thake
  if (get("pathao_client_secret")) values.pathao_client_secret = get("pathao_client_secret");
  if (get("pathao_password")) values.pathao_password = get("pathao_password");
  if (get("pathao_store_id")) values.pathao_store_id = get("pathao_store_id");
  // Notun tottho: ager "ভুল" chihno ar purono token muche abar login kori
  Object.assign(values, { pathao_key_status: "", pathao_token: "", pathao_token_exp: "" });
  await saveSettings(values);
  refreshAdmin();
  try {
    const s = await getSettings();
    const stores = await getPathaoStores(s);
    if (!stores.length) return { error: "লগইন হয়েছে, কিন্তু Pathao তে কোনো স্টোর নেই — Pathao প্যানেলে আগে একটা স্টোর বানান" };
    // Store beche na dile (ba ager ta na thakle) prothom ta nei
    const store = stores.find((x) => x.id === s.pathao_store_id) || stores[0];
    await saveSettings({ pathao_store_id: store.id, pathao_store_name: store.name, pathao_key_status: "ok" });
    refreshAdmin();
    return { ok: true, at: Date.now() };
  } catch (err) {
    return { error: `সেভ হয়েছে, কিন্তু Pathao কানেক্ট হয়নি: ${err.message}` };
  }
}

export async function saveCourierAction(_prev, formData) {
  await requireAdmin();
  const values = { steadfast_api_key: String(formData.get("steadfast_api_key") || "").trim() };
  // Secret khali rakhle purono ta i thake
  const secret = String(formData.get("steadfast_secret_key") || "").trim();
  if (secret) values.steadfast_secret_key = secret;
  // Notun key: ager "ভুল" chihno muche abar ekbar check kori
  values.steadfast_key_status = "";
  await saveSettings(values);
  refreshAdmin();
  try {
    const balance = await getBalance(await getSettings());
    await saveSettings({ steadfast_key_status: "ok", steadfast_last_error: "" });
    return { ok: true, at: Date.now(), balance };
  } catch (err) {
    return { error: `সেভ হয়েছে, কিন্তু Steadfast কানেক্ট হয়নি: ${err.message}` };
  }
}

export async function saveCarrybeeAction(_prev, formData) {
  await requireAdmin();
  const get = (k) => String(formData.get(k) || "").trim();
  const values = { carrybee_client_id: get("carrybee_client_id"), carrybee_client_context: get("carrybee_client_context") };
  // Secret khali rakhle purono ta i thake
  if (get("carrybee_client_secret")) values.carrybee_client_secret = get("carrybee_client_secret");
  if (get("carrybee_store_id")) values.carrybee_store_id = get("carrybee_store_id");
  // Notun tottho: ager "ভুল" chihno muche abar check kori
  values.carrybee_key_status = "";
  await saveSettings(values);
  refreshAdmin();
  try {
    const s = await getSettings();
    const stores = await getCarrybeeStores(s);
    if (!stores.length) return { error: "কানেক্ট হয়েছে, কিন্তু CarryBee তে কোনো স্টোর নেই — CarryBee প্যানেলে আগে একটা স্টোর বানান" };
    // Store beche na dile (ba ager ta na thakle) prothom ta nei
    const store = stores.find((x) => x.id === s.carrybee_store_id) || stores[0];
    await saveSettings({ carrybee_store_id: store.id, carrybee_store_name: store.name, carrybee_key_status: "ok" });
    refreshAdmin();
    return { ok: true, at: Date.now() };
  } catch (err) {
    // Bhul key te CarryBee faka 500 dey — tai ekhane fail mane tottho bhul dhori
    await saveSettings({ carrybee_key_status: "invalid" });
    refreshAdmin();
    return { error: `CarryBee কানেক্ট হয়নি — Client ID, Client Secret আর Client Context ঠিক আছে কিনা দেখুন (${err.message})` };
  }
}

/* ---------- Manual order (phone e asha order) ---------- */

export async function createManualOrder(_prev, formData) {
  await requireAdmin();
  await ensureTables();
  const get = (k) => String(formData.get(k) || "").trim();
  const name = get("name").slice(0, 100);
  const phone = get("phone").replace(/\D/g, "").replace(/^880/, "0");
  const address = get("address").slice(0, 500);
  const status = get("status") === "confirmed" ? "confirmed" : "pending";
  const qty = Math.min(50, Math.max(1, Number(get("qty")) || 1));
  // Error hole form e likha tottho ferot dei, jate abar likhte na hoy
  const values = { name, phone: get("phone"), address, note: get("note") };

  if (!name || !address) return { error: "নাম আর ঠিকানা দিন", values };
  if (!/^01[3-9]\d{8}$/.test(phone)) return { error: "সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন", values };

  const [products, settings] = await Promise.all([getProducts({ all: true }), getSettings()]);
  const product = products.find((p) => p.id === Number(get("product_id")));
  const area = deliveryOptions(settings).find((d) => d.id === get("area"));
  if (!product || !area) return { error: "পণ্য আর ডেলিভারি এরিয়া বেছে নিন", values };

  // Dam nije hishab hoy; admin chaile mot taka bodlate pare (discount/extra charge)
  const autoTotal = product.price * qty + deliveryCharge(settings, area, product, qty);
  const custom = get("custom_total");
  const total = custom !== "" && Number(custom) >= 0 ? Math.round(Number(custom)) : autoTotal;
  const note = ["📞 ম্যানুয়াল অর্ডার (কল)", get("note")].filter(Boolean).join(" — ").slice(0, 500);

  const [row] = await sql`
    INSERT INTO orders (name, phone, address, product, area, qty, total, status, note)
    VALUES (${name}, ${phone}, ${address}, ${product.name}, ${area.id}, ${qty}, ${total}, ${status}, ${note})
    RETURNING id`;
  await sql`UPDATE products SET stock = GREATEST(stock - ${qty}, 0) WHERE id = ${product.id}`;
  await sql`DELETE FROM incomplete_orders WHERE phone = ${phone}`;

  // কনফার্মড hishebe dile auto courier chalu thakle shathe shathe courier e jay
  const auto = status === "confirmed" ? await autoSendOnConfirm(row.id) : null;
  refreshAdmin();
  after(() => notifyNewOrder(row.id));
  after(() => afterStatusChange(row.id, status));
  return { ok: true, at: Date.now(), code: orderCode(row.id, settings.brand), total, auto };
}

/* ---------- Landing page er lekha ---------- */

// Form er "t.<key>" = ekta lekha, "l.<list>.<i>.<field>" = list er item. Je section save hoy shudhu oita bodlay.
export async function saveContentAction(_prev, formData) {
  await requireAdmin();
  const s = await getSettings();
  let saved = {};
  try { saved = JSON.parse(s.content || "{}") || {}; } catch {}
  const text = { ...(saved.text || {}) };
  const lists = { ...(saved.lists || {}) };
  const posted = {};

  for (const [k, v] of formData.entries()) {
    const val = String(v).slice(0, 2000);
    if (k.startsWith("t.")) {
      text[k.slice(2)] = val;
    } else if (k.startsWith("l.")) {
      const [, list, i, field] = k.split(".");
      ((posted[list] ??= [])[Number(i)] ??= {})[field] = val.trim();
    }
  }
  // Puro faka item (sob ghor khali) bad — mane oi item muche gelo
  const images = (arr) => (Array.isArray(arr) ? arr.map((it) => it?.image).filter(Boolean) : []);
  const oldImages = Object.keys(posted).flatMap((list) => images(lists[list]));
  for (const [list, items] of Object.entries(posted)) {
    lists[list] = items.filter((it) => it && Object.entries(it).some(([f, v]) => f !== "image" && v));
  }
  // Notun chobi dile ba muchle purono ta storage theke o muche
  const keep = new Set(Object.keys(posted).flatMap((list) => images(lists[list])));
  await deleteImages(oldImages.filter((u) => !keep.has(u)));
  await saveSettings({ content: JSON.stringify({ text, lists }) });
  refreshAll();
  return { ok: true, at: Date.now() };
}

export async function resetContentAction() {
  await requireAdmin();
  await saveSettings({ content: "" });
  refreshAll();
}
