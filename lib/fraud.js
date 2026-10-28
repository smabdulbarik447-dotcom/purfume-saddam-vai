import { sql } from "./db";

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

  if (await isBlocked(phone, ip)) {
    return {
      status: 403,
      error: `দুঃখিত, এই নাম্বার থেকে অর্ডার নেওয়া যাচ্ছে না। প্রয়োজনে কল করুন: ${settings.phone}`,
    };
  }

  const phoneLimit = Number(settings.fraud_phone_limit) || 0;
  if (phoneLimit > 0) {
    const [{ n }] = await sql`
      SELECT count(*)::int AS n FROM orders
      WHERE phone = ${phone} AND created_at > now() - interval '24 hours'`;
    if (n >= phoneLimit) {
      return { status: 429, error: "এই নাম্বার থেকে আপনার অর্ডার ইতিমধ্যে পেয়েছি। আমাদের প্রতিনিধি শীঘ্রই কল করবেন।" };
    }
  }

  const ipLimit = Number(settings.fraud_ip_limit) || 0;
  if (ipLimit > 0 && ip) {
    const [{ n }] = await sql`
      SELECT count(*)::int AS n FROM orders
      WHERE ip = ${ip} AND created_at > now() - interval '24 hours'`;
    if (n >= ipLimit) {
      return { status: 429, error: `অনেকগুলো অর্ডার হয়ে গেছে। আরও অর্ডার করতে কল করুন: ${settings.phone}` };
    }
  }

  return null;
}
