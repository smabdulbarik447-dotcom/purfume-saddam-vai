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
  const [blocked, [counts], courier] = await Promise.all([
    isBlocked(phone, ip),
    sql`
      SELECT count(*) FILTER (WHERE phone = ${phone})::int AS by_phone,
             count(*) FILTER (WHERE ip = ${ip || "-"})::int AS by_ip
      FROM orders
      WHERE (phone = ${phone} OR ip = ${ip || "-"}) AND created_at > now() - interval '24 hours'`,
    // Number lekhar shomoy-i cache e chole ashe, tai ekhane shadharonoto sathe sathe pai
    courierProblem(phone, settings, 3000),
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

  return courier;
}

/**
 * Ager parcel er receive % admin er deya shimar cheye kom hole call korte boli.
 * Notun customer (kono parcel nai), key nai ba API deri/kaj na korle null — order atkai na.
 */
export async function courierProblem(phone, settings, timeout) {
  const minRate = Number(settings.fraud_min_rate) || 0;
  if (minRate <= 0) return null;
  const h = await checkPhoneSafe(phone, { timeout, settings });
  if (!h?.total || h.rate === null || h.rate >= minRate) return null;
  return {
    status: 403,
    call: settings.phone,
    history: h,
    error: "দুঃখিত, এই নাম্বারে আপনি অনেকগুলো অর্ডার ক্যান্সেল করেছেন, তাই অনলাইনে অর্ডার নেওয়া যাচ্ছে না। অর্ডার করতে অনুগ্রহ করে কল করুন",
  };
}
