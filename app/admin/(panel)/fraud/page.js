import { sql, ensureTables } from "@/lib/db";
import { getSettings } from "@/lib/store";
import { bdcKey } from "@/lib/bdcourier";
import { saveSettingsAction, addBlockAction } from "../../actions";
import SaveForm from "../SaveForm";
import UnblockButton from "./UnblockButton";

const fmtDate = (d) =>
  new Date(d).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "2-digit", month: "short", year: "numeric" });

export default async function FraudPage() {
  await ensureTables();
  const [s, blocked, [stats]] = await Promise.all([
    getSettings(),
    sql`SELECT * FROM blocked ORDER BY created_at DESC`,
    sql`SELECT
          count(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
          count(*) FILTER (WHERE status = 'returned')::int AS returned,
          count(*)::int AS total
        FROM orders`,
  ]);

  return (
    <>
      <h1 className="adm-title">ফেক অর্ডার প্রোটেকশন</h1>

      <section className="adm-cards fraud-cards">
        <div className="adm-card"><span className="adm-icon red">🚫</span><small>ব্লক করা নাম্বার/IP</small><b>{blocked.length}</b></div>
        <div className="adm-card"><span className="adm-icon orange">↩️</span><small>বাতিল অর্ডার</small><b>{stats.cancelled}</b></div>
        <div className="adm-card"><span className="adm-icon yellow">📦</span><small>রিটার্ন অর্ডার</small><b>{stats.returned}</b></div>
      </section>

      <div className="adm-grid even">
        <div className="adm-box">
          <h3>⚙️ প্রোটেকশন সেটিংস</h3>
          <SaveForm action={saveSettingsAction}>
            <label>
              একই নাম্বার থেকে ২৪ ঘণ্টায় সর্বোচ্চ অর্ডার
              <input name="fraud_phone_limit" type="number" min="0" max="50" defaultValue={s.fraud_phone_limit} />
              <small className="adm-muted">ডুপ্লিকেট অর্ডার আটকায়। ০ দিলে বন্ধ।</small>
            </label>
            <label>
              একই IP (ডিভাইস/নেটওয়ার্ক) থেকে ২৪ ঘণ্টায় সর্বোচ্চ অর্ডার
              <input name="fraud_ip_limit" type="number" min="0" max="100" defaultValue={s.fraud_ip_limit} />
              <small className="adm-muted">একজন অনেক নাম্বার দিয়ে ফেক অর্ডার দিলে আটকায়। ০ দিলে বন্ধ।</small>
            </label>
            <label>
              BD Courier API Key {bdcKey(s) ? <span className="pill st-delivered">✓ চালু</span> : <span className="pill st-pending">বন্ধ</span>}
              <input
                name="bdc_api_key"
                type="password"
                autoComplete="new-password"
                placeholder={bdcKey(s) ? "•••••••• (সেভ করা আছে)" : "bdcourier.com থেকে পাওয়া API key"}
              />
              <small className="adm-muted">প্রতিটি অর্ডারে কাস্টমারের নাম্বারের সব কুরিয়ারের রিসিভ/রিটার্ন % দেখাবে (অর্ডার পেজ ও Telegram এ)।</small>
            </label>
            <label>
              নাম ও ঠিকানা যাচাই
              <select name="fraud_min_text" defaultValue={s.fraud_min_text}>
                <option value="on">চালু — নাম কমপক্ষে ৩, ঠিকানা ১০ অক্ষর</option>
                <option value="off">বন্ধ</option>
              </select>
            </label>
          </SaveForm>
          <ul className="fraud-always">
            <li>✅ সঠিক ১১ ডিজিটের বাংলাদেশি নাম্বার ছাড়া অর্ডার হয় না</li>
            <li>✅ বট/স্প্যাম ধরার লুকানো ফাঁদ (honeypot) চালু</li>
            <li>✅ দাম সার্ভারে হিসাব হয় — কেউ দাম বদলে অর্ডার দিতে পারবে না</li>
            <li>✅ অর্ডার লিস্টে প্রতিটি কাস্টমারের আগের অর্ডার ও বাতিলের হিসাব দেখায়</li>
          </ul>
        </div>

        <div className="adm-box">
          <h3>🚫 নাম্বার বা IP ব্লক করুন</h3>
          <SaveForm action={addBlockAction} button="ব্লক করুন">
            <div className="adm-row">
              <label>
                মোবাইল নাম্বার বা IP
                <input name="value" required placeholder="01XXXXXXXXX" />
              </label>
              <label>
                কারণ (ঐচ্ছিক)
                <input name="reason" placeholder="যেমন: পার্সেল রিসিভ করেনি" />
              </label>
            </div>
          </SaveForm>

          <h3 className="mt">ব্লক লিস্ট</h3>
          {blocked.length === 0 ? (
            <p className="adm-muted">কেউ ব্লক করা নেই</p>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead><tr><th>নাম্বার / IP</th><th>কারণ</th><th>তারিখ</th><th></th></tr></thead>
                <tbody>
                  {blocked.map((b) => (
                    <tr key={b.kind + b.value}>
                      <td><b>{b.value}</b><small>{b.kind === "phone" ? "মোবাইল" : "IP"}</small></td>
                      <td>{b.reason || "—"}</td>
                      <td><small>{fmtDate(b.created_at)}</small></td>
                      <td className="adm-actions"><UnblockButton kind={b.kind} value={b.value} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
