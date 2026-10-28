import { sql, ensureTables } from "./db";
import { getSettings } from "./store";

// BD Courier (bdcourier.com): ek number er shob courier (Pathao, Steadfast, Redx...) e ager parcel er hishab
const API = "https://api.bdcourier.com/courier-check";
// Ek number ekbar check korle 12 ghonta porjonto abar API call kori na (API limit bachay)
const FRESH_MS = 12 * 60 * 60 * 1000;

export const bdcKey = (s) => String(s.bdc_api_key || process.env.BDCOURIER_API_KEY || "").trim();

/** API er uttor theke shudhu dorkari hishab: mot, delivered, return, % */
function summarize(json) {
  const d = json?.data || {};
  const couriers = Object.entries(d)
    .filter(([k, c]) => k !== "summary" && c && Number(c.total_parcel) > 0)
    .map(([, c]) => ({
      name: c.name,
      total: Number(c.total_parcel) || 0,
      delivered: Number(c.success_parcel) || 0,
      returned: Number(c.cancelled_parcel) || 0,
    }));
  const delivered = Number(d.summary?.success_parcel) || 0;
  const returned = Number(d.summary?.cancelled_parcel) || 0;
  const done = delivered + returned;
  return {
    total: Number(d.summary?.total_parcel) || done,
    delivered,
    returned,
    // Received % = delivered / (delivered + return) — API er success_ratio kokhono 100 er beshi dey, tai nije hishab
    rate: done ? Math.round((delivered / done) * 100) : null,
    reports: Array.isArray(json?.reports) ? json.reports.length : 0,
    couriers,
  };
}

/** Cache theke (ba dorkar hole API theke) ek number er courier hishab. Key na thakle null. */
export async function checkPhone(phone, { force = false } = {}) {
  if (!/^01[3-9]\d{8}$/.test(phone || "")) return null;
  await ensureTables();
  if (!force) {
    const [c] = await sql`SELECT data, checked_at FROM phone_history WHERE phone = ${phone}`;
    if (c && Date.now() - new Date(c.checked_at).getTime() < FRESH_MS) return JSON.parse(c.data);
  }
  const key = bdcKey(await getSettings());
  if (!key) return null;

  const res = await fetch(API, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ phone }),
    signal: AbortSignal.timeout(10000),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.status !== "success") {
    throw new Error(json?.message || json?.error || `BD Courier সমস্যা (${res.status})`);
  }
  const data = { ...summarize(json), checked_at: new Date().toISOString() };
  await sql`
    INSERT INTO phone_history (phone, data, checked_at) VALUES (${phone}, ${JSON.stringify(data)}, now())
    ON CONFLICT (phone) DO UPDATE SET data = EXCLUDED.data, checked_at = now()`;
  return data;
}

/** Notun order e: error hole order atke na, shudhu log */
export async function checkPhoneSafe(phone) {
  try {
    return await checkPhone(phone);
  } catch (err) {
    console.error("BD Courier check failed", phone, err.message);
    return null;
  }
}

/** Onek number er cache kora hishab (API call chara) — { phone: data } */
export async function cachedHistory(phones) {
  const list = [...new Set(phones)].filter(Boolean);
  if (!list.length) return {};
  await ensureTables();
  const rows = await sql`SELECT phone, data FROM phone_history WHERE phone = ANY(${list})`;
  return Object.fromEntries(rows.map((r) => [r.phone, JSON.parse(r.data)]));
}

/** Telegram/admin e dekhanor ek line */
export function historyText(h) {
  if (!h) return null;
  if (!h.total) return "🆕 কুরিয়ার হিস্টরি: আগে কোনো পার্সেল নেই";
  const rate = h.rate ?? 0;
  const icon = rate >= 80 ? "🟢" : rate >= 50 ? "🟡" : "🔴";
  return `${icon} <b>রিসিভ ${rate}% • রিটার্ন ${100 - rate}%</b> (${h.delivered}/${h.total} পার্সেল)${h.reports ? `\n⚠️ ${h.reports}টি ফ্রড রিপোর্ট আছে` : ""}`;
}
