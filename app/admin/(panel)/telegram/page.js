import { headers } from "next/headers";
import { getSettings } from "@/lib/store";
import { tg, tgEnabled, linkCode, getChats, BOT_USERNAME } from "@/lib/telegram";
import { saveSettingsAction, setupTelegramWebhook } from "../../actions";
import SaveForm from "../SaveForm";
import { TestButton, DisconnectButton } from "./TelegramButtons";

export default async function TelegramPage() {
  if (!tgEnabled()) {
    return (
      <>
        <h1 className="adm-title">Telegram নোটিফিকেশন</h1>
        <div className="adm-box"><p className="adm-err">TELEGRAM_BOT_TOKEN সেট করা নেই।</p></div>
      </>
    );
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const base = host?.startsWith("localhost") ? "https://purfume-eta.vercel.app" : `https://${host}`;

  const s = await getSettings();
  const chats = getChats(s);
  const [hook, ...chatInfo] = await Promise.all([
    tg("getWebhookInfo"),
    ...chats.map((id) => tg("getChat", { chat_id: id })),
  ]);
  const webhookOk = hook?.result?.url?.endsWith("/api/telegram");
  const code = linkCode();

  return (
    <>
      <h1 className="adm-title">Telegram নোটিফিকেশন</h1>
      <p className="adm-muted adm-intro">
        নতুন অর্ডার, অসম্পূর্ণ অর্ডার আর স্ট্যাটাস বদল — সব Telegram এ আসবে। মেসেজের বাটন চেপেই অর্ডার কনফার্ম/শিপড/বাতিল/ব্লক করা যাবে।
      </p>

      <div className="adm-grid even">
        <div className="adm-box">
          <h3>ধাপ ১ — বট চালু করুন {webhookOk ? <span className="pill st-delivered">✓ চালু</span> : <span className="pill st-cancelled">বন্ধ</span>}</h3>
          <p className="adm-muted">বট: <b>@{BOT_USERNAME}</b></p>
          {hook?.result?.last_error_message && (
            <p className="adm-err">শেষ সমস্যা: {hook.result.last_error_message}</p>
          )}
          <SaveForm action={setupTelegramWebhook} button={webhookOk ? "আবার কানেক্ট করুন" : "বট চালু করুন"}>
            <label>
              লাইভ সাইটের লিংক
              <input name="base" defaultValue={base} />
            </label>
          </SaveForm>

          <h3 className="mt">ধাপ ২ — আপনার Telegram কানেক্ট করুন</h3>
          <p className="adm-muted">নিচের বাটনে ক্লিক করে Telegram এ <b>Start</b> চাপুন। একাধিক মানুষ বা গ্রুপ কানেক্ট করা যায়।</p>
          <div className="tg-links">
            <a className="adm-btn" href={`https://t.me/${BOT_USERNAME}?start=${code}`} target="_blank" rel="noreferrer">
              ✈️ আমার Telegram কানেক্ট করুন
            </a>
            <a className="adm-btn ghost" href={`https://t.me/${BOT_USERNAME}?startgroup=${code}`} target="_blank" rel="noreferrer">
              👥 গ্রুপে যোগ করুন
            </a>
          </div>
          <div className="tg-code">
            <span>লিংকে কাজ না হলে — বটে <b>@{BOT_USERNAME}</b> এ এই কোডটা লিখে পাঠান:</span>
            <code>{code}</code>
          </div>
          <p className="adm-muted tg-warn">⚠️ এই লিংক বা কোড কাউকে দেবেন না — পেলে সে-ও অর্ডার দেখতে পারবে।</p>
        </div>

        <div className="adm-box">
          <h3>কানেক্ট করা চ্যাট ({chats.length})</h3>
          {chats.length === 0 ? (
            <p className="adm-muted">এখনো কেউ কানেক্ট হয়নি — ধাপ ২ করুন, তারপর পেজ রিফ্রেশ দিন।</p>
          ) : (
            <ul className="adm-list">
              {chats.map((id, i) => {
                const c = chatInfo[i]?.result;
                const name = c ? c.title || [c.first_name, c.last_name].filter(Boolean).join(" ") : id;
                return (
                  <li key={id}>
                    <span>
                      {c?.type === "private" ? "👤" : "👥"} <b>{name}</b>
                      {c?.username && <small className="adm-muted"> @{c.username}</small>}
                    </span>
                    <DisconnectButton chatId={id} name={name} />
                  </li>
                );
              })}
            </ul>
          )}
          {chats.length > 0 && <TestButton />}

          <h3 className="mt">কোন নোটিফিকেশন যাবে</h3>
          <SaveForm action={saveSettingsAction}>
            <label>
              🛒 নতুন অর্ডার
              <select disabled defaultValue="on"><option value="on">সবসময় চালু</option></select>
            </label>
            <label>
              ⏳ অসম্পূর্ণ অর্ডার (নাম্বার দিয়ে চলে গেছে)
              <select name="tg_notify_incomplete" defaultValue={s.tg_notify_incomplete}>
                <option value="on">চালু</option>
                <option value="off">বন্ধ</option>
              </select>
            </label>
            <label>
              🔄 অ্যাডমিন প্যানেল থেকে স্ট্যাটাস বদল
              <select name="tg_notify_status" defaultValue={s.tg_notify_status}>
                <option value="on">চালু — আলাদা মেসেজ আসবে</option>
                <option value="off">বন্ধ — শুধু আগের মেসেজ আপডেট হবে</option>
              </select>
            </label>
          </SaveForm>
        </div>
      </div>

      <div className="adm-box">
        <h3>Telegram এ কমান্ড</h3>
        <ul className="fraud-always">
          <li><b>/orders</b> — সর্বশেষ ১০টি অর্ডার, প্রতিটির নিচে স্ট্যাটাস বাটন</li>
          <li><b>/pending</b> — পেন্ডিং অর্ডার, বাটন চেপে কনফার্ম/বাতিল করুন</li>
          <li><b>/confirmed</b> — কনফার্মড অর্ডার, শিপ হলে “শিপড” চাপুন</li>
          <li><b>/shipped</b> — শিপড অর্ডার, পৌঁছালে “ডেলিভারড” বা “রিটার্ন”</li>
          <li><b>/order VE000012</b> — নির্দিষ্ট অর্ডার (কোড, আইডি বা মোবাইল নাম্বার দিয়ে)</li>
          <li><b>/today</b> — আজকের হিসাব, <b>/stats</b> — সব মিলিয়ে, <b>/stop</b> — নোটিফিকেশন বন্ধ</li>
        </ul>
      </div>
    </>
  );
}
