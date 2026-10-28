import { syncAllCouriers } from "@/lib/courier";
import { syncOrder, statusChangeText } from "@/lib/telegram";
import { ensureTables } from "@/lib/db";
import { afterStatusChange } from "@/lib/orderHooks";

// Vercel Cron protidin call kore: Steadfast ar Pathao theke delivered/return status ene order update
export async function GET(req) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  await ensureTables();
  const res = await syncAllCouriers(300);
  for (const c of res.changed) {
    await syncOrder(c.id, { change: `${statusChangeText(c.status)} (কুরিয়ার)` });
    await afterStatusChange(c.id, c.status); // courier e রিটার্ন hole Facebook e o jay
  }
  return Response.json(res);
}
