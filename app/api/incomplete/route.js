import { after } from "next/server";
import { sql, ensureTables } from "@/lib/db";
import { notifyIncomplete, notifyLowRating } from "@/lib/telegram";
import { getSettings } from "@/lib/store";
import { clientIp, isBlocked, courierProblem } from "@/lib/fraud";

// Form e phone likhe chole gele ekhane save hoy — admin "অসম্পূর্ণ অর্ডার" e dekhay
export async function POST(req) {
  const body = await req.json().catch(() => null);
  if (!/^01[3-9]\d{8}$/.test(body?.phone || "") || body.website) {
    return Response.json({ ok: false }, { status: 400 });
  }
  const name = String(body.name || "").slice(0, 100);
  const address = String(body.address || "").slice(0, 500);
  const product = String(body.product || "").slice(0, 200);
  const ip = clientIp(req);

  try {
    await ensureTables();
    const settings = await getSettings();
    if (await isBlocked(body.phone, ip)) return Response.json({ ok: true });
    // Number lekhar sathe sathei courier hishab dekhi — kharap hole customer form puron korar agei jane,
    // ar result cache e thake bole order er shomoy abar wait lage na
    const [[row], courier] = await Promise.all([
      sql`
        INSERT INTO incomplete_orders (phone, name, address, product, ip, updated_at)
        VALUES (${body.phone}, ${name}, ${address}, ${product}, ${ip}, now())
        ON CONFLICT (phone) DO UPDATE SET
          name = EXCLUDED.name, address = EXCLUDED.address,
          product = EXCLUDED.product, ip = EXCLUDED.ip, updated_at = now()
        RETURNING (xmax = 0) AS inserted`,
      courierProblem(body.phone, settings, 8000),
    ]);
    // Shudhu prothom bar Telegram e janay, protibar type korle na
    if (row?.inserted) after(() => notifyIncomplete({ phone: body.phone, name, address, product }));
    if (courier) {
      after(() => notifyLowRating({ phone: body.phone, name, history: courier.history }));
      return Response.json({ ok: true, error: courier.error, call: courier.call });
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error("Incomplete save failed", err);
    return Response.json({ ok: false }, { status: 500 });
  }
}
