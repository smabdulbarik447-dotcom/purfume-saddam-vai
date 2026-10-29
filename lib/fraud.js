import { sql } from "./db";
import { checkPhoneSafe } from "./bdcourier";

// Vercel e asol customer er IP x-forwarded-for er prothom ta
export function clientIp(req) {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : req.headers.get("x-real-ip") || "").trim().slice(0, 64);
}

export async function isBlocked(phone, ip) {
  const rows = await sql`
    SELECT kind FROM blocked
    WHERE (kind = 'phone' AND value = ${phone}) OR (kind = 'ip' AND value = ${ip || "-"})
    LIMIT 1`;
  return rows.length > 0;
}

/**
 * Order neyar age shob check. Somossa thakle { status, error } ferot dey, na thakle null.
 * `silent: true` mane bot — take "success" dekhiye dei kintu order save kori na.
 */
export async function checkOrder({ phone, ip, name, address, honeypot, settings }) {
  if (honeypot) return { silent: true };

  if (settings.fraud_min_text === "on") {
    if (String(name).trim().length < 3) return { status: 400, error: "আপনার পূর্ণ নাম লিখুন" };
    if (String(address).trim().length < 10) return { status: 400, error: "পূর্ণ ঠিকানা লিখুন (এলাকা, থানা, জেলা)" };
  }

  // Shob check ek shathe chalai — ekta por ekta korle database er round trip gulo jog hoye deri hoy
  const phoneLimit = Number(settings.fraud_phone_limit) || 0;
  const ipLimit = Number(settings.fraud_ip_limit) || 0;
  const minRate = Number(settings.fraud_min_rate) || 0;
  const [blocked, [counts], h] = await Promise.all([
    isBlocked(phone, ip),
    sql`
      SELECT count(*) FILTER (WHERE phone = ${phone})::int AS by_phone,
             count(*) FILTER (WHERE ip = ${ip || "-"})::int AS by_ip
      FROM orders
      WHERE (phone = ${phone} OR ip = ${ip || "-"}) AND created_at > now() - interval '24 hours'`,
    // Courier hishab — beshi deri hole order chere dei, customer ke boshiye rakha jabe na
    minRate > 0 ? checkPhoneSafe(phone, { timeout: 5000, settings }) : null,
  ]);

  if (blocked) {
    return {
      status: 403,
      error: `দুঃখিত, এই নাম্বার থেকে অর্ডার নেওয়া যাচ্ছে না। প্রয়োজনে কল করুন: ${settings.phone}`,
    };
  }

  if (phoneLimit > 0 && counts.by_phone >= phoneLimit) {
    return { status: 429, error: "এই নাম্বার থেকে আপনার অর্ডার ইতিমধ্যে পেয়েছি। আমাদের প্রতিনিধি শীঘ্রই কল করবেন।" };
  }

  if (ipLimit > 0 && ip && counts.by_ip >= ipLimit) {
    return { status: 429, error: `অনেকগুলো অর্ডার হয়ে গেছে। আরও অর্ডার করতে কল করুন: ${settings.phone}` };
  }

  // Ager parcel er receive % kom hole call korte boli. Notun customer (kono parcel nai) ba API kaj na korle atkai na.
  if (h?.total && h.rate !== null && h.rate < minRate) {
    return {
      status: 403,
      call: settings.phone,
      error: "দুঃখিত, এই নাম্বারে আপনি অনেকগুলো অর্ডার ক্যান্সেল করেছেন, তাই অনলাইনে অর্ডার নেওয়া যাচ্ছে না। অর্ডার করতে অনুগ্রহ করে কল করুন",
    };
  }

  return null;
}
