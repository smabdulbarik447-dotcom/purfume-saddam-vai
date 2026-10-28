import { timingSafeEqual } from "crypto";
import { after } from "next/server";
import { afterStatusChange } from "@/lib/orderHooks";
import { revalidatePath } from "next/cache";
import { sql, ensureTables, STATUSES } from "@/lib/db";
import { getSettings } from "@/lib/store";
import {
  tg, linkCode, getChats, addChat, removeChat, syncOrder, summaryText, sendOrderCard, trackMessage,
} from "@/lib/telegram";
import { COURIERS, sendOrderToCourier, autoSendOnConfirm, autoSendText } from "@/lib/courier";

const HELP = [
  "🤖 <b>কমান্ড সমূহ</b>",
  "/orders — সর্বশেষ ১০টি অর্ডার (বাটনসহ)",
  "/pending — পেন্ডিং অর্ডারগুলো (বাটনসহ)",
  "/confirmed — কনফার্মড অর্ডার, শিপ করার জন্য",
  "/shipped — শিপড অর্ডার, ডেলিভারি আপডেটের জন্য",
  "/order VE000012 — নির্দিষ্ট অর্ডার (কোড, আইডি বা মোবাইল নাম্বার)",
  "/today — আজকের হিসাব   /stats — সব মিলিয়ে",
  "/stop — এই চ্যাটে নোটিফিকেশন বন্ধ",
  "",
  "প্রতিটি অর্ডারের নিচের বাটন চেপে স্ট্যাটাস বদলান — অ্যাডমিন প্যানেলেও সাথে সাথে বদলে যাবে।",
].join("\n");

// "/pending" er moto status command → oi status er order gulo
const LIST_COMMANDS = { "/pending": "pending", "/confirmed": "confirmed", "/shipped": "shipped" };
const MAX_CARDS = 10;

function validSecret(req) {
  const got = Buffer.from(req.headers.get("x-telegram-bot-api-secret-token") || "");
  const want = Buffer.from(process.env.TELEGRAM_SECRET || "");
  return want.length > 0 && got.length === want.length && timingSafeEqual(got, want);
}

const reply = (chat_id, text, extra = {}) => tg("sendMessage", { chat_id, text, parse_mode: "HTML", ...extra });

export async function POST(req) {
  // Shudhu Telegram (amader secret shoho) e request nibe
  if (!validSecret(req)) return new Response("forbidden", { status: 403 });
  const update = await req.json().catch(() => null);
  if (!update) return Response.json({ ok: true });

  try {
    await ensureTables();
    const settings = await getSettings();
    const chats = getChats(settings);

    /* ---------- Button chaapa ---------- */
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = String(cb.message?.chat?.id);
      if (!chats.includes(chatId)) {
        await tg("answerCallbackQuery", { callback_query_id: cb.id, text: "অনুমতি নেই", show_alert: true });
        return Response.json({ ok: true });
      }
      const [action, id, status] = String(cb.data).split(":");
      const orderId = Number(id);
      const [o] = await sql`SELECT id, phone, ip FROM orders WHERE id = ${orderId}`;
      if (!o) {
        await tg("answerCallbackQuery", { callback_query_id: cb.id, text: "অর্ডারটি পাওয়া যায়নি (মুছে ফেলা হয়েছে)" });
        return Response.json({ ok: true });
      }

      let toast = "";
      if (action === "st" && STATUSES.some((s) => s.id === status)) {
        await sql`UPDATE orders SET status = ${status} WHERE id = ${orderId}`;
        // কনফার্ম e Facebook Purchase, রিটার্ন e OrderReturned
        after(() => afterStatusChange(orderId, status));
        toast = `স্ট্যাটাস: ${STATUSES.find((s) => s.id === status).label}`;
        // কনফার্ম korle nije theke courier e entry
        if (status === "confirmed") {
          const auto = await autoSendOnConfirm(orderId);
          if (auto?.error) {
            await tg("answerCallbackQuery", { callback_query_id: cb.id, text: `✅ কনফার্ম হয়েছে\n${autoSendText(auto)}`, show_alert: true });
            await trackMessage(orderId, chatId, cb.message.message_id);
            await syncOrder(orderId, { fromTelegram: true });
            revalidatePath("/admin", "layout");
            return Response.json({ ok: true });
          }
          if (auto) toast = `✅ কনফার্ম + ${autoSendText(auto)}`;
        }
      } else if (action === "bl") {
        const reason = `ফেক অর্ডার #${orderId} (Telegram)`;
        await sql`INSERT INTO blocked (kind, value, reason) VALUES ('phone', ${o.phone}, ${reason}) ON CONFLICT DO NOTHING`;
        if (o.ip) await sql`INSERT INTO blocked (kind, value, reason) VALUES ('ip', ${o.ip}, ${reason}) ON CONFLICT DO NOTHING`;
        await sql`UPDATE orders SET status = 'cancelled' WHERE id = ${orderId}`;
        toast = "🚫 নাম্বার ও IP ব্লক, অর্ডার বাতিল";
      } else if (action === "cr" || action === "sf") {
        // "sf:ID" purono Steadfast button, "cr:ID:courier" notun
        const courier = action === "sf" ? "steadfast" : status;
        try {
          const { tracking } = await sendOrderToCourier(orderId, courier);
          toast = `${COURIERS[courier].icon} ${COURIERS[courier].name} এ পাঠানো হয়েছে — ট্র্যাকিং ${tracking}`;
        } catch (err) {
          console.error("Courier send failed", courier, orderId, err.message);
          await tg("answerCallbackQuery", { callback_query_id: cb.id, text: `❌ ${err.message}`, show_alert: true });
          return Response.json({ ok: true, error: err.message });
        }
      } else if (action === "ub") {
        await sql`DELETE FROM blocked WHERE (kind = 'phone' AND value = ${o.phone}) OR (kind = 'ip' AND value = ${o.ip || "-"})`;
        toast = "✅ আনব্লক করা হয়েছে";
      }

      await tg("answerCallbackQuery", { callback_query_id: cb.id, text: toast || "ঠিক আছে" });
      // Je card e button chaapa hoyeche sheta i ei chat er card hishebe dhori, jate seta update hoy
      await trackMessage(orderId, chatId, cb.message.message_id);
      await syncOrder(orderId, { fromTelegram: true });
      revalidatePath("/admin", "layout");
      return Response.json({ ok: true });
    }

    /* ---------- Command / message ---------- */
    const msg = update.message;
    if (!msg?.text) return Response.json({ ok: true });
    const chatId = String(msg.chat.id);
    const [cmd, arg] = msg.text.trim().split(/\s+/);
    const command = cmd.split("@")[0].toLowerCase();

    // Link kaj na korle shudhu code ta likhe pathalei connect hoy
    if (command === linkCode().toLowerCase() && !chats.includes(chatId)) {
      await addChat(chatId);
      await reply(chatId, `✅ <b>${settings.brand}</b> এর অর্ডার নোটিফিকেশন চালু হয়েছে!\n\n${HELP}`);
      return Response.json({ ok: true });
    }

    if (command === "/start") {
      if (arg && arg === linkCode()) {
        await addChat(chatId);
        await reply(chatId, `✅ <b>${settings.brand}</b> এর অর্ডার নোটিফিকেশন চালু হয়েছে!\n\n${HELP}`);
      } else if (chats.includes(chatId)) {
        await reply(chatId, HELP);
      } else {
        await reply(chatId, "🔒 অনুমতি নেই। অ্যাডমিন প্যানেল → Telegram পেজে যে কানেক্ট কোড আছে, সেটা এখানে লিখে পাঠান।");
      }
      return Response.json({ ok: true });
    }

    if (!chats.includes(chatId)) {
      await reply(chatId, "🔒 অনুমতি নেই। অ্যাডমিন প্যানেল → Telegram পেজে যে কানেক্ট কোড আছে, সেটা এখানে লিখে পাঠান।");
      return Response.json({ ok: true });
    }

    if (command === "/stop") {
      await removeChat(chatId);
      await reply(chatId, "🔕 এই চ্যাটে নোটিফিকেশন বন্ধ করা হয়েছে। আবার চালু করতে অ্যাডমিন প্যানেলের লিংক ব্যবহার করুন।");
    } else if (command === "/today") {
      await reply(chatId, await summaryText("today"));
    } else if (command === "/stats") {
      await reply(chatId, await summaryText("all"));
    } else if (command in LIST_COMMANDS || command === "/orders") {
      const status = LIST_COMMANDS[command];
      const label = status ? STATUSES.find((s) => s.id === status).label : "সর্বশেষ";
      const [{ n }] = status
        ? await sql`SELECT count(*)::int AS n FROM orders WHERE status = ${status}`
        : await sql`SELECT count(*)::int AS n FROM orders`;
      const rows = status
        ? await sql`SELECT id FROM orders WHERE status = ${status} ORDER BY created_at DESC LIMIT ${MAX_CARDS}`
        : await sql`SELECT id FROM orders ORDER BY created_at DESC LIMIT ${MAX_CARDS}`;
      if (!rows.length) {
        await reply(chatId, `✅ কোনো ${label} অর্ডার নেই`);
      } else {
        await reply(chatId, `📋 <b>${label} অর্ডার: মোট ${n}টি</b>${n > MAX_CARDS ? ` (সর্বশেষ ${MAX_CARDS}টি দেখানো হলো)` : ""}`);
        // Purono theke notun — sobcheye notun ta niche thake
        for (const r of rows.reverse()) await sendOrderCard(r.id, chatId, settings);
      }
    } else if (command === "/order") {
      const q = String(arg || "").trim();
      if (!q) {
        await reply(chatId, "লিখুন: <code>/order VE000012</code> বা <code>/order 12</code> বা <code>/order 017XXXXXXXX</code>");
      } else {
        const id = /^\d{1,9}$/.test(q) ? Number(q) : /^[a-z]{1,2}\d+$/i.test(q) ? Number(q.replace(/\D/g, "")) : 0;
        const rows = /^01\d{9}$/.test(q)
          ? await sql`SELECT id FROM orders WHERE phone = ${q} ORDER BY created_at DESC LIMIT 5`
          : await sql`SELECT id FROM orders WHERE id = ${id}`;
        if (!rows.length) await reply(chatId, `❌ "${q}" নামে কোনো অর্ডার পাওয়া যায়নি`);
        for (const r of rows.reverse()) await sendOrderCard(r.id, chatId, settings);
      }
    } else {
      await reply(chatId, HELP);
    }
  } catch (err) {
    console.error("Telegram webhook failed", err);
  }
  return Response.json({ ok: true });
}
