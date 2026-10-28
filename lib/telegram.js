import { createHmac } from "crypto";
import { sql, STATUSES, orderCode } from "./db";
import { getSettings, saveSettings } from "./store";
import { COURIERS, readyCouriers, trackingLink, courierName, courierIcon } from "./courier";
import { checkPhoneSafe, cachedHistory, historyText } from "./bdcourier";
import { waConfirmKey } from "./whatsapp";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const BOT_USERNAME = "Perfumeallorder_bot";
export const tgEnabled = () => Boolean(TOKEN);

export async function tg(method, payload = {}) {
  if (!TOKEN) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.ok) console.error("Telegram", method, data.description);
    return data;
  } catch (err) {
    console.error("Telegram", method, err);
    return null;
  }
}

// Bot connect korar gopon code — t.me/bot?start=CODE link e thake
export const linkCode = () =>
  createHmac("sha256", process.env.TELEGRAM_SECRET || "").update("link").digest("hex").slice(0, 20);

export const getChats = (settings) => settings.tg_chats.split(",").map((x) => x.trim()).filter(Boolean);

export async function addChat(chatId) {
  const s = await getSettings();
  const chats = new Set(getChats(s));
  chats.add(String(chatId));
  await saveSettings({ tg_chats: [...chats].join(",") });
}

export async function removeChat(chatId) {
  const s = await getSettings();
  await saveSettings({ tg_chats: getChats(s).filter((c) => c !== String(chatId)).join(",") });
}

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const money = (n) => `৳${Number(n).toLocaleString("en-IN")}`;
const STATUS_ICON = { pending: "🟡", confirmed: "🔵", shipped: "🟣", delivered: "🟢", returned: "🟠", cancelled: "🔴" };
const label = (s) => STATUSES.find((x) => x.id === s)?.label || s;
const AREA = { inside: "ঢাকার ভেতরে", outside: "ঢাকার বাইরে" };

// Telegram button e tel: deya jay na — amader /call page phone er dialer khole
const SITE = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || "www.avenbd.shop"}`;
const contactRow = (phone) => [
  { text: "📞 কল করুন", url: `${SITE}/call/${phone}` },
  { text: "💬 WhatsApp", url: `https://wa.me/88${phone}` },
];
const fmtDate = (d) =>
  new Date(d).toLocaleString("en-GB", {
    timeZone: "Asia/Dhaka", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true,
  });

async function loadOrder(id) {
  const [o] = await sql`SELECT * FROM orders WHERE id = ${id}`;
  if (!o) return null;
  const [h] = await sql`
    SELECT count(*)::int AS total,
           count(*) FILTER (WHERE status IN ('cancelled','returned'))::int AS bad,
           count(*) FILTER (WHERE status = 'delivered')::int AS delivered
    FROM orders WHERE phone = ${o.phone}`;
  const [b] = await sql`
    SELECT 1 FROM blocked WHERE (kind = 'phone' AND value = ${o.phone}) OR (kind = 'ip' AND value = ${o.ip || "-"}) LIMIT 1`;
  const s = await getSettings();
  // Cache e na thakle (purono order) BD Courier theke ene ni
  const courierHist = (await cachedHistory([o.phone]))[o.phone] || (await checkPhoneSafe(o.phone));
  return { ...o, history: h, courierHist, blocked: Boolean(b), couriers: readyCouriers(s), waConfirm: `${SITE}/wa/${o.id}?k=${waConfirmKey(o.id)}` };
}

function orderText(o, brand) {
  const h = o.history;
  const risk =
    h.total <= 1
      ? "🆕 নতুন কাস্টমার"
      : `${h.bad > 0 && h.bad >= h.delivered ? "⚠️" : "🔁"} আগের অর্ডার: মোট ${h.total} • ডেলিভারড ${h.delivered} • বাতিল/রিটার্ন ${h.bad}`;
  return [
    `🛒 <b>অর্ডার ${orderCode(o.id, brand)}</b>`,
    `${STATUS_ICON[o.status] || "⚪"} স্ট্যাটাস: <b>${esc(label(o.status))}</b>${o.blocked ? "  🚫 ব্লকড" : ""}`,
    "",
    `👤 ${esc(o.name)}`,
    `📞 <code>${esc(o.phone)}</code>`,
    historyText(o.courierHist),
    `📍 ${esc(o.address)}`,
    "",
    `📦 ${esc(o.product)} × ${o.qty}`,
    `🚚 ${AREA[o.area] || esc(o.area)}`,
    `💰 মোট: <b>${money(o.total)}</b>`,
    "",
    risk,
    o.courier_id
      ? `${courierIcon(o)} ${courierName(o)}: <code>${esc(o.tracking_code)}</code>${o.courier_status ? ` (${esc(o.courier_status)})` : ""}`
      : null,
    o.note ? `📝 ${esc(o.note)}` : null,
    `🕒 ${fmtDate(o.created_at)}${o.ip ? ` • IP ${esc(o.ip)}` : ""}`,
  ]
    .filter((x) => x !== null)
    .join("\n");
}

function orderKeyboard(o) {
  const btn = (text, data) => ({ text, callback_data: data });
  const st = (s, text) => btn(o.status === s ? `• ${text} •` : text, `st:${o.id}:${s}`);
  return {
    inline_keyboard: [
      [st("confirmed", "✅ কনফার্ম"), st("shipped", "🚚 শিপড")],
      [st("delivered", "📦 ডেলিভারড"), st("returned", "↩️ রিটার্ন")],
      [st("cancelled", "❌ বাতিল"), o.blocked ? btn("✅ আনব্লক", `ub:${o.id}`) : btn("🚫 ফেক - ব্লক", `bl:${o.id}`)],
      o.courier_id
        ? [{ text: `${courierIcon(o)} ট্র্যাক: ${o.tracking_code}`, url: trackingLink(o) }]
        : ["cancelled", "delivered", "returned"].includes(o.status)
          ? []
          : (o.couriers || []).map((c) => btn(`${COURIERS[c].icon} ${COURIERS[c].name} এ পাঠান`, `cr:${o.id}:${c}`)),
      // কনফার্ম hole customer ke WhatsApp e confirm message — chaple lekha shoho WhatsApp khule
      ["confirmed", "shipped", "delivered"].includes(o.status)
        ? [{ text: o.wa_sent ? "✓ কনফার্ম মেসেজ গেছে (আবার পাঠান)" : "💬 কনফার্ম মেসেজ পাঠান", url: o.waConfirm }]
        : [],
      contactRow(o.phone),
    ].filter((row) => row.length),
  };
}

// Ekta order er card (status button shoho) ekta chat e pathay, ar mone rakhe pore edit korar jonno
export async function sendOrderCard(orderId, chat, settings) {
  const s = settings || (await getSettings());
  const o = await loadOrder(orderId);
  if (!o) return false;
  const res = await tg("sendMessage", {
    chat_id: chat, text: orderText(o, s.brand), parse_mode: "HTML", reply_markup: orderKeyboard(o),
  });
  const mid = res?.result?.message_id;
  if (mid) await trackMessage(o.id, chat, mid);
  return true;
}

export async function trackMessage(orderId, chat, messageId) {
  await sql`
    INSERT INTO tg_messages (order_id, chat_id, message_id) VALUES (${orderId}, ${String(chat)}, ${messageId})
    ON CONFLICT (order_id, chat_id) DO UPDATE SET message_id = EXCLUDED.message_id`;
}

// Notun order → shob connected chat e card
export async function notifyNewOrder(orderId) {
  // Card e courier hishab dekhanor jonno age number check (cache thakle API call hoy na)
  const [o] = await sql`SELECT phone FROM orders WHERE id = ${orderId}`;
  if (o) await checkPhoneSafe(o.phone);
  if (!TOKEN) return;
  const s = await getSettings();
  for (const chat of getChats(s)) await sendOrderCard(orderId, chat, s);
}

/**
 * Status/block bodlale: purono message gulo edit hoy notun status diye.
 * Admin panel theke bodlale (fromTelegram = false) ekta choto alert o jay.
 */
export async function syncOrder(orderId, { fromTelegram = false, change = "" } = {}) {
  if (!TOKEN) return;
  const s = await getSettings();
  const o = await loadOrder(orderId);
  if (!o) return;
  const msgs = await sql`SELECT chat_id, message_id FROM tg_messages WHERE order_id = ${o.id}`;
  for (const m of msgs) {
    await tg("editMessageText", {
      chat_id: m.chat_id, message_id: Number(m.message_id),
      text: orderText(o, s.brand), parse_mode: "HTML", reply_markup: orderKeyboard(o),
    });
  }
  if (!fromTelegram && change && s.tg_notify_status === "on") {
    for (const chat of getChats(s)) {
      const reply = msgs.find((m) => m.chat_id === chat);
      await tg("sendMessage", {
        chat_id: chat, parse_mode: "HTML",
        text: `🔄 <b>${orderCode(o.id, s.brand)}</b> ${esc(o.name)} → ${change}`,
        ...(reply ? { reply_parameters: { message_id: Number(reply.message_id), allow_sending_without_reply: true } } : {}),
      });
    }
  }
}

export const statusChangeText = (status) => `${STATUS_ICON[status] || ""} <b>${esc(label(status))}</b>`;

export async function notifyIncomplete(draft) {
  if (!TOKEN) return;
  const s = await getSettings();
  if (s.tg_notify_incomplete !== "on") return;
  const text = [
    "⏳ <b>অসম্পূর্ণ অর্ডার</b> (নাম্বার দিয়েছে, অর্ডার করেনি)",
    "",
    `👤 ${esc(draft.name || "—")}`,
    `📞 <code>${esc(draft.phone)}</code>`,
    draft.address ? `📍 ${esc(draft.address)}` : null,
    draft.product ? `📦 ${esc(draft.product)}` : null,
  ].filter(Boolean).join("\n");
  for (const chat of getChats(s)) {
    await tg("sendMessage", {
      chat_id: chat, text, parse_mode: "HTML",
      reply_markup: { inline_keyboard: [contactRow(draft.phone)] },
    });
  }
}

export async function sendToAll(text) {
  const s = await getSettings();
  for (const chat of getChats(s)) await tg("sendMessage", { chat_id: chat, text, parse_mode: "HTML" });
}

export async function summaryText(period) {
  const s = await getSettings();
  const rows =
    period === "today"
      ? await sql`SELECT status, total FROM orders
                  WHERE (created_at AT TIME ZONE 'Asia/Dhaka')::date = (now() AT TIME ZONE 'Asia/Dhaka')::date`
      : await sql`SELECT status, total FROM orders`;
  const count = (st) => rows.filter((r) => r.status === st).length;
  const sum = (list) => list.reduce((t, r) => t + r.total, 0);
  return [
    `📊 <b>${period === "today" ? "আজকের হিসাব" : "সব মিলিয়ে"}</b> — ${esc(s.brand)}`,
    "",
    `মোট অর্ডার: <b>${rows.length}</b>  (${money(sum(rows))})`,
    ...STATUSES.map((st) => `${STATUS_ICON[st.id]} ${st.label}: ${count(st.id)}`),
    "",
    `💰 ডেলিভারড বিক্রি: <b>${money(sum(rows.filter((r) => r.status === "delivered")))}</b>`,
  ].join("\n");
}

// Admin theke order mucha hole Telegram message o "মুছে ফেলা হয়েছে" kore dey
export async function markDeleted(orderId, code) {
  if (!TOKEN) return;
  const msgs = await sql`DELETE FROM tg_messages WHERE order_id = ${orderId} RETURNING chat_id, message_id`;
  for (const m of msgs) {
    await tg("editMessageText", {
      chat_id: m.chat_id, message_id: Number(m.message_id), parse_mode: "HTML",
      text: `🗑 <b>অর্ডার ${esc(code)}</b> অ্যাডমিন প্যানেল থেকে মুছে ফেলা হয়েছে`,
    });
  }
}
